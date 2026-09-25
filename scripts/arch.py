#!/usr/bin/env python3
"""arch — the Mysterium architecture-record CLI (project-local).

The single write path for architecture records (AD = decision, RG = regression
guard) and the single validator for the documentation rungs. This is the
Mysterium-local adaptation of the `architecture-discipline` governance pattern:
nothing here reaches outside this repository.

Specification + rationale: docs/ARCHITECTURE-TRANSMUTATION-PLAN.md
Vocabulary + ownership:     docs/foundations/44-system-ontology-and-vocabulary.md
Structure declaration:      _org.yaml

    python3 scripts/arch.py route <path>                 resolve a path (doc OR code) to its rung/organ
    python3 scripts/arch.py context <path>               start-of-work bundle: contract docs, organ
                                                         documents, invariants, governing records
    python3 scripts/arch.py search <keyword>             keyword search over the live knowledge-base
    python3 scripts/arch.py related <path|ID>            referential graph: outbound edges + BACKLINKS
    python3 scripts/arch.py doc add --organ O --title T  author a document (auto-discovered, no registry)
    python3 scripts/arch.py recon <keyword>              coverage report before creating a record
    python3 scripts/arch.py new --type ad|rg --title T --desc D --organ O --body F --recon R
    python3 scripts/arch.py update <ID> --field Status=Superseded --reason R --recon I
   python3 scripts/arch.py update <ID> --body FILE --reason R --recon I
    python3 scripts/arch.py log --action A --target T --reason R
    python3 scripts/arch.py emit                         regenerate INDEX.md + organ routers
    python3 scripts/arch.py validate [--gate DG5]        run the doc-governance gates (DG1-DG12)

Exit codes: 0 = clean, 1 = violations, 2 = misuse.
"""
# @script-status: wired — the doc-governance validator, run by .github/workflows/ci.yml on every
#                          push and by hand per AGENTS.md §7.5. Read-only over the tree except for
#                          `emit` (regenerates INDEX.md + organ routers) and `fixtures`.

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    print("arch: PyYAML is required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
ORG_FILE = ROOT / "_org.yaml"
VOCAB_FILE = ROOT / "docs" / "foundations" / "44-system-ontology-and-vocabulary.md"
VOCAB_REL = "docs/foundations/44-system-ontology-and-vocabulary.md"

RECORD_RE = re.compile(r"^(MY)-(AD|RG)-(\d{4})-([a-z0-9-]+)\.md$")

# The gate name -> `_org.yaml` config key. `enabled: false` is only honoured when the lookup
# key matches the declared key (red-team RT-5a).
GATE_CONFIG_KEY = {
    "DG1": "dg1_frontmatter",
    "DG2": "dg2_status_enum",
    "DG3": "dg3_numbering",
    "DG4": "dg4_authority",
    "DG5": "dg5_vocabulary",
    "DG6": "dg6_historical_quarantine",
    "DG7": "dg7_ownership",
    "DG8": "dg8_references",
    "DG9": "dg9_ledger",
    "DG10": "dg10_canon_code",
    "DG11": "dg11_derived_surfaces",
    "DG12": "dg12_canon_links",
    "DG13": "dg13_organ_integrity",
    "DG14": "dg14_relationality",
    "DG15": "dg15_source_resolves",
    "DG16": "dg16_cited_paths",
    "DG17": "dg17_record_refs",
    "DG18": "dg18_router_coverage",
    "DG19": "dg19_law_consumer",
    "DG20": "dg20_script_provenance",
    "DG21": "dg21_corpus_reconcile",
    "DG22": "dg22_skill_provenance",
    "DG23": "dg23_foundations_ingest",
}

# KB-ORPHAN-TRIAGE (KB audit UT-7): 11 of 15 scripts were unreferenced by package.json, CI,
# install.sh or the routers, and four of them rewrite the corpus in place for superseded
# templates. Nothing in the tree let an agent decide which were safe to run — so the fix is a
# declaration in the file itself plus a gate that reads it, not a hand-maintained list.
SCRIPT_CLASSES = {
    "wired": "referenced by package.json / CI / install.sh; repeatable and safe to run any time",
    "probe": "read-only diagnostic; exits non-zero on failure; never mutates the tree",
    "one-shot": "mutates the tree and is safe only from its pre-state; never schedule it",
    "historical": "superseded; must NOT be run (rewrites the tree for a retired template)",
}
SCRIPT_STATUS_RE = re.compile(
    r"^[ \t]*(?:#|//|\*)?[ \t]*@script-status:[ \t]*([\w-]+)[ \t]*[\u2014\u2013:]?[ \t]*(.*)$",
    re.M,
)


# ─────────────────────────────────────────────────────────────────────────────
# Loading
# ─────────────────────────────────────────────────────────────────────────────
def org() -> dict:
    if not ORG_FILE.exists():
        fail("_org.yaml is missing — the structure declaration is the source of truth")
    return yaml.safe_load(ORG_FILE.read_text(encoding="utf-8"))


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def fail(msg: str) -> None:
    print(f"arch: {msg}", file=sys.stderr)
    sys.exit(2)


# ─────────────────────────────────────────────────────────────────────────────
# Shared per-pass index (KB-VALIDATE-JSON)
#
# `records()` re-read and re-parsed all 27 records in seven separate gates, and `live_files()`
# re-globbed the tree per gate; DG12 scanned all live files, DG5 6 terms x N patterns. The cost is
# small today (2.7 s) but the shape is O(docs) x N_gates with no index, which is the one part of the
# KB that does not scale the way the specification claims.
#
# The index is PER-PASS and in-process. A PERSISTED cache was designed and deliberately rejected: a
# stale cache is a gate that passes on a broken tree, which is precisely the failure class
# `fm_parses` / DG1 exist to surface (a silently unparsed frontmatter erased a record's ID from every
# gate). Storage scales because markdown is path-addressed; validation scales by reading each file
# ONCE per pass, not by trusting bytes from a previous run. `bust()` is the only invalidation and is
# called at every command start and between gate-fixture injections.
# ─────────────────────────────────────────────────────────────────────────────
_TEXT: dict[str, str] = {}
_MEMO: dict[str, object] = {}


def bust() -> None:
    """Drop the per-pass index. Call on any write, and between fixtures iterations."""
    _TEXT.clear()
    _MEMO.clear()


def read_text_cached(path: Path) -> str:
    """Read a file once per pass. Byte-identical to `path.read_text(encoding='utf-8')`."""
    key = str(path)
    if key not in _TEXT:
        _TEXT[key] = path.read_text(encoding="utf-8")
    return _TEXT[key]


def read_text_lenient(path: Path) -> str:
    """As above, for the `errors='ignore'` reads that scan arbitrary live documents."""
    key = f"{path}\x00lenient"
    if key not in _TEXT:
        _TEXT[key] = path.read_text(encoding="utf-8", errors="ignore")
    return _TEXT[key]


def fenced_block(path: Path, marker: str) -> dict | None:
    """Extract the ```yaml block associated with `marker` in `path`.

    The marker is usually a comment INSIDE the block (e.g. `# owners-table (DG7 reads this block)`),
    so the fence opener is searched for BEFORE the marker first, then after it.
    """
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    idx = text.find(marker)
    if idx < 0:
        return None
    start = text.rfind("```yaml", max(0, idx - 500), idx)
    if start < 0:
        start = text.find("```yaml", idx)
    if start < 0:
        return None
    end = text.find("```", start + 7)
    if end < 0:
        return None
    try:
        return yaml.safe_load(text[start + 7 : end])
    except yaml.YAMLError as exc:
        print(f"arch: {rel(path)}: unparseable block at `{marker}`: {exc}", file=sys.stderr)
        return None


def live_roots(cfg: dict) -> list[Path]:
    """Every directory that is LIVE canon (historical/audits are excluded by design)."""
    out: list[Path] = []
    for name, rung in cfg["rungs"].items():
        if not rung.get("live"):
            continue
        if rung.get("pending_phase"):
            continue
        for d in rung.get("dirs", []):
            if d.get("pending_phase"):
                continue
            p = ROOT / d["path"]
            if p.is_dir():
                out.append(p)
    return out


def live_files(cfg: dict) -> list[Path]:
    """Every LIVE canon file: whole directories PLUS individually-declared `files:`.

    Files-only rungs (e.g. `canon-root`, `plans`) were previously only ever contributed by the
    hardcoded `plans` special case — so a rung declared with `files:` was silently unscanned
    (red-team RT-3). A rung that no gate reads is not a rung.

    Memoized per pass (KB-VALIDATE-JSON): every gate asked for the same glob.
    """
    if "live_files" in _MEMO:
        return _MEMO["live_files"]  # type: ignore[return-value]
    out: list[Path] = []
    seen: set[Path] = set()
    for d in live_roots(cfg):
        for p in sorted(d.rglob("*.md")):
            out.append(p)
            seen.add(p.resolve())
    for rung in cfg["rungs"].values():
        if not rung.get("live") or rung.get("pending_phase"):
            continue
        for f in rung.get("files", []):
            p = ROOT / f
            if p.is_file() and p.resolve() not in seen:
                out.append(p)
                seen.add(p.resolve())
    _MEMO["live_files"] = out
    return out


def record_dirs(cfg: dict) -> list[Path]:
    rec = cfg["rungs"]["records"]
    dirs = [ROOT / rec["decisions"]["system"], ROOT / rec["regressions"]["system"]]
    for organ in cfg["organs"]:
        dirs.append(ROOT / rec["decisions"]["organ_pattern"].format(organ=organ))
        dirs.append(ROOT / rec["regressions"]["organ_pattern"].format(organ=organ))
    return dirs


def records(cfg: dict) -> list[dict]:
    """Every AD/RG record, read once per pass (KB-VALIDATE-JSON: seven gates re-parsed these)."""
    if "records" in _MEMO:
        return _MEMO["records"]  # type: ignore[return-value]
    out = []
    for d in record_dirs(cfg):
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.md")):
            if p.name.startswith("."):
                continue
            out.append({"path": p, "dir": d, "text": read_text_cached(p), "rel": rel(p)})
    _MEMO["records"] = out
    return out


def is_record_path(rel_path: str) -> bool:
    """Is this an AD/RG record, in the system core OR any organ core?

    A record's job is to DOCUMENT an incident, which means quoting the superseded vocabulary it is
    about and naming the retired rung it moved out of. Both exemptions therefore have to cover every
    record directory. They previously matched `docs/system/core/` only — so the exemption silently
    stopped applying the moment records began living under `docs/system/sub-systems/<organ>/core/`,
    and a record that correctly quoted the term it was recording failed the gate that exists to
    catch the term's unrecorded use (MY-AD-0029, found 2026-09-20).
    """
    parts = rel_path.split("/")
    return len(parts) >= 4 and parts[0] == "docs" and parts[1] == "system" and "core" in parts


def norm_doc(p: str) -> str:
    """Normalize a doc path for exemption comparison: no `docs/` prefix, no `.md` suffix."""
    p = p.replace("\\", "/")
    if p.startswith("docs/"):
        p = p[len("docs/") :]
    if p.endswith(".md"):
        p = p[: -len(".md")]
    return p


def exempt(rel_path: str, exempt_list: list[str] | None) -> bool:
    if not exempt_list:
        return False
    target = norm_doc(rel_path)
    for entry in exempt_list:
        e = norm_doc(str(entry))
        if e.endswith("/**"):
            if target.startswith(e[:-3]):
                return True
        elif target == e or target.startswith(e + "/"):
            return True
    return False


def frontmatter(text: str) -> dict:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    try:
        return yaml.safe_load(text[3:end]) or {}
    except yaml.YAMLError:
        return {}


def fm_parses(text: str) -> bool:
    """Does this file's frontmatter block actually parse? `frontmatter()` swallows YAMLError and
    returns `{}`, so ONE unquoted scalar (a value starting with a backtick, say) erases the record's
    ID from every gate that reads it — the gates then report a phantom "record does not exist" and
    the real cause is invisible. DG1 asks this directly."""
    if not text.startswith("---"):
        return True
    end = text.find("\n---", 3)
    if end < 0:
        return True
    try:
        yaml.safe_load(text[3:end])
        return True
    except yaml.YAMLError:
        return False


def strip_generated_date(text: str) -> str:
    """Drop the `> Generated:` line so DG11 compares content, not the day it was emitted."""
    return "\n".join(l for l in text.splitlines() if not l.startswith("> Generated:"))


def link_resolves(raw: str, relative_to: Path | None = None) -> bool:
    """Resolve a doc cross-reference, whether it was written as a wiki-link or a markdown link."""
    raw = raw.strip()
    if raw.startswith(("http://", "https://", "mailto:", "#")):
        return True
    cands: list[Path] = []
    if relative_to is not None:
        cands.append((relative_to / raw).resolve())
    cands += [ROOT / raw, ROOT / f"{raw}.md", ROOT / "docs" / raw, ROOT / f"docs/{raw}.md"]
    return any(c.exists() for c in cands)


# ─────────────────────────────────────────────────────────────────────────────
# Generated surfaces (rendered here so DG11 can diff them against disk)
# ─────────────────────────────────────────────────────────────────────────────
def render_index(cfg: dict) -> str:
    lines = [
        "# Mysterium — Documentation Index",
        "",
        "> **GENERATED FILE — do not edit.** Produced by `python3 scripts/arch.py emit` from",
        "> `_org.yaml` plus the AD/RG records. Edit the source, then re-emit.",
        f"> Generated: {datetime.now(timezone.utc).date().isoformat()}",
        "",
        "## Rungs",
        "",
        "| Rung | Path | Live | Authority |",
        "|---|---|---|---|",
    ]
    rec = cfg["rungs"]["records"]
    for name, rung in cfg["rungs"].items():
        if name == "records":
            paths = [rec["decisions"]["system"], rec["regressions"]["system"], rec["worklog"]["dir"]]
        else:
            paths = [d["path"] for d in rung.get("dirs", [])] or list(rung.get("files", []))
        lines.append(
            f"| `{name}` | {'<br>'.join('`' + p + '`' for p in paths)} | "
            f"{'yes' if rung.get('live') else 'no'} | `{rung.get('authority', '—')}` |"
        )
    lines += ["", "## Organs", "", "| Organ | Architecture doc | Code it describes |", "|---|---|---|"]
    for organ, o in cfg["organs"].items():
        doc = f"`docs/system/sub-systems/{organ}/AGENTS.md`"
        lines.append(f"| `{organ}` | {doc} | {', '.join('`' + c + '`' for c in o.get('code', []))} |")
    recs = records(cfg)
    lines += ["", f"## Records ({len(recs)})", "", "| ID | Kind | Organ | Status | Title |", "|---|---|---|---|---|"]
    rows = []
    for r in recs:
        fm = frontmatter(r["text"])
        rid = str(fm.get("ID"))
        rows.append(
            f"| `{rid}` | {rid.split('-')[1] if '-' in rid else '—'} | {fm.get('Organ')} "
            f"| {fm.get('Status')} | {fm.get('Title')} |"
        )
    lines += rows or ["| — | — | — | — | *(none yet)* |"]
    gen = cfg.get("generated") or []
    if gen:
        lines += ["", "## Generated surfaces (never hand-edited)", ""]
        lines += [f"- `{g}`" for g in gen]
    return "\n".join(lines) + "\n"


# ─────────────────────────────────────────────────────────────────────────────
# Gates (DG1–DG12)
# ─────────────────────────────────────────────────────────────────────────────
class Gate:
    # Rungs whose documents must be interconnected. `content` (the 512-file corpus) is exempt on
    # purpose: its relationality is structural (line x stage directories + the corpus index), and 510
    # of its 515 files carry no citations at all.
    RELATIONAL_RUNGS = ("canon", "canon-root", "canon-domain", "system", "plans")

    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.problems: list[str] = []
        self.checked: dict[str, int] = {}
        self.by_gate: dict[str, list[str]] = {}
        self.skipped: list[str] = []
        self._edges: dict[str, list[Path]] | None = None

    def edge_index(self) -> dict[str, list[Path]]:
        """Outbound citation edges for every live document, computed once per validate pass."""
        if self._edges is None:
            idx: dict[str, list[Path]] = {}
            for p in live_files(self.cfg):
                idx[rel(p)] = outbound_refs(
                    read_text_lenient(p), p.parent, self_path=p
                )
            self._edges = idx
        return self._edges

    def inbound_index(self) -> dict[str, int]:
        inbound: dict[str, int] = {}
        for refs in self.edge_index().values():
            for t in refs:
                inbound[rel(t)] = inbound.get(rel(t), 0) + 1
        return inbound

    def err(self, gate: str, msg: str) -> None:
        self.problems.append(f"{gate}: {msg}")
        self.by_gate.setdefault(gate, []).append(msg)

    def run(self, only: str | None, as_json: bool = False, out: str | None = None) -> int:
        gates = [
            ("DG1", self.dg1_frontmatter),
            ("DG2", self.dg2_status),
            ("DG3", self.dg3_numbering),
            ("DG4", self.dg4_authority),
            ("DG5", self.dg5_vocabulary),
            ("DG6", self.dg6_historical),
            ("DG7", self.dg7_ownership),
            ("DG8", self.dg8_references),
            ("DG9", self.dg9_ledger),
            ("DG10", self.dg10_canon_code),
            ("DG11", self.dg11_derived_surfaces),
            ("DG12", self.dg12_canon_links),
            ("DG13", self.dg13_organ_integrity),
            ("DG14", self.dg14_relationality),
            ("DG15", self.dg15_source_resolves),
            ("DG16", self.dg16_cited_paths),
            ("DG17", self.dg17_record_refs),
            ("DG18", self.dg18_router_coverage),
            ("DG19", self.dg19_law_consumer),
            ("DG20", self.dg20_script_provenance),
            ("DG21", self.dg21_corpus_reconcile),
            ("DG22", self.dg22_skill_provenance),
            ("DG23", self.dg23_foundations_ingest),
        ]
        for name, fn in gates:
            if only and name != only:
                continue
            # Config keys are `dgN_<slug>`; resolve them through the gate's own key so
            # `enabled: false` actually disables the gate (red-team RT-5a: it silently did not).
            gcfg = self.cfg.get("gates", {}).get(GATE_CONFIG_KEY.get(name, ""), {})
            if gcfg.get("enabled", True) is False:
                self.skipped.append(f"{name} (disabled in _org.yaml)")
                continue
            fn(name)
        # A gate that ran and a gate that was configured but NOT reached are different facts. A gate
        # absent from `checked` because `only` filtered it, or because it is disabled, must never be
        # reported as passing — that is how a gate goes quietly missing (the DG18 class).
        ran = list(self.checked)
        skipped = list(self.skipped)
        if only:
            skipped += [f"{n} (--gate {only})" for n, _ in gates if n != only and n not in ran]
        else:
            skipped += [f"{n} (no result recorded)" for n, _ in gates if n not in ran]
        status = "fail" if self.problems else "pass"
        if as_json or out:
            payload = {
                "tool": "arch validate",
                "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": status,
                "summary": {
                    "gates_run": len(ran),
                    "checks": sum(self.checked.values()),
                    "violations": len(self.problems),
                },
                "gates": {
                    n: {"checked": self.checked.get(n, 0), "violations": self.by_gate.get(n, [])}
                    for n, _ in gates
                    if n in ran
                },
                "skipped": skipped,
                "violations": self.problems,
            }
            blob = json.dumps(payload, indent=2, sort_keys=False)
            if out:
                dest = Path(out)
                if not dest.is_absolute():
                    dest = ROOT / out
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(blob + "\n", encoding="utf-8")
                print(f"arch validate — wrote {rel(dest)} ({status})")
            if as_json:
                # stdout is the artifact and nothing else: a trailing human line made the output
                # unparseable as JSON, which defeats the point of the flag.
                print(blob)
                if status == "pass":
                    print(f"arch: 0 violations — {len(ran)} gates passed", file=sys.stderr)
            elif status == "pass":
                print(f"arch: 0 violations — {len(ran)} gates passed")
            return 1 if self.problems else 0
        width = max((len(k) for k in self.checked), default=0)
        for name, n in self.checked.items():
            print(f"  {name:<{width}}  {n}")
        if self.problems:
            print(f"\n{len(self.problems)} violation(s):\n")
            for p in self.problems:
                print(f"  ✗ {p}")
            return 1
        print(f"\narch: 0 violations — {len(ran)} gates passed")
        return 0

    # DG1 — frontmatter + filename schema
    def dg1_frontmatter(self, g: str) -> None:
        n = 0
        for r in records(self.cfg):
            n += 1
            m = RECORD_RE.match(r["path"].name)
            if not m:
                self.err(g, f"{r['rel']}: filename must match MY-(AD|RG)-NNNN-kebab.md")
            if not fm_parses(r["text"]):
                self.err(
                    g,
                    f"{r['rel']}: frontmatter is not valid YAML — every gate reads it as empty "
                    f"(quote the offending scalar)",
                )
            fm = frontmatter(r["text"])
            for key in ("ID", "Title", "Status", "Date", "Description", "Organ"):
                if not fm.get(key):
                    self.err(g, f"{r['rel']}: frontmatter missing/empty `{key}:`")
            if r["path"].name.startswith("MY-RG") and not fm.get("Severity"):
                self.err(g, f"{r['rel']}: RG requires `Severity:`")
            if fm.get("ID") and not str(fm["ID"]).startswith("MY-"):
                self.err(g, f"{r['rel']}: ID must be MY-prefixed")
        self.checked[g] = n

    # DG2 — status enum
    def dg2_status(self, g: str) -> None:
        enum = self.cfg["rungs"]["records"]["status_enum"]
        n = 0
        for r in records(self.cfg):
            n += 1
            st = frontmatter(r["text"]).get("Status")
            if st and st not in enum:
                self.err(g, f"{r['rel']}: Status `{st}` not in enum {enum}")
        self.checked[g] = n

    # DG3 — numbering integrity (unique, filename↔ID, no reuse)
    def dg3_numbering(self, g: str) -> None:
        n = 0
        seen: dict[str, str] = {}
        ledger_path = ROOT / self.cfg["rungs"]["records"]["ledger"]["path"]
        issued_at: dict[str, str] = {}
        if ledger_path.exists():
            for line in read_text_cached(ledger_path).splitlines():
                if not line.strip():
                    continue
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    self.err(g, f"ledger line is not JSON: {line[:60]}")
                    continue
                if ev.get("action") in ("create", "seed") and ev.get("target"):
                    issued_at.setdefault(str(ev["target"]), str(ev.get("path") or ""))
        for r in records(self.cfg):
            n += 1
            m = RECORD_RE.match(r["path"].name)
            fm = frontmatter(r["text"])
            if not m:
                continue
            num = m.group(3)
            if fm.get("ID") and fm["ID"] != f"{m.group(1)}-{m.group(2)}-{num}":
                self.err(g, f"{r['rel']}: ID `{fm['ID']}` does not match filename number {num}")
            if fm.get("ID") in seen:
                self.err(g, f"{r['rel']}: ID {fm['ID']} already used by {seen[fm['ID']]}")
            elif fm.get("ID"):
                seen[fm["ID"]] = r["rel"]
            # A number is never re-issued: if the ledger already created this ID at another
            # path, the number was reused (red-team RT-5b — this check collected the data and
            # then never read it).
            issued = issued_at.get(str(fm.get("ID")))
            if issued and issued != r["rel"]:
                self.err(g, f"{r['rel']}: ID {fm['ID']} was issued to {issued} — numbers are never re-issued")
        self.checked[g] = n

    # DG4 — authority uniqueness (no doc may claim authority outside authority_map)
    def dg4_authority(self, g: str) -> None:
        allowed = {Path(v).as_posix() for v in self.cfg["authority_map"].values()}
        patterns = [
            r"\bbinding architectural contract\b",
            r"\bbinding contract\b",
            r"is the single source of truth for\b",
            r"\bthis is the authoritative (?:spec|specification)\b",
        ]
        n = 0
        for p in live_files(self.cfg):
            r = rel(p)
            if r in allowed or r == "AGENTS.md":
                continue
            # Records and the transmutation plan *document* authority claims: exempt. The exemption
            # covers organ cores too (`docs/system/sub-systems/<organ>/core/`), not just the system
            # core — a record in either home is the ledger of decisions, and a record whose subject is
            # a binding obligation must be able to name it. Before this, DG4's phrase tripwire fired on
            # organ records while system-core records passed, which is an inconsistency no author could
            # infer from the rule.
            if "/core/" in r or r == "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md":
                continue
            n += 1
            text = read_text_cached(p)
            for pat in patterns:
                for m in re.finditer(pat, text, re.IGNORECASE):
                    line = text[: m.start()].count("\n") + 1
                    self.err(
                        g,
                        f"{r}:{line}: claims authority (`{m.group(0)}`) — only "
                        f"{sorted(allowed)} may do so",
                    )
        self.checked[g] = n

    # DG5 — superseded vocabulary (pattern per blacklist entry)
    def dg5_vocabulary(self, g: str) -> None:
        block = fenced_block(VOCAB_FILE, "# vocabulary-blacklist")
        if not block:
            self.err(g, f"could not read the blacklist block from {VOCAB_REL}")
            self.checked[g] = 0
            return
        n = 0
        for p in live_files(self.cfg):
            r = rel(p)
            n += 1
            text = read_text_cached(p)
            # The vocabulary doc DEFINES the blacklist; records QUOTE superseded vocabulary when
            # documenting an incident. Neither is a drift.
            if r == VOCAB_REL or is_record_path(r):
                continue
            for entry in block.get("blacklist", []):
                if exempt(r, entry.get("exempt_in")):
                    continue
                if r.startswith("docs/historical/") or r.startswith("docs/audits/"):
                    continue
                for pat in entry.get("patterns") or []:
                    for m in re.finditer(pat, text, re.IGNORECASE):
                        line = text[: m.start()].count("\n") + 1
                        self.err(
                            g,
                            f"{r}:{line}: superseded use of `{entry['term']}` "
                            f"(`{m.group(0).strip()[:48]}`) — {entry['correct'][:90]}",
                        )
        self.checked[g] = n

    # DG6 — historical quarantine
    QUARANTINE_MARKERS = (
        "archived", "archive", "exempt", "dated", "superseded", "frozen", "historical record",
        "never an authority", "never cited", "not an authority", "not edited", "quarantine",
        "evidence", "moved to", "rather than by rung", "is a separate non-live rung", "must not cite",
    )

    def dg6_historical(self, g: str) -> None:
        n = 0
        for p in live_files(self.cfg):
            r = rel(p)
            # The quarantine's own definition and its records legitimately name the rung.
            if r == "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md" or is_record_path(r):
                continue
            n += 1
            text = read_text_cached(p)
            for i, line in enumerate(text.splitlines(), 1):
                if "docs/historical/" not in line:
                    continue
                low = line.lower()
                if any(marker in low for marker in self.QUARANTINE_MARKERS):
                    continue
                self.err(
                    g,
                    f"{r}:{i}: cites docs/historical/ without marking it as a dated record — "
                    f"add a quarantine marker or point at the live owner",
                )
        self.checked[g] = n

    # DG7 — ownership: owners table resolves and covers the canon
    def dg7_ownership(self, g: str) -> None:
        block = fenced_block(VOCAB_FILE, "# owners-table")
        if not block:
            self.err(g, f"could not read the owners block from {VOCAB_REL}")
            self.checked[g] = 0
            return
        owners = block.get("owners", {})
        for key, path in owners.items():
            # Owners are written relative to docs/ and may omit the .md suffix; be liberal in
            # resolution, strict in reporting.
            cands = [
                ROOT / path,
                ROOT / f"{path}.md",
                ROOT / "docs" / path,
                ROOT / f"docs/{path}.md",
                ROOT / f"docs/{path}/AGENTS.md",
                ROOT / (path.replace("foundations/", "docs/foundations/", 1) + ".md"),
            ]
            if not any(c.exists() for c in cands):
                self.err(g, f"owner `{key}` points at a missing path: {path}")
        # coverage: every numbered foundation belongs to a concept an owner names
        foundations = sorted((ROOT / "docs" / "foundations").glob("[0-9][0-9]-*.md"))
        claimed = set()
        for path in owners.values():
            m = re.match(r"(?:docs/)?foundations/(\d\d)-", str(path))
            if m:
                claimed.add(m.group(1))
        for f in foundations:
            if f.name[:2] not in claimed:
                self.err(g, f"foundations/{f.name} is not claimed by any owner in 44 §8")
        self.checked[g] = len(owners)

    # DG8 — reference resolution (Related IDs + repo-relative links)
    def dg8_references(self, g: str) -> None:
        ids = {frontmatter(r["text"]).get("ID") for r in records(self.cfg)}
        n = 0
        for r in records(self.cfg):
            n += 1
            fm = frontmatter(r["text"])
            for rid in fm.get("Related") or []:
                if str(rid) not in ids:
                    self.err(g, f"{r['rel']}: Related `{rid}` does not resolve")
            for target in re.findall(r"\]\((\.\.?/[^)]+|[A-Za-z0-9_./-]+\.md)\)", r["text"]):
                cand = (r["path"].parent / target).resolve()
                if not cand.exists():
                    self.err(g, f"{r['rel']}: link `{target}` does not resolve")
        self.checked[g] = n

    # DG9 — ledger integrity (one receipt per record)
    def dg9_ledger(self, g: str) -> None:
        ledger_path = ROOT / self.cfg["rungs"]["records"]["ledger"]["path"]
        created: set[str] = set()
        if ledger_path.exists():
            for line in read_text_cached(ledger_path).splitlines():
                if not line.strip():
                    continue
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    self.err(g, "ledger contains a non-JSON line")
                    continue
                if ev.get("action") in ("create", "seed") and ev.get("target"):
                    created.add(ev["target"])
        n = 0
        for r in records(self.cfg):
            n += 1
            rid = frontmatter(r["text"]).get("ID")
            if rid and rid not in created:
                self.err(g, f"{r['rel']}: no ledger receipt — records are written via `arch new`")
        self.checked[g] = n

    # DG11 — derived surfaces are current. `emit` is idempotent, so a generated file that does
    # not equal its regeneration is stale (red-team RT-4: docs/INDEX.md was committed saying
    # `Records (0)` while 23 records existed, and nothing noticed).
    def dg11_derived_surfaces(self, g: str) -> None:
        cfg = self.cfg
        n = 0
        idx = ROOT / "docs" / "INDEX.md"
        n += 1
        if not idx.exists():
            self.err(g, "docs/INDEX.md is missing — run `python3 scripts/arch.py emit`")
        elif strip_generated_date(read_text_cached(idx)) != strip_generated_date(
            render_index(cfg)
        ):
            self.err(g, "docs/INDEX.md is stale — run `python3 scripts/arch.py emit` (never hand-edit it)")
        for organ, o in cfg["organs"].items():
            n += 1
            p = ROOT / "docs" / "system" / "sub-systems" / organ / "AGENTS.md"
            if not p.exists():
                self.err(g, f"docs/system/sub-systems/{organ}/AGENTS.md is missing — run emit")
                continue
            existing = read_text_cached(p)
            if organ_router(cfg, organ, o, existing) != existing:
                self.err(g, f"docs/system/sub-systems/{organ}/AGENTS.md auto-zone is stale — run emit")
        self.checked[g] = n

    # DG12 — canon link integrity. Canon cross-references with wiki-links (`[[path|label]]`),
    # which DG8 (records' markdown links) never sees (red-team RT-3: 168 links, 0 guards).
    def dg12_canon_links(self, g: str) -> None:
        n = 0
        for p in live_files(self.cfg):
            r = rel(p)
            # RECORDS ARE NOT SKIPPED HERE. DG8 validates records' MARKDOWN links, but it does not
            # read wiki-links — so skipping records left every record's wiki-links unchecked, and
            # the skip's original wording ("DG8 owns their links") was true only of one link form.
            # The exemption was also prefix-scoped (`docs/system/core/`), so organ-core records
            # were checked while system-core records were not: the same artefact class validated
            # two different ways depending on its directory (found 2026-09-20 via MY-AD-0031).
            n += 1
            text = read_text_cached(p)
            for raw in re.findall(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]", text):
                if not link_resolves(raw):
                    self.err(g, f"{r}: wiki-link [[{raw}]] does not resolve")
            for raw in re.findall(r"\]\(([^)\s#]+?\.md)(?:#[^)]*)?\)", text):
                if not link_resolves(raw, relative_to=p.parent):
                    self.err(g, f"{r}: link `{raw}` does not resolve")
        self.checked[g] = n

    # DG13 — organ integrity. `_org.yaml` claimed "`code` paths MUST resolve on disk (arch.py
    # validate enforces)" and no gate did; the only detector was DG11's mislabelled staleness
    # message, and following its advice (`emit`) baked the bogus path into the canonical router
    # (audit UT-5). The declaration now enforces itself.
    def dg13_organ_integrity(self, g: str) -> None:
        n = 0
        for organ, o in self.cfg["organs"].items():
            n += 1
            code = list(o.get("code") or [])
            if not code:
                self.err(g, f"organ `{organ}`: declares no `code` paths — nothing is owned")
            for c in code:
                if not (ROOT / c).exists():
                    self.err(g, f"organ `{organ}`: code path `{c}` does not exist on disk")
            for ref in o.get("contract_docs") or []:
                n += 1
                if contract_path(str(ref)) is None:
                    self.err(g, f"organ `{organ}`: contract doc `{ref}` does not resolve")
            if not (ROOT / "docs" / "system" / "sub-systems" / organ / "AGENTS.md").exists():
                self.err(g, f"organ `{organ}`: no router at docs/system/sub-systems/{organ}/AGENTS.md")
        # A record filed in an organ core must declare that organ. The frontmatter `Organ:` was
        # free text, so a record could be filed under `kernel/` while declaring `platform` (or
        # nothing), and every gate passed — the organ attribution `route` and the routers report would
        # then be wrong, which is worse than absent (red-team RT-ORGAN-DIR).
        m = re.compile(r"^docs/system/sub-systems/([^/]+)/core/(?:decisions|regressions)/")
        for r in records(self.cfg):
            n += 1
            hit = m.match(r["rel"])
            if not hit:
                continue
            organ = hit.group(1)
            declared = str(frontmatter(r["text"]).get("Organ") or "").strip()
            if declared != organ:
                self.err(
                    g,
                    f"{r['rel']}: declares `Organ: {declared or '(empty)'}` but is filed in the "
                    f"`{organ}` organ core",
                )
        self.checked[g] = n

    # DG14 — relationality ENFORCED. Creating, modifying or managing a document is only sound if the
    # document is connected: an authored doc with no inbound and no outbound reference is an orphan,
    # and eight of them sat in the tree at zero inbound links while every gate reported green (audit
    # UT-1). Reporting relationships is not enforcing them; this gate is the enforcement.
    def dg14_relationality(self, g: str) -> None:
        idx = self.edge_index()
        inbound = self.inbound_index()
        n = 0
        for r, refs in idx.items():
            rung, _organ = where_is(self.cfg, r)
            if rung not in self.RELATIONAL_RUNGS:
                continue
            if r.startswith("docs/system/sub-systems/") and r.endswith("/AGENTS.md"):
                continue  # a generated router's edges are produced by `emit` (DG11 owns it)
            n += 1
            if not refs and inbound.get(r, 0) == 0:
                self.err(
                    g,
                    f"{r}: orphan — no inbound and no outbound reference. Connect it ("
                    f"`python3 scripts/arch.py related {r}` suggests candidates)",
                )
        self.checked[g] = n

    # DG15 — a record's `Source:` is an edge, so it must name a document that resolves. The record
    # layer was the only one whose relationality was enforced at all (DG8 checks `Related:` IDs);
    # `Source:` was unenforced prose, so a record could cite canon that does not exist.
    def dg15_source_resolves(self, g: str) -> None:
        n = 0
        for r in records(self.cfg):
            n += 1
            src = str(frontmatter(r["text"]).get("Source") or "").strip()
            if not src:
                self.err(g, f"{r['rel']}: `Source:` is empty — name the canon section it transcribes")
                continue
            tokens = re.findall(r"[A-Za-z0-9_][A-Za-z0-9_./-]*", src)
            if not any(resolve_ref(t) for t in tokens):
                self.err(
                    g,
                    f"{r['rel']}: `Source:` names no resolvable document (`{src[:70]}`) — "
                    f"use a path such as docs/foundations/44-....md §9",
                )
        self.checked[g] = n

    # DG16 — a CITED PATH RESOLVES, in prose as well as in links. DG12 resolves wiki-links and
    # markdown links but discards nothing that is not a link, and the P3 structural move left a
    # family of bare backticked citations behind (`combat/02`, `validation/02`, `progression/06`,
    # `ux/01`, `stages/altitude.md`) pointing at directories that no longer exist. Every gate
    # reported green over all of them (audit RT-DEADREFS, MY-RG-0016). This gate closes that class
    # for path-like tokens: a backticked token that names a KNOWN repo top-level directory and does
    # not carry a wildcard must resolve, relative to the docs root or the repo root.
    #
    # Scope is deliberately narrow — the blacklist below is finite and explicit, so prose that
    # merely contains a slash (`and/or`, `agency/communion`, `line×stage`) is never flagged.
    CITED_ROOTS = (
        "foundations",
        "lines",
        "stages",
        "narrative",
        "progression",
        "concept-drafts",
        "system",
        "historical",
        "audits",
        "docs",
        "src",
        "tests",
        "scripts",
        "skills",
    )

    def dg16_cited_paths(self, g: str) -> None:
        n = 0
        pat = re.compile(r"`((?:\.\.?/)?[A-Za-z0-9_-]+/[A-Za-z0-9_./-]+)`")
        for p in live_files(self.cfg):
            here = rel(p)
            # Records, audits and dated plans QUOTE paths as evidence; a quoted dead path is the
            # record working, and a plan describing where files lived THEN is not a citation.
            if (
                "/core/" in here
                or here.startswith("docs/audits/")
                or here.startswith("docs/historical/")
                or here.endswith("ARCHITECTURE-TRANSMUTATION-PLAN.md")
            ):
                continue
            n += 1
            text = read_text_lenient(p)
            for m in pat.finditer(text):
                tok = m.group(1)
                head = tok.lstrip("./")
                if head.split("/", 1)[0] not in self.CITED_ROOTS:
                    continue
                if "*" in tok or "<" in tok or "..." in tok:
                    continue
                if self.cited_resolves(tok):
                    continue
                if self.declared_future(text, m.start(), m.end()):
                    continue  # an artifact that is explicitly declared not-yet-existing is not a dead link
                self.err(
                    g,
                    f"{here}: cited path `{tok}` does not resolve — fix the citation or the file",
                )
        self.checked[g] = n

    # Markers accepted as a declaration that the cited artifact is FUTURE, not current. Without this
    # the gate cannot tell a citation that outlived its target (a defect) from a plan naming a module
    # it intends to create (legitimate), and a gate that flags legitimate prose gets switched off.
    FUTURE_MARKERS = re.compile(
        r"(?i)\b(planned|deferred|proposed|recommend\w*|not yet|to be created|does not exist"
        r"|non-existent|new module|equivalent|removed|retired|deleted)\b"
    )

    @classmethod
    def declared_future(cls, text: str, start: int, end: int) -> bool:
        """True when a `planned`/`removed`/`non-existent` marker sits beside the citation (either side).

        Two legitimate non-current classes are recognised: an artifact a plan intends to CREATE, and an
        artifact that was REMOVED (a live doc recording its own history, e.g. a superseded module).
        Both are honest prose; only an unmarked citation that outlived its target is a defect.
        """
        window = text[max(0, start - 60) : min(len(text), end + 60)]
        return bool(cls.FUTURE_MARKERS.search(window))

    @staticmethod
    def cited_resolves(tok: str) -> bool:
        """A cited path resolves if it names a file, a directory, or a legitimate SHORTHAND of one.

        Three shorthands are legal house style and are accepted:
          * a numbered-doc stem without its slug (`foundations/06` -> `06-law-of-one-correspondence.md`)
          * a stem without its extension (`lines/02-emotional` -> `02-emotional.md`)
          * a directory with a trailing slash (`docs/historical/`)
          * a numeric range of docs (`foundations/00-09`)
        Anything else is a citation that has outlived its target.
        """
        cand = tok.rstrip("/")
        for base in (ROOT / "docs", ROOT):
            if (base / cand).exists():
                return True
        # shorthand: the token is a strict prefix of at least one real path
        for base in (ROOT / "docs", ROOT):
            parent = base / Path(cand).parent
            stem = Path(cand).name
            if parent.is_dir() and any(e.name.startswith(stem) for e in parent.iterdir()):
                return True
        # a numeric range of docs, e.g. `foundations/00-09`
        if re.fullmatch(r"\d+-\d+", Path(cand).name):
            return True
        return False

    # DG17 — a CITED RECORD ID EXISTS. DG8 checks that a record's `Related:` IDs resolve, and DG15
    # that its `Source:` names a real document — but nothing checked a record ID cited from a CANON
    # document. Four documents (45 §7, 44, AGENTS.md §4.2, the safety ethics contract) cited
    # MY-AD-0017/0018/0019 and MY-RG-0017 while none of those records existed, and every gate
    # reported green: the exact class of MY-RG-0016, on the record layer instead of the path layer.
    # A citation of a record is the strongest form of authority claim in this doc set, so a dangling
    # one is worse than a dangling path — it points the reader at a decision that was never made.
    #
    # Dated audits and quarantined history are exempt: they quote IDs as evidence of what was true
    # then, and rewriting them would falsify the record (`MY-RG-0004`).
    def dg17_record_refs(self, g: str) -> None:
        n = 0
        known = {str(frontmatter(r["text"]).get("ID") or "") for r in records(self.cfg)}
        known.discard("")
        pat = re.compile(r"\bMY-(?:AD|RG)-\d{4}\b")
        for p in live_files(self.cfg):
            here = rel(p)
            if here.startswith("docs/historical/") or here.startswith("docs/audits/"):
                continue
            if "/core/" in here:
                continue  # a record quoting another record is already covered by DG8
            n += 1
            text = read_text_lenient(p)
            for m in pat.finditer(text):
                if m.group(0) not in known:
                    self.err(
                        g,
                        f"{here}: cites record `{m.group(0)}` which does not exist — author it "
                        f"or correct the citation",
                    )
        self.checked[g] = n

    # DG19 — a ratified law must have a consumer. RT-ORPHAN-LAW: an Active AD with no code anchor and
    # no declared deferral is invisible pending work — the largest untracked backlog in the repository
    # (red-team 2026-09-20 §2). Every Active AD declares either `Consumer:` (where the law is
    # consumed: a resolving path, a gate id, or a record id) or `Deferral:` (a `_org.yaml → pending`
    # key naming the work that will consume it). A `Deferral:` is checked against the pending ledger,
    # so it cannot name work nobody tracks (MY-RG-0014's class). The gate reports what it checked, so
    # its coverage is visible rather than implied.
    def dg19_law_consumer(self, g: str) -> None:
        pending = set((self.cfg.get("pending") or {}).keys())
        known_ids = {str(frontmatter(x["text"]).get("ID") or "") for x in records(self.cfg)}
        known_ids.discard("")
        n = 0
        for r in records(self.cfg):
            if "/decisions/" not in r["rel"]:
                continue  # laws only; an RG's consumer is the gate that implements it
            fm = frontmatter(r["text"])
            if str(fm.get("Status") or "").strip().lower() != "active":
                continue
            n += 1
            cons, defer = fm.get("Consumer"), fm.get("Deferral")
            if not cons and not defer:
                self.err(
                    g,
                    f"{r['rel']}: Active AD declares neither `Consumer:` nor `Deferral:` — a law "
                    f"with no consumer is invisible pending work",
                )
                continue
            if defer:
                for k in (x.strip() for x in re.split(r"[;,]", str(defer))):
                    if k and k not in pending:
                        self.err(g, f"{r['rel']}: `Deferral: {k}` names no `_org.yaml → pending` key")
            if cons:
                text = str(cons)
                refs = re.findall(r"`([^`]+)`", text)
                gates = re.findall(r"\b(?:DG|G)\d+\b", text)
                if not refs and not gates:
                    self.err(
                        g,
                        f"{r['rel']}: `Consumer:` names no path, gate id or record id — it must "
                        f"point at something that can be read",
                    )
                for ref in refs:
                    if ref.startswith("planned:"):
                        continue
                    if (ROOT / ref).exists() or ref in known_ids:
                        continue
                    self.err(g, f"{r['rel']}: `Consumer:` names `{ref}` which does not resolve")
        self.checked[g] = n

    # DG20 — script provenance (KB-ORPHAN-TRIAGE, KB audit UT-7).
    #
    # Every script in `scripts/` must declare what it IS, in the file, in a form a gate can read:
    #
    #     @script-status: one-shot — writes the six K-12 branch files; safe only from the
    #                                 pre-authoring state.
    #
    # Five of these are corpus rewriters for RETIRED templates. Before this gate, an agent had no way
    # from the tree to tell `check-invariants.ts` (run on every build) from `strip_game_files.py`
    # (would shred the current corpus). The declaration is in the file rather than in a list because
    # a list is a registry someone must remember to update — the fourth orphan-proof surface.
    #
    # `wired` is a CLAIM and is corroborated: the basename must appear in `package.json`, a CI
    # workflow, `install.sh`, or a live router. A script that says `wired` and is invoked by nothing
    # is the false-compliance class (MY-RG-008) in its cheapest form.
    SCRIPT_DIR = "scripts"
    # `scripts/` is scanned RECURSIVELY. It was a flat `iterdir()` until a migration was archived
    # into `scripts/migrations/` and this gate's coverage silently dropped by exactly the number of
    # files that moved (16 -> 14, 2026-09-21). That is the scaffolder-vs-linter failure the house
    # already has a name for: introducing a new directory SHAPE is a change to every gate whose
    # scope is expressed as "the files in scripts/". A recursive walk means a future
    # `scripts/<anything>/` cannot fall outside the gate.
    SCRIPT_SUFFIXES = (".py", ".ts", ".sh", ".mjs", ".js")

    def dg20_script_provenance(self, g: str) -> None:
        d = ROOT / self.SCRIPT_DIR
        if not d.is_dir():
            self.checked[g] = 0
            return
        wire_files = ["package.json", "install.sh", "AGENTS.md", "README.md"]
        wf = ROOT / ".github" / "workflows"
        if wf.is_dir():
            wire_files += [str(p.relative_to(ROOT)) for p in sorted(wf.glob("*.yml"))]
        wiring = ""
        for cand in wire_files:
            p = ROOT / cand
            if p.is_file():
                wiring += read_text_cached(p)
        scripts = [
            p
            for p in sorted(d.rglob("*"))
            if p.is_file() and p.suffix in self.SCRIPT_SUFFIXES and "__pycache__" not in p.parts
        ]
        texts = {p: read_text_cached(p) for p in scripts}
        n = 0
        for p in scripts:
            n += 1
            # Exclude SELF and the VALIDATOR. A script's own docstring names it, and `arch.py`
            # names every script it gates (its fixture table, its own comments) — so an `internals`
            # built over all scripts corroborates every `wired` claim with a mention of the claim.
            # `wired` means something RUNS it; a governance tool naming it is not an invocation.
            # Caught by DG20's own fixture, which passed on an injected false claim.
            internals = "\n".join(
                t for q, t in texts.items() if q != p and q.name != "arch.py"
            )
            r = rel(p)
            head = "\n".join(read_text_cached(p).splitlines()[:60])
            m = SCRIPT_STATUS_RE.search(head)
            if not m:
                self.err(
                    g,
                    f"{r}: declares no `@script-status:` — one of {sorted(SCRIPT_CLASSES)} plus a "
                    f"reason (an agent cannot tell a build step from a destructive one-shot)",
                )
                continue
            cls, why = m.group(1), (m.group(2) or "").strip().strip("—-– ")
            if cls not in SCRIPT_CLASSES:
                self.err(g, f"{r}: `@script-status: {cls}` is not one of {sorted(SCRIPT_CLASSES)}")
                continue
            # `arch.py` is the validator itself and is wired by the CI workflow; the marker's
            # reason is required for every class, because "why is this here" is the whole finding.
            if len(why) < 20:
                self.err(
                    g,
                    f"{r}: `@script-status: {cls}` carries no reason — say what it does and under "
                    f"what pre-state it is safe",
                )
            # Corroboration: a name in package.json / CI / install.sh / a router, OR a position as a
            # module imported by one of the scripts above (CliConsole and CurriculumCommands are
            # wired only through `cli-game.ts`). A script that claims to be wired and is named
            # nowhere is a false claim — the cheapest form of MY-RG-008.
            if cls == "wired" and p.name not in wiring and p.stem not in internals:
                self.err(
                    g,
                    f"{r}: claims `wired` but nothing invokes it — no reference in package.json, "
                    f"a CI workflow, install.sh, a router, or another script (false claim, MY-RG-008)",
                )
        self.checked[g] = n

    # DG21 — corpus reconciliation (RT-CORPUS-RECONCILE, red-team RT-2).
    #
    # `docs/concept-drafts/<line>/<stage>/` is prose-for-humans; `src/core/data/concept-drafts.json`
    # is what the engine reads. The generator (`scripts/build-concept-index.ts`) guards its own
    # `existsSync` reads — but nothing guarded the JOIN, so a corpus re-index (the 2026-09-20 ladder
    # rename) silently produced empty `modalities` arrays instead of an error. This gate derives the
    # expectation from the directory tree and compares it to the shipped index, so the ingest path
    # cannot diverge without a gate saying so.
    CORPUS_DIR = "docs/concept-drafts"
    CORPUS_INDEX = "src/core/data/concept-drafts.json"
    SKILLS_DIR = "skills"
    SKILLS_MANIFEST = "skills/PROVENANCE.yaml"

    # Code paths a foundations document cites. Canon's contract over a module IS, in practice, the
    # set of paths it names — there is no other machine-readable form of it, and there should not be:
    # duplicating the contract into a registry would create a second place to be wrong (principle 1).
    CANON_CODE_CITE = re.compile(r"`((?:src|tests|scripts)/[A-Za-z0-9_./-]+)`")

    CORPUS_MODALITIES = (
        ("deterministic.md", "Deterministic"),
        ("strategic-planning.md", "Strategic"),
        ("embodied-somatic.md", "Embodied"),
        ("scenario-choice.md", "ScenarioChoice"),
        ("language-reflective.md", "LanguageReflective"),
        ("social-cooperative.md", "SocialCooperative"),
        ("immersive-rpg.md", "ImmersiveRPG"),
    )

    def dg21_corpus_reconcile(self, g: str) -> None:
        base = ROOT / self.CORPUS_DIR
        idx_path = ROOT / self.CORPUS_INDEX
        if not base.is_dir():
            self.checked[g] = 0
            return
        if not idx_path.is_file():
            self.err(g, f"{self.CORPUS_INDEX} is missing — run the corpus generator")
            self.checked[g] = 0
            return
        try:
            shipped = json.loads(read_text_cached(idx_path)).get("modules", {})
        except json.JSONDecodeError as exc:
            self.err(g, f"{self.CORPUS_INDEX} is not valid JSON: {exc}")
            self.checked[g] = 0
            return
        n = 0
        derived: dict[str, dict] = {}
        for line_dir in sorted(p for p in base.iterdir() if p.is_dir()):
            for stage_dir in sorted(p for p in line_dir.iterdir() if p.is_dir()):
                n += 1
                line = line_dir.name[:1].upper() + line_dir.name[1:]
                stage = stage_dir.name.split("-", 1)[-1]
                stage = stage[:1].upper() + stage[1:]
                key = f"{line_dir.name}:{stage.lower()}"
                spec = stage_dir / "module-spec.md"
                title = f"{line} / {stage} — Module Specification"
                if spec.is_file():
                    m = re.search(r"^# (.+)$", read_text_cached(spec), re.M)
                    if m:
                        title = m.group(1).strip()
                derived[key] = {
                    "line": line,
                    "stage": stage,
                    "title": title,
                    "modalities": [name for f, name in self.CORPUS_MODALITIES if (stage_dir / f).is_file()],
                }
        for key in sorted(set(derived) - set(shipped)):
            self.err(g, f"{self.CORPUS_INDEX} is missing module `{key}` present in {self.CORPUS_DIR}")
        for key in sorted(set(shipped) - set(derived)):
            self.err(g, f"{self.CORPUS_INDEX} names module `{key}` with no directory in {self.CORPUS_DIR}")
        for key in sorted(set(derived) & set(shipped)):
            want, got = derived[key], shipped[key]
            if want["modalities"] != list(got.get("modalities") or []):
                self.err(
                    g,
                    f"{self.CORPUS_INDEX} `{key}` modalities {got.get('modalities')} != corpus "
                    f"{want['modalities']} — regenerate it (never hand-edit)",
                )
            elif want["title"] != str(got.get("title") or "").strip():
                self.err(
                    g,
                    f"{self.CORPUS_INDEX} `{key}` title does not match {self.CORPUS_DIR}/"
                    f"{key.split(':')[0]}/{key.split(':')[1]}/module-spec.md",
                )
        self.checked[g] = n

    # DG22 — skill provenance (KB-SKILLS-PROVENANCE, KB audit UT-9).
    #
    # `skills/` is two different things sharing one namespace: HOUSE governance that this project
    # owns and must maintain, and VENDORED third-party content that arrives as a copy and must stay
    # byte-identical to upstream so it can be re-synced. Nothing distinguished them, so "the house
    # utilities" was not a decidable set from the tree — and third-party code sat committed as
    # though it were ours.
    #
    # The declaration lives in a single root manifest (not a marker inside each skill) precisely
    # BECAUSE vendored directories must stay pristine: adding a file to each of them is the drift
    # this exists to prevent. Coverage stays total and fail-closed — an undeclared directory fails,
    # a declared directory that is gone fails — so the manifest cannot rot into a stale list
    # (MY-RG-0015's class).
    #
    # The check that makes it *provenance* rather than a label: the declaration must agree with the
    # content. A `house` claim is REJECTED when upstream artifacts are present (third-party
    # `license`/`metadata.author` frontmatter, or a `LICENSE*` file); a `vendored` entry must carry
    # `source`/`author`/`license`/`license_file`, and `license_file: none` must explain itself.
    #
    # LIMIT, stated rather than implied (MY-RG-0014): for a skill carrying NO upstream artifact the
    # gate corroborates only that the entry is complete, never that its `kind` is true — two of the
    # three vendored entries here (`ui-ux-pro-max`, `design-taste-frontend`) were stripped of their
    # upstream frontmatter before vendoring, so nothing in the tree distinguishes them from a house
    # skill. The fixture therefore injects onto `ui-styling`, the entry whose artifacts exist, so the
    # proof exercises the corroboration branch and not merely the coverage branch.
    HOUSE_KINDS = ("house", "vendored")

    def dg22_skill_provenance(self, g: str) -> None:
        d = ROOT / self.SKILLS_DIR
        man = ROOT / self.SKILLS_MANIFEST
        if not d.is_dir():
            self.checked[g] = 0
            return
        if not man.is_file():
            self.err(g, f"{self.SKILLS_MANIFEST} is missing — {self.SKILLS_DIR}/ provenance is undeclared")
            self.checked[g] = 0
            return
        try:
            declared = (yaml.safe_load(read_text_cached(man)) or {}).get("skills") or {}
        except yaml.YAMLError as exc:
            self.err(g, f"{self.SKILLS_MANIFEST} is not valid YAML: {exc}")
            self.checked[g] = 0
            return
        present = sorted(p.name for p in d.iterdir() if p.is_dir())
        n = 0
        for name in sorted(set(present) - set(declared)):
            self.err(
                g,
                f"{self.SKILLS_DIR}/{name}/ is undeclared in {self.SKILLS_MANIFEST} — declare it "
                f"`house` or `vendored`, or the house set is not decidable from the tree",
            )
        for name in sorted(set(declared) - set(present)):
            self.err(g, f"{self.SKILLS_MANIFEST} declares `{name}` with no {self.SKILLS_DIR}/{name}/ directory")
        for name in sorted(set(declared) & set(present)):
            n += 1
            entry = declared[name] or {}
            kind = str(entry.get("kind") or "")
            if kind not in self.HOUSE_KINDS:
                self.err(
                    g,
                    f"{self.SKILLS_MANIFEST} `{name}.kind` is `{kind or '(missing)'}` — must be one "
                    f"of {', '.join(self.HOUSE_KINDS)}",
                )
                continue
            spec = str(entry.get("spec") or "")
            if spec and not (ROOT / spec).is_file():
                self.err(g, f"{self.SKILLS_MANIFEST} `{name}.spec` names `{spec}` which does not resolve")
            skill_md = d / name / "SKILL.md"
            head = read_text_cached(skill_md) if skill_md.is_file() else ""
            has_upstream_fm = bool(re.search(r"(?m)^(license|metadata):", head))
            lic_files = sorted(p.name for p in (d / name).glob("LICENSE*"))
            if kind == "house":
                if not spec:
                    self.err(g, f"{self.SKILLS_MANIFEST} `{name}` is `house` but declares no `spec` path")
                if has_upstream_fm or lic_files:
                    self.err(
                        g,
                        f"{self.SKILLS_MANIFEST} claims `{name}` is `house`, but the directory carries "
                        f"upstream artifacts ({'frontmatter ' if has_upstream_fm else ''}"
                        f"{', '.join(lic_files)}) — it is vendored, or the artifacts must go",
                    )
            else:
                for field in ("source", "author", "license", "license_file"):
                    if not entry.get(field):
                        self.err(g, f"{self.SKILLS_MANIFEST} `{name}` is `vendored` but declares no `{field}`")
                lf = str(entry.get("license_file") or "")
                if lf and lf != "none" and not (ROOT / lf).is_file():
                    self.err(g, f"{self.SKILLS_MANIFEST} `{name}.license_file` names `{lf}` which does not resolve")
                if lf == "none" and not entry.get("note"):
                    self.err(
                        g,
                        f"{self.SKILLS_MANIFEST} `{name}` declares `license_file: none` without a "
                        f"`note` saying so — an unexplained absence is indistinguishable from an omission",
                    )
        self.checked[g] = n

    # DG23 — foundations documents are linked to the code that must satisfy them
    # (KB-FOUNDATIONS-INGEST, KB audit UT-11).
    #
    # `docs/foundations/` is ingested by nothing: no generator, no mirror, no index. That is
    # *coherent* with the design — canon is the authority and code is the implementation — but it
    # left no mechanical link between a foundation doc's contract and the code that must satisfy it,
    # beyond `contract_docs` pointers on the ORGAN (coarse: one list per organ, so it can say "24
    # governs catalyst" but never "24 governs this file") and DG10/DG16's checks on the paths cited
    # inside *records*. Which is why a canon↔code drift like MY-RG-0005 can exist at all.
    #
    # The link is DERIVED, not declared. A registry mapping 48 documents to their implementing code
    # would be a second place to be wrong and a hand-maintained list (MY-RG-0015); the paths the
    # document actually names already ARE its contract's footprint, and a gate can check them. Two
    # things follow, and both matter more than the check itself:
    #   1. a foundations doc that cites a moved or renamed module FAILS — the RT-9 class, caught at
    #      the citation instead of years later by a human reading prose;
    #   2. the reverse index (path -> the canon that constrains it) is answerable from the tree, so
    #      `arch context <code path>` can print the constitutional constraints on that file.
    # Declared-future citations stay legal via the same `declared_future` window DG10 uses — a plan
    # must be able to name the modules it intends to create.
    def dg23_foundations_ingest(self, g: str) -> None:
        d = ROOT / "docs" / "foundations"
        if not d.is_dir():
            self.checked[g] = 0
            return
        n = 0
        by_doc: dict[str, list[str]] = {}
        for p in sorted(d.glob("*.md")):
            text = read_text_cached(p)
            # A wiki-link target that happens to look like a path (`[[docs/system/...]]`) is DG12's
            # citation and resolves by link rules, not path rules — strip those spans before scanning
            # so the same token is not judged by two different standards (the DG12/DG8 lesson).
            masked = re.sub(r"\[\[[^\]]*\]\]", lambda m: " " * len(m.group(0)), text)
            for m in self.CANON_CODE_CITE.finditer(masked):
                tok = m.group(1)
                n += 1
                by_doc.setdefault(p.stem, []).append(tok)
                if self.cited_resolves(tok):
                    continue
                if self.declared_future(masked, m.start(), m.end()):
                    continue
                self.err(
                    g,
                    f"{rel(p)}: cites `{tok}` which does not resolve — canon constrains code that is "
                    f"gone or was renamed; fix the citation or mark it planned/removed",
                )
        # The other direction, and the one that makes the reverse index useful at all: a document an
        # organ declares as its CONTRACT must anchor that contract to code. A contract doc naming no
        # code can never be returned by `arch context <file>`, so the organ's own list is the only
        # link that exists for it — and an organ list is coarser than the file it governs, which is
        # precisely the gap UT-11 described. 21 entries were in that state; each now carries a
        # `> **Satisfied by:** ...` line naming the module(s) it binds.
        for organ, o in (self.cfg.get("organs") or {}).items():
            for ref in o.get("contract_docs") or []:
                n += 1
                stem = Path(str(ref)).name
                if stem not in by_doc:
                    self.err(
                        g,
                        f"organ `{organ}`: contract doc `{ref}` names no code path — its contract is "
                        f"anchored to nothing, so `arch context <file>` can never return it. Add a "
                        f"`> **Satisfied by:** \u0060<path>\u0060` line naming the module(s) it binds",
                    )
        self.checked[g] = n

    # DG18 — router coverage. A rung's router (`rungs.<name>.router`) is the only door into that
    # rung as far as an agent is concerned; a document it never names is unreachable from the map
    # that is actually read, while every other gate reports green (MY-RG-0022 — 45/46/47 sat in
    # the canon rung unnamed by `docs/foundations/AGENTS.md` for a full day). Naming = the
    # document's two-digit id appears as a token, or inside a `NN–MM` range the router expands.
    def dg18_router_coverage(self, g: str) -> None:
        n = 0
        for rung_name, rung in self.cfg["rungs"].items():
            router_rel = rung.get("router")
            if not router_rel:
                continue  # opt-in: only rungs that declare a router are checked
            n += 1
            router = ROOT / router_rel
            if not router.exists():
                self.err(g, f"rungs.{rung_name}.router `{router_rel}` does not exist")
                continue
            text = read_text_lenient(router)
            named = set(re.findall(r"\b(\d{2})\b", text))
            # Ranges are written `` `23`–`36` `` — backticks sit between the endpoints.
            for a, b in re.findall(r"\b(\d{2})[`*]*\s*[–—-]\s*[`*]*(\d{2})\b", text):
                lo, hi = int(a), int(b)
                if 0 <= lo <= hi <= 99:
                    named.update(f"{i:02d}" for i in range(lo, hi + 1))
            members: list[Path] = []
            for d in rung.get("dirs", []):
                p = ROOT / d["path"]
                if p.is_dir():
                    members.extend(sorted(p.rglob("*.md")))
            for f in rung.get("files", []):
                fp = ROOT / f
                if fp.is_file():
                    members.append(fp)
            for p in members:
                if rel(p) == router_rel:
                    continue
                m = re.match(r"(\d{2})-", p.name)
                if not m:
                    continue
                if m.group(1) not in named:
                    self.err(
                        g,
                        f"{rel(p)} is in rung `{rung_name}` but its router ({router_rel}) never "
                        f"names it — add it there, or the document is unreachable from the rung map",
                    )
        self.checked[g] = n

    # DG10 — canon↔code: every code artifact cited by a record exists
    def dg10_canon_code(self, g: str) -> None:
        n = 0
        for r in records(self.cfg):
            n += 1
            text = r["text"]
            for m in re.finditer(r"`((?:src|tests|scripts)/[A-Za-z0-9_./-]+)`", text):
                if (ROOT / m.group(1)).exists():
                    continue
                # A record whose subject is a RECOMMENDED layout must be able to name the paths it
                # proposes — otherwise the gate forces the record to describe a plan without its
                # target, which is how a plan becomes unreviewable. Same declared-future rule as DG16.
                if self.declared_future(text, m.start(), m.end()):
                    continue
                self.err(g, f"{r['rel']}: cited code artifact `{m.group(1)}` does not exist")
        self.checked[g] = n


# ─────────────────────────────────────────────────────────────────────────────
# Commands
# ─────────────────────────────────────────────────────────────────────────────
def contract_path(ref: str) -> Path | None:
    """Resolve an organ `contract_docs` ref (e.g. `foundations/26-unified-core-architecture`)."""
    for cand in (ROOT / "docs" / f"{ref}.md", ROOT / f"docs/{ref}/AGENTS.md", ROOT / f"{ref}.md"):
        if cand.exists():
            return cand
    return None


def doc_title(p: Path) -> str:
    for line in read_text_lenient(p).splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return p.stem


def organ_docs(organ: str) -> list[Path]:
    """Documents living in an organ, DISCOVERED from the tree rather than declared.

    Auto-discovery is deliberate (audit UT-1). The router and `context` listed only the organ's
    `contract_docs` — which point at *foundations* docs — so an organ's own architecture documents
    were unreachable from every index unless someone hand-edited a registry: 8 of 11 had zero inbound
    links anywhere in the repository. A declaration that can be derived from the tree must be, so a
    document is reachable the moment it exists.
    """
    d = ROOT / "docs" / "system" / "sub-systems" / organ
    if not d.is_dir():
        return []
    return sorted((p for p in d.glob("*.md") if p.name != "AGENTS.md"), key=lambda p: p.name)


def resolve_ref(raw: str, base: Path | None = None) -> Path | None:
    """Resolve a doc cross-reference (wiki-link or markdown link) to a file on disk."""
    raw = raw.strip().split("#")[0].strip()
    if not raw or raw.startswith(("http://", "https://", "mailto:")):
        return None
    cands: list[Path] = []
    if base is not None:
        cands.append((base / raw).resolve())
    cands += [ROOT / raw, ROOT / f"{raw}.md", ROOT / "docs" / raw, ROOT / f"docs/{raw}.md"]
    for c in cands:
        if c.is_file():
            return c
    return None


def outbound_refs(text: str, base: Path, self_path: Path | None = None) -> list[Path]:
    """Every resolved doc->doc edge in `text` — the graph DG12 validated and then discarded (UT-3).

    Four citation styles are in use across the canon, and an edge extractor that only understood the
    first two silently reported `(no backlinks)` for a document that four other files point at:

    1. wiki-links — what canon uses between foundations docs        `[[docs/foundations/19-...]]`
    2. markdown links                                               `[label](docs/foundations/19-...md)`
    3. backticked paths — how routers, records and 44 cite docs     `` `foundations/19-...` ``
    4. bare paths in prose and in `Source:` frontmatter             `docs/foundations/19-...md`
    """
    raws = re.findall(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]", text)
    raws += re.findall(r"\]\(([^)\s]+?\.md)(?:#[^)]*)?\)", text)
    raws += re.findall(r"(?<![\w/`])((?:docs/)?\S+?\.md)", text)
    for span in re.findall(r"`([^`\n]{3,120})`", text):
        if "/" in span and " " not in span.strip():
            raws.append(span)
    # 5. rung-relative paths with a section suffix and no extension — how a record's `Source:`
    # field cites the canon section it transcribes: `foundations/19-choice-and-polarity-engine §9.6`
    raws += re.findall(
        r"(?<![\w/`])((?:docs/)?(?:foundations|system|stages|lines|progression|narrative|"
        r"concept-drafts|audits|historical|archive)/[A-Za-z0-9_./-]+)",
        text,
    )
    # 6. the canon's own shorthand — `NN §X` means `docs/foundations/NN-*.md`. Every canon document
    # cites canon this way (427 occurrences inside foundations alone) and no extractor understood it,
    # so the canon rung's doc->doc graph was effectively INBOUND-ONLY: `related 45-...` reported no
    # outbound edges for a document that depends on 18/22/24 (`_org.yaml → pending →
    # RT-CANON-SHORTHAND`). The shorthand is unambiguous in this corpus — the only occurrence outside
    # `foundations/` is a `stages/` document citing `16 §11.6`.
    for num in set(re.findall(r"(?<![\w/])(\d{2})\s*§", text)):
        hits = sorted((ROOT / "docs" / "foundations").glob(f"{num}-*.md"))
        if hits:
            raws.append(str(hits[0].relative_to(ROOT)))
    out: list[Path] = []
    for raw in raws:
        p = resolve_ref(raw, base)
        if p is None:
            continue
        # A document citing its own section is not an edge. Keeping it would make every document
        # that says `NN §` about itself look connected and silently destroy DG14's orphan detection.
        if self_path is not None and p.resolve() == self_path.resolve():
            continue
        if p not in out:
            out.append(p)
    return out


def where_is(cfg: dict, r: str) -> tuple[str, str]:
    """(rung, organ) for a repo-relative path. The inverse of `route`."""
    for name, rung in cfg["rungs"].items():
        for d in rung.get("dirs", []):
            if r.startswith(d["path"].rstrip("/") + "/"):
                return name, ""
        if r in rung.get("files", []):
            return name, ""
    for pattern in cfg.get("generated", []):
        if Path(pattern).match(r):
            return "generated", ""
    for organ, o in cfg["organs"].items():
        if f"docs/system/sub-systems/{organ}/" in r:
            return "system", organ
        for c in o.get("code") or []:
            if r == c or r.startswith(c.rstrip("/") + "/"):
                return "system", organ
    return "(unclaimed)", ""


def canon_constraints(code_path: str) -> list[tuple[str, str, str]]:
    """Reverse index: the foundations docs that NAME this code path, and the token they name it by
    (DG23's other half).

    The organ's `contract_docs` answers "which docs govern this organ" at the granularity of a whole
    organ — eleven lists, none of which can say "24 governs this file". Scanning the citations gives
    the per-file edge, and it is derived from the same text the gate validates, so the two can never
    disagree. The matched token is returned rather than just the doc, because the useful fact is
    *which sentence's* citation binds: a doc may constrain `src/core/engines/` wholesale and one file
    in it by name, and those are different strengths of claim.

    Ordered by the doc's own number so the output reads as a reading order. Cost: 48 files per call,
    the same order of magnitude as one `search` — there is no index to keep stale.
    """
    out: list[tuple[str, str, str]] = []
    d = ROOT / "docs" / "foundations"
    if not d.is_dir():
        return out
    for p in sorted(d.glob("*.md")):
        if p.name == "AGENTS.md":
            continue
        text = re.sub(r"\[\[[^\]]*\]\]", " ", read_text_cached(p))
        hits: set[str] = set()
        for m in Gate.CANON_CODE_CITE.finditer(text):
            tok = m.group(1)
            if code_path == tok or code_path.startswith(tok.rstrip("/") + "/") or tok.startswith(code_path.rstrip("/") + "/"):
                hits.add(tok)
        if hits:
            out.append((rel(p), doc_title(p), " , ".join(sorted(hits))))
    return out


def organ_block(cfg: dict, organ: str, o: dict, via: str | None = None) -> str:
    """The bundle an agent needs before touching any file of an organ.

    This is the retrieval half of the governance layer (red-team RT-1): a code path must be
    able to answer `which docs govern me, and what was decided about me`.
    """
    rec = cfg["rungs"]["records"]
    out = ["rung:   system", f"organ:  {organ}"]
    if via:
        out.append(f"code:   {via}")
    out.append("contract docs (canon):")
    docs = []
    for ref in o.get("contract_docs") or []:
        p = contract_path(str(ref))
        docs.append(f"{rel(p)} — {doc_title(p)}" if p else f"{ref}  ** MISSING **")
    out += [f"  - {d}" for d in docs] or ["  - (none declared)"]
    # Per-FILE canon, not per-organ: the docs whose text names this path (DG23's reverse index).
    # `contract_docs` above says which docs govern the organ; this says which constrain *this file*
    # and by which token, which is the question an agent is actually asking before it edits one.
    # Deliberately NOT filtered against the list above: a doc that governs the organ AND names the
    # file is a stronger claim than one that only governs the organ, and collapsing the two would
    # hide exactly the distinction this section exists to show.
    if via:
        constraints = canon_constraints(via)
        if constraints:
            out.append("canon naming this path (from the document's own text):")
            out += [f"  - {p} — {t}   [names `{tok}`]" for p, t, tok in constraints]
        else:
            out.append(
                "canon naming this path: (none — no foundation document names it, so only the "
                "organ-level contract docs above constrain it)"
            )
    own = organ_docs(organ)
    out.append("documents in this organ (discovered from the tree):")
    out += [f"  - {rel(p)} — {doc_title(p)}" for p in own] or [
        f"  - (none yet — author one with `arch.py doc add --organ {organ} --title ...`)"
    ]
    out.append("records scoped to this organ:")
    found: list[str] = []
    for home in ("decisions", "regressions"):
        d = ROOT / rec[home]["organ_pattern"].format(organ=organ)
        for p in (sorted(d.glob("*.md")) if d.is_dir() else []):
            fm = frontmatter(p.read_text(encoding="utf-8", errors="ignore"))
            found.append(f"{fm.get('ID')} [{fm.get('Status')}] {fm.get('Title')}")
    out += [f"  - {f}" for f in found] or ["  - (none yet)"]
    out.append("records governing this organ (system core, by `Organ:`):")
    found = []
    for home in ("decisions", "regressions"):
        d = ROOT / rec[home]["system"]
        for p in (sorted(d.glob("*.md")) if d.is_dir() else []):
            fm = frontmatter(p.read_text(encoding="utf-8", errors="ignore"))
            if str(fm.get("Organ")) == organ:
                found.append(f"{fm.get('ID')} [{fm.get('Status')}] {fm.get('Title')}")
    out += [f"  - {f}" for f in found] or ["  - (none yet)"]
    inv = ROOT / "docs" / "system" / "sub-systems" / organ / "AGENTS.md"
    if inv.exists():
        text = inv.read_text(encoding="utf-8")
        if MAN_START in text and MAN_END in text:
            body = text[text.index(MAN_START) + len(MAN_START) : text.index(MAN_END)].strip()
            if body and "not yet curated" not in body:
                out += ["invariants (organ router, curated):", body]
    return "\n".join(out)


def cmd_route(args: argparse.Namespace) -> int:
    cfg = org()
    target = Path(args.path)
    if not target.is_absolute():
        target = ROOT / target
    r = rel(target.resolve())
    for name, rung in cfg["rungs"].items():
        for d in rung.get("dirs", []):
            if r.startswith(d["path"].rstrip("/") + "/") or r == d.get("path"):
                print(f"rung:   {name}\nlive:   {bool(rung.get('live'))}\nauthority: {rung.get('authority', '—')}")
                return 0
        if r in rung.get("files", []):
            print(f"rung:   {name}\nlive:   {bool(rung.get('live'))}\nauthority: {rung.get('authority', '—')}")
            return 0
    for pattern in cfg.get("generated", []):
        if Path(pattern).match(r) or r == pattern:
            print(f"rung:   generated (derived — never hand-edit)\nowner:  scripts/arch.py emit")
            return 0
    for organ, o in cfg["organs"].items():
        if f"docs/system/sub-systems/{organ}/" in r:
            print(organ_block(cfg, organ, o))
            return 0
    # CODE -> ORGAN: the direction an agent actually needs (red-team RT-1).
    for organ, o in cfg["organs"].items():
        for c in o.get("code") or []:
            if r == c or r.startswith(c.rstrip("/") + "/"):
                print(organ_block(cfg, organ, o, via=c))
                return 0
    # SKILLS -> PROVENANCE: `skills/` is not a rung (it is not documentation) and is not an organ
    # (it owns no contract). It is, however, a namespace an agent must be able to ask about — and the
    # audit's finding was that "the house utilities" was undecidable from the tree. Route answers from
    # the one declaration DG22 keeps total, so the question has one answer on both surfaces.
    if r == Gate.SKILLS_DIR or r.startswith(Gate.SKILLS_DIR + "/"):
        name = r[len(Gate.SKILLS_DIR) + 1 :].split("/")[0]
        man = ROOT / Gate.SKILLS_MANIFEST
        entry = None
        if man.is_file():
            entry = ((yaml.safe_load(read_text_cached(man)) or {}).get("skills") or {}).get(name)
        if entry:
            kind = entry.get("kind")
            origin = entry.get("source") or entry.get("spec") or "—"
            print(
                f"skill:  {Gate.SKILLS_DIR}/{name}\n"
                f"kind:   {kind} ({'ours — maintained here' if kind == 'house' else 'third-party — consume, do not edit'})\n"
                f"source: {origin}\n"
                f"declared in: {Gate.SKILLS_MANIFEST} (gate DG22)"
            )
            return 0
        if man.is_file():
            print(
                f"skill:  {Gate.SKILLS_DIR}/{name} (or the manifest root)\n"
                f"declared in: {Gate.SKILLS_MANIFEST} — `python3 scripts/arch.py skills` for the set"
            )
            return 0
    print(f"rung:   (unclaimed)\n{cfg['project']['name']}: this path is not declared in _org.yaml")
    return 1


def cmd_context(args: argparse.Namespace) -> int:
    """The start-of-work bundle for a path: contract docs, invariants, governing records."""
    cfg = org()
    target = Path(args.path)
    if not target.is_absolute():
        target = ROOT / target
    r = rel(target.resolve())
    for organ, o in cfg["organs"].items():
        in_organ_docs = f"docs/system/sub-systems/{organ}/" in r
        in_organ_code = any(r == c or r.startswith(c.rstrip("/") + "/") for c in o.get("code") or [])
        if in_organ_docs or in_organ_code:
            print(organ_block(cfg, organ, o, via=r if in_organ_code else None))
            return 0
    print(f"{cfg['project']['name']}: `{r}` belongs to no organ — nothing to align to.\nRun `arch.py route {r}` for its rung.")
    return 1


def cmd_recon(args: argparse.Namespace) -> int:
    cfg = org()
    kw = args.keyword.lower()
    hits = []
    for r in records(cfg):
        fm = frontmatter(r["text"])
        blob = f"{fm.get('Title', '')} {fm.get('Description', '')} {r['text']}".lower()
        if kw in blob:
            hits.append((fm.get("ID"), fm.get("Title"), r["rel"]))
    print(f"recon `{args.keyword}` — {len(hits)} existing record(s):")
    for rid, title, path in hits:
        print(f"  {rid}  {title}  ({path})")
    if not hits:
        print("  (no coverage — a new record is appropriate)")
    digest = hashlib.sha1(f"{kw}:{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()[:10]
    print(f"\nrecon_id: {digest}")
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# BM25 retrieval — the knowledge-base index
# ─────────────────────────────────────────────────────────────────────────────
STOPWORDS = frozenset(
    "a an and are as at be been but by can could do does for from had has have how in into is it its"
    " may might must not of on or other should than that the their them then there these this those to"
    " under up was were what when where whether which while who why will with within would you your"
    " some such only also very more most much many any all both no nor own same so too".split()
)


def tokenize(text: str) -> list[str]:
    """Lowercase word tokens, stopwords and 1-char noise dropped.

    Deliberately un-stemmed: this corpus is technical and its terms are compound (`contract_docs`,
    `stage-holons`, `polarity-engine`), so aggressive stemming merges distinct concepts and costs more
    precision than it recovers in recall at this size.
    """
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if t not in STOPWORDS and len(t) > 1]


class Corpus:
    """A BM25 index over every live document, plus the citation graph between them.

    Replaces the term-count ranking of the first implementation (audit UT-2), whose three faults BM25
    fixes: a long document out-ranked a precise one, a common word weighed as much as a rare one, and
    "relevance" was a raw mention count so scores were incomparable across rungs.

    Field weighting: title x3, headings x2, body x1; BM25's length normalisation then runs on the
    weighted length.
    """

    K1 = 1.2
    B = 0.75

    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.docs: list[dict] = []
        self.by_path: dict[str, dict] = {}
        self.df: dict[str, int] = {}
        self.records = records(cfg)
        for p in live_files(cfg):
            text = read_text_lenient(p)
            fm = frontmatter(text) if text.startswith("---") else {}
            title = str(fm.get("Title") or doc_title(p))
            headings = " ".join(re.findall(r"^#{1,6} (.+)$", text, re.M))
            body = re.sub(r"^#{1,6} .+$", "", text, flags=re.M)
            tf: dict[str, int] = {}
            for tok in tokenize(title):
                tf[tok] = tf.get(tok, 0) + 3
            for tok in tokenize(headings):
                tf[tok] = tf.get(tok, 0) + 2
            for tok in tokenize(body):
                tf[tok] = tf.get(tok, 0) + 1
            rung, organ = where_is(cfg, rel(p))
            doc = {
                "path": p,
                "rel": rel(p),
                "text": text,
                "title": title,
                "fm": fm,
                "tf": tf,
                "len": sum(tf.values()) or 1,
                "rung": rung,
                "organ": organ,
                "refs": outbound_refs(text, p.parent, self_path=p),
            }
            self.docs.append(doc)
            self.by_path[doc["rel"]] = doc
            for tok in tf:
                self.df[tok] = self.df.get(tok, 0) + 1
        self.n = len(self.docs)
        self.avg = (sum(d["len"] for d in self.docs) / self.n) if self.n else 1.0
        self.inbound: dict[str, int] = {}
        for d in self.docs:
            for r in d["refs"]:
                self.inbound[rel(r)] = self.inbound.get(rel(r), 0) + 1

    def idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.n - df + 0.5) / (df + 0.5)) if self.n else 0.0

    def rank(
        self, terms: list[str], rung: str | None = None, organ: str | None = None
    ) -> list[tuple[float, dict]]:
        uniq = [t for t in dict.fromkeys(terms) if t in self.df]
        if not uniq:
            return []
        scored: list[tuple[float, dict]] = []
        for d in self.docs:
            if (rung and d["rung"] != rung) or (organ and d["organ"] != organ):
                continue
            s = 0.0
            for t in uniq:
                tf = d["tf"].get(t)
                if not tf:
                    continue
                s += self.idf(t) * (tf * (self.K1 + 1)) / (
                    tf + self.K1 * (1 - self.B + self.B * d["len"] / self.avg)
                )
            if s > 0:
                scored.append((s, d))
        scored.sort(key=lambda x: (-x[0], x[1]["rel"]))
        return scored

    def search(
        self, query: str, rung: str | None = None, organ: str | None = None
    ) -> list[tuple[float, dict]]:
        return self.rank(tokenize(query), rung, organ)

    def similar(self, doc: dict, k: int = 8) -> list[tuple[float, dict]]:
        """BM25 similarity: query with this document's own most distinctive terms (tf x idf)."""
        terms = sorted(doc["tf"], key=lambda t: -(doc["tf"][t] * self.idf(t)))[:16]
        return [(s, d) for s, d in self.rank(terms) if d["path"] != doc["path"]][:k]

    def relations(self, doc: dict, k: int = 5) -> dict:
        """Every relationship this document should have, split by whether it already exists.

        `structural` edges come from the declarations (organ contract docs, organ code, the 44 owners
        table, governing records); `suggested` are the BM25-similar documents **not yet linked in
        either direction**. The suggestions are the actionable half: audit UT-3 found relationality was
        checked by DG12 and then discarded, so nothing could ever suggest a missing link.
        """
        cfg = self.cfg
        out_refs = {rel(p) for p in doc["refs"]}
        in_refs = {o["rel"] for o in self.docs if doc["path"] in o["refs"]}
        linked = out_refs | in_refs
        structural: list[tuple[str, str]] = []
        o = cfg["organs"].get(doc["organ"]) if doc["organ"] else None
        if o:
            for ref in o.get("contract_docs") or []:
                p = contract_path(str(ref))
                if p:
                    structural.append((rel(p), "contract doc (canon)"))
            for c in o.get("code") or []:
                structural.append((c, "code this organ implements"))
        owners = (fenced_block(VOCAB_FILE, "# owners-table") or {}).get("owners", {}) or {}
        for term, ref in owners.items():
            if resolve_ref(str(ref)) == doc["path"]:
                structural.append((f"term `{term}`", "this document owns the term"))
        for rec in self.records:
            if doc["organ"] and str(frontmatter(rec["text"]).get("Organ")) == doc["organ"]:
                structural.append((rec["rel"], "record governing this organ"))
        suggested = [
            {"path": d["rel"], "score": round(s, 2), "title": d["title"]}
            for s, d in self.similar(doc, k + 8)
            if d["rel"] not in linked
        ][:k]
        return {
            "existing": {"outbound": sorted(out_refs), "inbound": sorted(in_refs)},
            "structural": structural,
            "suggested": suggested,
        }

    def orphans(self) -> list[dict]:
        """Live documents with no edge in either direction."""
        return [d for d in self.docs if not d["refs"] and self.inbound.get(d["rel"], 0) == 0]


def cmd_search(args: argparse.Namespace) -> int:
    """BM25 search over the LIVE knowledge-base, with relationship suggestions.

    Answers both halves of the specification's retrieval step: *where is this documented* (ranked
    BM25, not term counts) and *what should it be connected to* (`--relations` adds the declared
    structural edges plus the BM25-similar documents not yet linked in either direction).
    """
    cfg = org()
    if not (args.keyword or "").strip():
        fail("search needs at least one term")
    terms = tokenize(args.keyword)
    if not terms:
        fail(f"`{args.keyword}` is entirely stopwords — nothing to match")
    corpus = Corpus(cfg)
    hits = corpus.search(args.keyword, rung=args.rung, organ=args.organ)
    payload: list[dict] = []
    for score, d in hits[: args.limit]:
        lines = []
        for i, line in enumerate(d["text"].splitlines(), 1):
            if any(t in line.lower() for t in terms):
                lines.append({"n": i, "text": " ".join(line.split())[:140]})
                if len(lines) >= args.lines:
                    break
        entry = {
            "score": round(score, 3),
            "path": d["rel"],
            "rung": d["rung"],
            "organ": d["organ"],
            "title": d["title"],
            "lines": lines,
            "outbound": [rel(p) for p in d["refs"]],
            "inbound": corpus.inbound.get(d["rel"], 0),
        }
        if args.relations:
            entry["relations"] = corpus.relations(d)
        payload.append(entry)
    if args.json:
        print(json.dumps({"query": args.keyword, "searched": corpus.n, "hits": payload}, indent=2))
        return 0 if payload else 1
    if not payload:
        print(f"no live document matches `{args.keyword}` (searched {corpus.n} live documents)")
        return 1
    print(f"BM25 `{args.keyword}` — {len(payload)} hit(s) of {corpus.n} live documents\n")
    for h in payload:
        where = "  ".join(x for x in (h["rung"], h["organ"]) if x)
        print(f"{h['path']}   [{where}]  bm25={h['score']}")
        print(f"  {h['title']}")
        for line in h["lines"]:
            print(f"  {line['n']}: {line['text']}")
        print(f"  edges: {len(h['outbound'])} out, {h['inbound']} in")
        if "relations" in h:
            for path, why in h["relations"]["structural"][:8]:
                print(f"    structural: {path}  ({why})")
            for s in h["relations"]["suggested"]:
                print(f"    suggested:  {s['path']}  (bm25 {s['score']})")
        print()
    return 0


def cmd_related(args: argparse.Namespace) -> int:
    """The referential graph for a target: outbound edges AND backlinks.

    Joins the islands that never met (audit UT-3) — organ<->contract docs and organ<->code from
    `_org.yaml`, term<->owner from 44's owners table, record<->organ/Related from frontmatter, and
    doc<->doc from wiki-links — and answers the question nothing could previously answer: what
    references this?
    """
    cfg = org()
    target: Path | None = None
    rid = ""
    for rec in records(cfg):
        if str(frontmatter(rec["text"]).get("ID")) == args.target:
            target, rid = rec["path"], args.target
            break
    if target is None:
        for cand in (ROOT / args.target, ROOT / f"{args.target}.md", ROOT / "docs" / f"{args.target}.md"):
            if cand.is_file():
                target = cand
                break
    if target is None:
        fail(f"`{args.target}` is neither a record ID nor a resolving path")
    r = rel(target)
    text = target.read_text(encoding="utf-8")
    fm = frontmatter(text) if text.startswith("---") else {}
    rung, organ = where_is(cfg, r)

    print("=== node ===")
    print(f"path:   {r}")
    print(f"title:  {fm.get('Title') or doc_title(target)}")
    print(f"rung:   {rung}" + (f"   organ: {organ}" if organ else ""))
    if rid:
        print(f"kind:   {rid}   status: {fm.get('Status')}   organ: {fm.get('Organ')}")
        for other in fm.get("Related") or []:
            print(f"related: {other}")

    print("\n=== outbound (this -> elsewhere) ===")
    edges = outbound_refs(text, target.parent, self_path=target)
    for p in edges:
        print(f"  -> {rel(p)}")
    if not edges:
        print("  (none)")

    print("\n=== structural edges (declared) ===")
    o = cfg["organs"].get(organ) if organ else None
    if o:
        for ref in o.get("contract_docs") or []:
            p = contract_path(str(ref))
            print(f"  governed by  {rel(p) if p else ref}")
        for c in o.get("code") or []:
            print(f"  implemented by  {c}")
    owners = (fenced_block(VOCAB_FILE, "# owners-table") or {}).get("owners", {}) or {}
    for term, ref in owners.items():
        if resolve_ref(str(ref)) == target:
            print(f"  owns term  `{term}`")

    print("\n=== inbound (elsewhere -> this) ===")
    n = 0
    for p in live_files(cfg):
        if p == target:
            continue
        if target in outbound_refs(
            p.read_text(encoding="utf-8", errors="ignore"), p.parent, self_path=p
        ):
            print(f"  <- {rel(p)}")
            n += 1
    for other, oo in cfg["organs"].items():
        for ref in oo.get("contract_docs") or []:
            if contract_path(str(ref)) == target and other != organ:
                print(f"  <- organ `{other}` declares this a contract doc")
                n += 1
    if not n:
        print("  (none — nothing in the live tree references this)")

    corpus = Corpus(cfg)
    node = corpus.by_path.get(r)
    print("\n=== suggested (BM25 — not yet linked in either direction) ===")
    if node is None:
        print("  (not a live document — no index entry)")
        return 0
    for s in corpus.relations(node, k=6)["suggested"]:
        print(f"  + {s['path']}  (bm25 {s['score']})  {s['title'][:64]}")
    if not corpus.relations(node, k=6)["suggested"]:
        print("  (already connected to everything BM25 considers relevant)")
    return 0


DOC_TEMPLATE = """# {{TITLE}}

> **Organ:** `{{ORGAN}}` · **Status:** Active · **Date:** {{DATE}}
> **Contract docs (canon):** {{CONTRACTS}}

## 1. Purpose

What this component exists for, in one paragraph. Reference the foundation doc that owns the
concept; do not restate it.

## 2. Boundaries

What is inside this component and what is explicitly outside it. Name the neighbouring organ when a
responsibility looks like it belongs here but does not.

## 3. Interfaces

| Surface | Direction | Contract |
|---|---|---|
| `src/...` | consumes / provides | ... |

## 4. Invariants

Rules that must hold at all times. Each invariant should be checkable; if it is enforced by a gate,
name the gate (`src/core/validation/gates.ts` G-number) or the RG record.

## 5. Records

Decisions and regression guards governing this component live in `core/decisions/` and
`core/regressions/`. Pull them with:

```bash
python3 scripts/arch.py context {{SAMPLE_CODE}}
```

## 6. References

- ...
"""


def cmd_doc_add(args: argparse.Namespace) -> int:
    """Author an organ document through the CLI (audit UT-4: only AD/RG records had a write path).

    No registry is edited: documents are auto-discovered from the organ directory, so the new file is
    reachable from `route`, `context`, `search`, the organ router and `related` the moment it exists.
    """
    cfg = org()
    if args.organ not in cfg["organs"]:
        fail(f"unknown --organ `{args.organ}` (see _org.yaml organs)")
    title = (args.title or "").strip()
    if len(title) < 8:
        fail("--title must be descriptive (>= 8 chars): it becomes the document's H1 and index entry")
    kebab = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
    d = ROOT / "docs" / "system" / "sub-systems" / args.organ
    d.mkdir(parents=True, exist_ok=True)
    out = d / f"{kebab}.md"
    if out.exists():
        fail(f"{rel(out)} already exists")
    for p in organ_docs(args.organ):
        if str(frontmatter(p.read_text(encoding="utf-8", errors="ignore")).get("Title", "")).strip().lower() == title.lower():
            fail(f"a document with this title already exists: {rel(p)}")
    today = datetime.now(timezone.utc).date().isoformat()
    if args.file:
        body = Path(args.file).read_text(encoding="utf-8")
    else:
        o = cfg["organs"][args.organ]
        refs = []
        for ref in o.get("contract_docs") or []:
            p = contract_path(str(ref))
            refs.append(f"[{ref}]({'/'.join(['..'] * 4)}/{rel(p)})" if p else str(ref))
        code = (o.get("code") or ["src/"])[0]
        body = (
            DOC_TEMPLATE.replace("{{TITLE}}", title)
            .replace("{{ORGAN}}", args.organ)
            .replace("{{DATE}}", today)
            .replace("{{CONTRACTS}}", ", ".join(refs) or "*(none declared)*")
            .replace("{{SAMPLE_CODE}}", code)
        )
    # Relationality is enforced at CREATION time, not only at validate time (audit UT-4): a document
    # that arrives with no reference in either direction is an orphan from birth, and DG14 would fail
    # on the next validate with a message about a file the author has already moved on from.
    if not outbound_refs(body, d, self_path=out) and not args.allow_orphan:
        corpus = Corpus(cfg)
        print(f"\n`{rel(out)}` would be an ORPHAN: it references nothing and nothing references it.")
        print("Candidates by BM25 over the knowledge-base (add at least one reference, then re-run):\n")
        for s, doc in corpus.search(title)[:6]:
            print(f"  + {doc['rel']}  (bm25 {round(s, 2)})")
        print("\nUse `--allow-orphan` only if it genuinely stands alone (nothing is exempt by default).")
        return 2
    out.write_text(body if body.startswith("---") else body.rstrip() + "\n", encoding="utf-8")
    append_ledger(
        cfg,
        {
            "action": "create",
            "target": rel(out),
            "type": "doc",
            "title": title,
            "organ": args.organ,
            "path": rel(out),
            "reason": args.reason or "document authored via `arch.py doc add`",
            "source": args.source or "",
            "operator": "agent",
        },
    )
    print(f"created {rel(out)}\nledger receipt appended")
    print("reachable immediately: `arch.py context", (cfg['organs'][args.organ].get('code') or [''])[0] or '', "`")
    print("run `python3 scripts/arch.py emit` to refresh the organ router")
    return 0


def next_id(cfg: dict, kind: str) -> str:
    nums = []
    for r in records(cfg):
        m = RECORD_RE.match(r["path"].name)
        if m and m.group(2) == kind.upper():
            nums.append(int(m.group(3)))
    return f"MY-{kind.upper()}-{(max(nums) + 1) if nums else 1:04d}"


def append_ledger(cfg: dict, event: dict) -> None:
    path = ROOT / cfg["rungs"]["records"]["ledger"]["path"]
    path.parent.mkdir(parents=True, exist_ok=True)
    event = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), **event}
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(event, ensure_ascii=False) + "\n")


def cmd_new(args: argparse.Namespace) -> int:
    cfg = org()
    if not args.recon:
        fail("`new` requires --recon <id> (run `arch recon <keyword>` first)")
    kind = args.type.lower()
    if kind not in ("ad", "rg"):
        fail("--type must be ad or rg")
    if args.organ not in cfg["organs"]:
        fail(f"unknown --organ `{args.organ}` (see _org.yaml organs)")
    rid = next_id(cfg, kind)
    kebab = re.sub(r"[^a-z0-9]+", "-", args.title.lower()).strip("-")[:60]
    rec = cfg["rungs"]["records"]
    home = "decisions" if kind == "ad" else "regressions"
    if args.system:
        out_dir = ROOT / rec[home]["system"]
    else:
        out_dir = ROOT / rec[home]["organ_pattern"].format(organ=args.organ)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{rid}-{kebab}.md"
    if out.exists():
        fail(f"{rel(out)} already exists")
    body = Path(args.body).read_text(encoding="utf-8") if args.body else ""
    today = datetime.now(timezone.utc).date().isoformat()
    fm = [
        "---",
        f"ID: {rid}",
        f'Title: "{args.title}"',
        f"Status: {args.status}",
        f"Date: {today}",
        f"Organ: {args.organ}",
    ]
    if kind == "rg":
        fm.append(f"Severity: {args.severity}")
    if args.source:
        fm.append(f'Source: "{args.source}"')
    fm += [f'Description: "{args.desc[:1024]}"', "Related: []", "---", "", body, ""]
    out.write_text("\n".join(fm), encoding="utf-8")
    append_ledger(
        cfg,
        {
            "action": "create",
            "target": rid,
            "type": kind,
            "title": args.title,
            "organ": args.organ,
            "path": rel(out),
            "reason": args.reason or f"record created (recon {args.recon})",
            "recon": args.recon,
            "source": args.source or "",
            "operator": "agent",
        },
    )
    print(f"created {rel(out)}\nledger receipt appended")
    return 0


def cmd_update(args: argparse.Namespace) -> int:
    cfg = org()
    if not args.recon:
        fail("`update` requires --recon <id>")
    target = None
    for r in records(cfg):
        if frontmatter(r["text"]).get("ID") == args.id:
            target = r
            break
    if not target:
        fail(f"no record with ID {args.id}")
    text = target["text"]
    if args.body:
        body_path = Path(args.body)
        if not body_path.is_file():
            fail(f"`{body_path}` is not a readable body file")
        replacement = body_path.read_text(encoding="utf-8")
        if replacement.startswith("---"):
            fail("--body must contain the record body without frontmatter")
        match = re.match(r"---\n.*?\n---\n", text, re.S)
        if not match:
            fail(f"{target['rel']}: no frontmatter block to replace body beside")
        text = match.group(0) + replacement.rstrip() + "\n"
    # `--unset KEY` removes a key from the frontmatter. Needed because a discharged field must GO:
    # `Deferral:` names a `_org.yaml → pending` key, and once the work lands the key is removed from
    # the ledger, so leaving the field behind fails DG19 forever. An empty `--field K=` deliberately
    # means "leave this key alone", so removal has no other spelling.
    for key in args.unset or []:
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", key):
            fail(f"`{key}` is not a valid frontmatter key")
        pat = re.compile(rf"(?m)^{re.escape(key)}:.*\n")
        if not pat.search(text):
            fail(f"{target['rel']}: frontmatter has no `{key}:` to unset")
        text = pat.sub("", text, count=1)
    for field in args.field or []:
        key, _, value = field.partition("=")
        if not value:
            continue  # an empty value means "leave this key alone", never `Key: ""`
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", key):
            fail(f"`{key}` is not a valid frontmatter key")
        # A bracketed value is a YAML FLOW LIST, not a string — `Related: [MY-AD-0001]` is a list of
        # IDs and every reader (`DG8`, `related`, `--json`) treats it as one. Quoting it wrote a
        # one-element string that DG8 then split on punctuation, reporting `Related `G``, `Related
        # `-`` and `Related `0`` as unresolvable IDs. `update` is the ONLY write path, so it has to
        # be able to write the field shapes the records actually use.
        if re.fullmatch(r"\[\s*\]", value):
            value = "[]"
        elif re.fullmatch(r"\[[^\[\]]*\]", value):
            items = [x.strip() for x in value[1:-1].split(",") if x.strip()]
            if all(re.fullmatch(r"[A-Za-z0-9_.\- ]+", i) for i in items):
                value = "[" + ", ".join(items) + "]"
        # Otherwise quote a value YAML cannot take as a plain scalar. A backtick is the common case
        # here — a plain scalar may not START with one, and writing it unquoted silently corrupted
        # six records' frontmatter (2026-09-20), which erased their IDs from every gate that reads
        # them. A scalar that happens to start with `[` but is NOT a clean list still falls here.
        elif re.search(r":\s", value) or value[:1] in "*&!%#@`|>[]{}'\"-?:,":
            value = '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
        pat = re.compile(rf"(?m)^{re.escape(key)}:.*$")
        if pat.search(text):
            text = pat.sub(lambda _m, v=value: f"{key}: {v}", text, count=1)
            continue
        # A key the record does not carry yet (e.g. the `Consumer:`/`Deferral:` pair DG19 requires)
        # is inserted INSIDE the frontmatter block. Replacing in place silently did nothing for a new
        # key, so `update` reported success while writing no change (found while declaring DG19's
        # fields fleet-wide, 2026-09-20).
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        if not m:
            fail(f"{target['rel']}: no frontmatter block to add `{key}:` to")
        text = f"---\n{m.group(1)}\n{key}: {value}\n---\n" + text[m.end() :]
    text += f"\n<!-- {datetime.now(timezone.utc).date().isoformat()}: {args.reason} (recon {args.recon}) -->\n"
    target["path"].write_text(text, encoding="utf-8")
    append_ledger(
        cfg,
        {                "action": "update",
                "target": args.id,
                "fields": list(args.field or []),
            "reason": args.reason,
            "recon": args.recon,
            "path": target["rel"],
            "operator": "agent",
        },
    )
    print(f"updated {target['rel']}\nledger receipt appended")
    return 0


def cmd_log(args: argparse.Namespace) -> int:
    cfg = org()
    if not args.reason:
        fail("`log` requires --reason")
    append_ledger(
        cfg,
        {
            "action": args.action,
            "target": args.target,
            "reason": args.reason,
            "summary": args.summary or "",
            "operator": args.operator,
        },
    )
    print("ledger receipt appended")
    return 0


AUTO_START = "<!-- arch:auto-zone:start -->"
AUTO_END = "<!-- arch:auto-zone:end -->"
MAN_START = "<!-- arch:manual-zone:start -->"
MAN_END = "<!-- arch:manual-zone:end -->"


def organ_router(cfg: dict, organ: str, o: dict, existing: str | None) -> str:
    docs = o.get("contract_docs") or []
    code = o.get("code") or []
    auto = [
        AUTO_START,
        "### Identity (generated from _org.yaml - do not edit)",
        "",
        f"- **Organ:** `{organ}`",
        f"- **Rung:** system (`docs/system/sub-systems/{organ}/`)",
        f"- **Contract docs (canon):** " + (", ".join(f"`{d}`" for d in docs) if docs else "*(none - substrate organ)*"),
        f"- **Code it describes:** " + ", ".join(f"`{c}`" for c in code),
        f"- **Records:** `core/decisions/` (AD) - `core/regressions/` (RG)",
        "",
        "Route anything here with `python3 scripts/arch.py route <path>`.",
        "Pull the whole bundle with `python3 scripts/arch.py context <code-or-doc-path>`.",
        "",
        "### Documents in this organ (auto-discovered — never hand-maintained)",
        "",
    ]
    own = organ_docs(organ)
    auto += [f"- [{p.name}](./{p.name}) — {doc_title(p)}" for p in own] or [
        f"*(none yet — author one with `arch.py doc add --organ {organ} --title ...`)*"
    ]
    auto += ["", AUTO_END]
    manual = [
        MAN_START,
        "### Boundaries and invariants (curated - preserved across emits)",
        "",
        "*(not yet curated for this organ)*",
        MAN_END,
    ]
    header = f"# {organ} - organ router\n"
    if existing and MAN_START in existing and AUTO_START in existing:
        pre = existing[: existing.index(AUTO_START)]
        man_start = existing.find(MAN_START)
        man_end = existing.find(MAN_END)
        preserved = existing[man_start : man_end + len(MAN_END)] if man_start >= 0 else "\n".join(manual)
        return pre + "\n".join(auto) + "\n\n" + preserved + "\n"
    return header + "\n" + "\n".join(auto) + "\n\n" + "\n".join(manual) + "\n"


def emit_organ_routers(cfg: dict) -> int:
    n = 0
    for organ, o in cfg["organs"].items():
        d = ROOT / "docs" / "system" / "sub-systems" / organ
        d.mkdir(parents=True, exist_ok=True)
        for sub in ("core/decisions", "core/regressions"):
            sd = d / sub
            sd.mkdir(parents=True, exist_ok=True)
            # Record homes are declared mandatory by _org.yaml, but git does not track empty
            # directories (red-team RT-7): without a keep-file they vanish on a fresh clone
            # and the first organ-scoped record has nowhere to land.
            keep = sd / ".gitkeep"
            if not keep.exists():
                keep.write_text("", encoding="utf-8")
        p = d / "AGENTS.md"
        existing = p.read_text(encoding="utf-8") if p.exists() else None
        p.write_text(organ_router(cfg, organ, o, existing), encoding="utf-8")
        n += 1
    return n


def cmd_emit(args: argparse.Namespace) -> int:
    cfg = org()
    organs_written = emit_organ_routers(cfg)
    print(f"wrote {organs_written} organ routers under docs/system/sub-systems/")
    out = ROOT / "docs" / "INDEX.md"
    out.write_text(render_index(cfg), encoding="utf-8")
    print(f"wrote {rel(out)} ({len(records(cfg))} records, {len(cfg['organs'])} organs)")
    return 0


def cmd_seed(args: argparse.Namespace) -> int:
    """Create records from a transcription map (one YAML file -> many records).

    The map documents the transcription itself: every entry names the canon
    section it transcribes, so seeding can never become a quiet theory rewrite.
    """
    cfg = org()
    src = Path(args.file)
    if not src.is_absolute():
        src = ROOT / src
    data = yaml.safe_load(src.read_text(encoding="utf-8"))
    rec = cfg["rungs"]["records"]
    today = datetime.now(timezone.utc).date().isoformat()
    created = 0
    for entry in data.get("records", []):
        kind = entry["type"].lower()
        rid = entry["id"]
        if not re.match(r"MY-(AD|RG)-\d{4}$", rid):
            fail(f"seed entry id must look like MY-AD-0001 (got {rid})")
        organ = entry.get("organ", "kernel")
        if organ not in cfg["organs"]:
            fail(f"seed entry {rid}: unknown organ {organ}")
        kebab = re.sub(r"[^a-z0-9]+", "-", entry["title"].lower()).strip("-")[:60]
        home = "decisions" if kind == "ad" else "regressions"
        out_dir = ROOT / (rec[home]["system"] if entry.get("system") else rec[home]["organ_pattern"].format(organ=organ))
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{rid}-{kebab}.md"
        if out.exists() and not args.force:
            print(f"  skip  {rel(out)} (exists)")
            continue
        fm = [
            "---",
            f"ID: {rid}",
            f'Title: "{entry["title"]}"',
            f"Status: {entry.get('status', 'Active')}",
            f"Date: {entry.get('date', today)}",
            f"Organ: {organ}",
        ]
        if kind == "rg":
            fm.append(f"Severity: {entry.get('severity', 'Medium')}")
        fm.append(f'Source: "{entry["source"]}"')
        fm.append(f'Description: "{entry["description"][:1024]}"')
        related = entry.get("related") or []
        fm.append("Related: [" + ", ".join(str(x) for x in related) + "]")
        fm += ["---", "", entry["body"].strip(), ""]
        out.write_text("\n".join(fm), encoding="utf-8")
        append_ledger(
            cfg,
            {
                "action": "create",
                "target": rid,
                "type": kind,
                "title": entry["title"],
                "organ": organ,
                "path": rel(out),
                "reason": f"seeded from {src.name} (transcription of {entry['source']})",
                "recon": args.recon or "seed",
                "source": entry["source"],
                "operator": "agent",
            },
        )
        created += 1
        print(f"  create {rel(out)}")
    print(f"\nseeded {created} record(s); ledger receipts appended")
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    cfg = org()
    as_json = bool(getattr(args, "json", False))
    out = getattr(args, "out", None)
    if not as_json:
        print(f"arch validate — {len(cfg['gates'])} gates configured\n")
    return Gate(cfg).run(args.gate, as_json=as_json, out=out)


# ─────────────────────────────────────────────────────────────────────────────
# Gate fixtures (RT-GATE-FIXTURES): prove a gate FAILS on an injected violation.
#
# Every injection is targeted at a single file, restored in a `finally`, and only its own gate is
# run — so the proof is fast, has no side effects, and does not depend on the rest of the tree being
# clean. A fixture is `(path, find, replace)`; `find == ""` means "create this file" (used where the
# violation is a document that should not exist). A gate with no entry is reported as UNPROVEN rather
# than passed silently — the same honesty rule the kernel gates use for rubric validity.
#
# A gate whose logic has MORE THAN ONE branch lists one fixture per branch (`"DGx": [f1, f2]`), and
# EVERY fixture must fail. One fixture per gate proves one branch and silently vouches for the rest —
# the shape of MY-RG-0010 one level up: a gate with three checks and one injected failure reads as
# proven on all three.
# ─────────────────────────────────────────────────────────────────────────────
RECORD = "docs/system/core/decisions/MY-AD-0001-assessment-module-execution-replaces-the-atb-combat-spine.md"
CANON = "docs/foundations/24-encounter-scheduler.md"
ROUTER = "docs/foundations/AGENTS.md"

def _fixture_orphan() -> str:
    return (
        "---\ntitle: Fixture orphan\nstatus: Active\n---\n\n"
        "# Fixture orphan\n\nAn injected document with no reference in either direction.\n"
    )


FIXTURE_SPEC = tuple[str, str, str]
GATE_FIXTURES: dict[str, FIXTURE_SPEC | list[FIXTURE_SPEC]] = {
    "DG1": (RECORD, "Status: Active", "StatusRenamed: Active"),
    "DG2": (RECORD, "Status: Active", "Status: Retired"),
    "DG3": (RECORD, "ID: MY-AD-0001", "ID: MY-AD-0002"),
    "DG4": (CANON, "## 1. Purpose: the world's intelligence", "## 1. Purpose: the world's intelligence\n\nThis binding contract is the single source of truth for encounter order."),
    "DG5": (CANON, "## 9. The scheduler's relationship to the LLM", "## 9. The White stage and the scheduler"),
    "DG6": (CANON, "## 1. Purpose: the world's intelligence", "## 1. Purpose: the world's intelligence\n\nThe plan is recorded in docs/historical/brain-game-upgrade/02-gap-analysis.md."),
    "DG7": (VOCAB_REL, "  root-protocol: AGENTS.md", "  root-protocol: docs/foundations/99-no-such-owner"),
    "DG8": (RECORD, "Related: [MY-AD-0002, MY-RG-0005]", "Related: [MY-AD-9999]"),
    "DG9": ("docs/system/logs/mutations.jsonl", '"target": "MY-AD-0001"', '"target": "MY-AD-9999"'),
    "DG10": (RECORD, "## Context", "## Context\n\nImplemented in `src/core/nonexistent-module.ts`.\n"),
    "DG11": ("docs/INDEX.md", "", ""),  # special-cased: index staleness is proven by appending a line
    "DG12": (CANON, "## 1. Purpose: the world's intelligence", "## 1. Purpose: the world's intelligence\n\nSee [[docs/foundations/99-does-not-exist]]."),
    "DG13": ("_org.yaml", "    code: [src/core/onboarding, src/core/adaptive]", "    code: [src/core/no-such-organ-code]"),
    "DG14": ("docs/foundations/98-fixture-orphan.md", "", "__ORPHAN__"),
    "DG15": (RECORD, 'Source: "foundations/26-unified-core-architecture"', 'Source: "foundations/99-does-not-exist"'),
    "DG16": (CANON, "## 1. Purpose: the world's intelligence", "## 1. Purpose: the world's intelligence\n\nSee `src/core/nonexistent-module.ts`."),
    "DG17": (CANON, "## 1. Purpose: the world's intelligence", "## 1. Purpose: the world's intelligence\n\nSuperseded by MY-AD-9999."),
    "DG18": ("docs/foundations/98-router-fixture.md", "", "__ORPHAN__"),
    "DG19": (RECORD, 'Consumer: "`src/core/assessments/AgenticOrchestrator.ts`, `src/core/GameLoop.ts`"', "ConsumerNote: moved out of the contract"),
    # DG20: claim `wired` on a probe that nothing invokes — the false-compliance case (MY-RG-008).
    "DG20": ("scripts/tdg-probe.ts", "@script-status: probe", "@script-status: wired"),
    # DG21: desynchronise the generated corpus index from the corpus it is generated from.
    "DG21": ("src/core/data/concept-drafts.json", '"Deterministic"', '"NoSuchModality"'),
    # DG23 has two independent branches, so it carries two fixtures — one for each direction of the
    # canon<->code edge. A single fixture would prove the citation check and leave the contract-doc
    # coverage check vouched for by nothing.
    "DG23": [
        # (a) cite a module from canon that no longer exists, unmarked — the RT-9 class (canon
        # constraining code that moved or was renamed, invisible because nothing read the citation).
        (
            "docs/foundations/19-choice-and-polarity-engine.md",
            "src/core/engines/PolarityEngine.ts",
            "src/core/engines/PolarityEngineRenamed.ts",
        ),
        # (b) strip a contract doc's only code citation, so the doc an organ declares as its contract
        # is anchored to nothing and no `arch context <file>` can ever return it (UT-11's other half).
        # The whole line goes, not just its prefix: leaving the tail in place kept the doc's
        # `StageQuality.ts` citation alive and the injection was silently a no-op — which the
        # harness caught by reporting "gate PASSED on its injected violation". That is the fixture
        # checking itself.
        (
            "docs/foundations/02-eight-stages-overview.md",
            "> **Satisfied by:** `src/core/domain/Stage.ts` (the eight-altitude ladder, its ordinals and"
            " its names) · `src/core/domain/StageQuality.ts` (§5's per-altitude quality — emergent"
            " order, per-quadrant integrity and pathology markers, identity band)\n",
            "",
        ),
    ],
    # DG22: claim a vendored skill is `house`, with a resolving `spec` so the fixture reaches the
    # CORROBORATION branch and not the missing-field branch — the point of the gate is that the
    # declaration must agree with the content (a wrong provenance that passes is no provenance).
    "DG22": (
        "skills/PROVENANCE.yaml",
        "  ui-styling:\n    kind: vendored",
        "  ui-styling:\n    kind: house\n    spec: skills/ui-styling/SKILL.md",
    ),
}


def cmd_fixtures(args: argparse.Namespace) -> int:
    """Prove every gate fails on an injected violation (RT-GATE-FIXTURES).

    AGENTS.md §7.5 step 1b required this by hand for every gate change; a manual proof is the same
    attention whose absence caused the failure it is meant to catch, so it is automated here and
    runs as part of the battery.
    """
    cfg = org()
    order = list(GATE_CONFIG_KEY)
    unproven: list[str] = []
    broken: list[str] = []
    proven: list[str] = []
    for gate in order:
        specs = GATE_FIXTURES.get(gate)
        if specs is None:
            unproven.append(gate)
            continue
        if isinstance(specs, tuple):
            specs = [specs]
        ok = True
        for n, (target, find, repl) in enumerate(specs, 1):
            label = f"{gate}" if len(specs) == 1 else f"{gate}.{n}"
            p = ROOT / target
            # DG11's injection is an appended line, not a creation (its `find` is empty by design).
            created = find == "" and gate != "DG11"
            if created and p.exists():
                broken.append(f"{label}: fixture path {target} already exists — refusing to clobber it")
                ok = False
                continue
            if not created and not p.exists():
                broken.append(f"{label}: fixture target {target} is missing from the tree")
                ok = False
                continue
            original = None if created else p.read_text(encoding="utf-8")
            if not created and find not in original:
                broken.append(f"{label}: fixture anchor not found in {target} — the fixture is stale")
                ok = False
                continue
            # `wrote` is the ONLY thing that may authorise a delete. Deciding it from `created` alone
            # deleted `docs/INDEX.md` when an unrelated "already exists" guard ran inside the try block
            # (2026-09-20): a fixture harness must never be able to remove a file it did not create.
            wrote = False
            try:
                if created:
                    body = _fixture_orphan() if repl == "__ORPHAN__" else repl
                    p.write_text(body, encoding="utf-8")
                    wrote = True
                elif gate == "DG11":
                    p.write_text(
                        original + "\n- an injected line that makes a generated surface stale\n",
                        encoding="utf-8",
                    )
                else:
                    p.write_text(original.replace(find, repl, 1), encoding="utf-8")
                # Reload per fixture: a gate that reads `_org.yaml` (DG13, DG18) must see the injected
                # config, and loading it once before the loop silently made those fixtures no-ops. The
                # per-pass read index must be dropped for the same reason: without `bust()` the gate
                # would re-read the PRE-injection bytes from cache and every fixture would report
                # "gate passed on its injected violation" — a cache that hides the violation it is
                # meant to expose. (KB-VALIDATE-JSON)
                bust()
                g = Gate(org())
                g.run(gate)
                if not g.problems:
                    broken.append(f"{label}: gate PASSED on its injected violation — it has no teeth")
                    ok = False
                else:
                    print(f"  ✓ {label:7s} fails on injection ({len(g.problems)} finding(s))")
            finally:
                bust()
                if created:
                    if wrote and p.exists():
                        p.unlink()
                elif original is not None:
                    p.write_text(original, encoding="utf-8")
        if ok:
            proven.append(gate)
    print()
    for b in broken:
        print(f"  ✗ {b}")
    if unproven:
        print(f"  ! no fixture (teeth unproven): {', '.join(unproven)}")
    n_fixtures = sum(len(v) if isinstance(v, list) else 1 for v in GATE_FIXTURES.values())
    print(
        f"\narch fixtures — {len(proven)}/{len(order)} gates proven to fail on injection "
        f"({n_fixtures} injections)"
    )
    return 1 if broken else 0


def cmd_skills(args: argparse.Namespace) -> int:
    """Answer "what are the house utilities?" from the tree (KB audit UT-9).

    The manifest is the single declaration; DG22 keeps it total over `skills/*/` and corroborates
    every claim the tree can corroborate. This verb exists so an agent does not have to read YAML to
    get the answer — the audit's finding was that the set was not decidable *from the tree*, and a
    decidable set that only one gate can read is only half a fix (AD-056: one surface, named verbs).
    """
    man = ROOT / Gate.SKILLS_MANIFEST
    if not man.is_file():
        print(f"{Gate.SKILLS_MANIFEST} is missing — see DG22")
        return 1
    manifest = (yaml.safe_load(read_text_cached(man)) or {}).get("skills") or {}
    want = None if args.kind == "all" else args.kind
    rows = [(n, e) for n, e in sorted(manifest.items()) if want is None or (e or {}).get("kind") == want]
    for name, entry in rows:
        entry = entry or {}
        kind = entry.get("kind")
        detail = entry.get("source") or entry.get("spec") or ""
        print(f"{kind:8s}  skills/{name:<22s}  {detail}")
        note = re.sub(r"\s+", " ", str(entry.get("purpose") or entry.get("note") or "")).strip()
        if note:
            print(f"          {'':22s}  {note[:110]}{'…' if len(note) > 110 else ''}")
    print(f"\n{len(rows)} skill(s) [{args.kind}] — manifest {Gate.SKILLS_MANIFEST}, gate DG22")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="arch", description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("route", help="resolve a path to its rung/organ")
    p.add_argument("path")
    p.set_defaults(fn=cmd_route)

    p = sub.add_parser("recon", help="coverage report before creating a record")
    p.add_argument("keyword")
    p.set_defaults(fn=cmd_recon)

    p = sub.add_parser("context", help="start-of-work bundle for a path (contract docs + records)")
    p.add_argument("path")
    p.set_defaults(fn=cmd_context)

    p = sub.add_parser("search", help="keyword search over live docs + records")
    p.add_argument("keyword")
    p.add_argument("--limit", type=int, default=10, help="max hits to print")
    p.add_argument("--lines", type=int, default=3, help="matching lines per hit")
    p.add_argument("--rung", help="restrict to one rung (canon, system, content, ...)")
    p.add_argument("--organ", help="restrict to one organ")
    p.add_argument(
        "--relations",
        action="store_true",
        help="also emit the declared structural edges and BM25-similar documents not yet linked",
    )
    p.add_argument("--json", action="store_true", help="machine-readable output")
    p.set_defaults(fn=cmd_search)

    p = sub.add_parser("related", help="referential graph for a path or record ID (forward + backlinks)")
    p.add_argument("target")
    p.set_defaults(fn=cmd_related)

    p = sub.add_parser("doc", help="author a document in an organ (reachable the moment it exists)")
    ds = p.add_subparsers(dest="doc_cmd", required=True)
    pd = ds.add_parser("add", help="create an organ document from the house template")
    pd.add_argument("--organ", required=True)
    pd.add_argument("--title", required=True)
    pd.add_argument("--file", help="markdown body to use instead of the house template")
    pd.add_argument("--source", default="", help="canon section this documents")
    pd.add_argument("--reason", default="")
    pd.add_argument(
        "--allow-orphan",
        action="store_true",
        help="permit a document with no reference in either direction (DG14 will still flag it)",
    )
    pd.set_defaults(fn=cmd_doc_add)

    p = sub.add_parser("new", help="create an AD or RG record")
    p.add_argument("--type", required=True, choices=["ad", "rg"])
    p.add_argument("--title", required=True)
    p.add_argument("--desc", required=True)
    p.add_argument("--organ", required=True)
    p.add_argument("--body", help="path to a markdown file holding the record body")
    p.add_argument("--source", help="the canon section this record transcribes")
    p.add_argument("--status", default="Active")
    p.add_argument("--severity", default="Medium", help="RG only")
    p.add_argument("--system", action="store_true", help="file in the system core, not an organ core")
    p.add_argument("--reason")
    p.add_argument("--recon", required=True)
    p.set_defaults(fn=cmd_new)

    p = sub.add_parser("update", help="amend a record")
    p.add_argument("id")
    p.add_argument("--field", action="append", help="Key=Value (repeatable)")
    p.add_argument("--unset", action="append", help="remove a frontmatter key (repeatable)")
    p.add_argument("--body", help="path to a markdown file holding the replacement body (frontmatter omitted)")
    p.add_argument("--reason", required=True)
    p.add_argument("--recon", required=True)
    p.set_defaults(fn=cmd_update)

    p = sub.add_parser("log", help="append a structural mutation receipt")
    p.add_argument("--action", required=True)
    p.add_argument("--target", required=True)
    p.add_argument("--reason", required=True)
    p.add_argument("--summary")
    p.add_argument("--operator", default="agent")
    p.set_defaults(fn=cmd_log)

    p = sub.add_parser("emit", help="regenerate derived surfaces")
    p.set_defaults(fn=cmd_emit)

    p = sub.add_parser("seed", help="create records from a transcription map")
    p.add_argument("file", help="YAML transcription map")
    p.add_argument("--recon", default="seed")
    p.add_argument("--force", action="store_true", help="overwrite existing records")
    p.set_defaults(fn=cmd_seed)

    p = sub.add_parser("validate", help="run the doc-governance gates")
    p.add_argument("--gate", help="run a single gate (e.g. DG5)")
    p.add_argument("--json", action="store_true", help="machine-readable result on stdout")
    p.add_argument(
        "--out",
        help="write the machine-readable result to a path (default: none — see KB-VALIDATE-JSON)",
    )
    p.set_defaults(fn=cmd_validate)

    p = sub.add_parser("fixtures", help="prove every gate fails on an injected violation")
    p.set_defaults(fn=cmd_fixtures)

    p = sub.add_parser(
        "skills",
        help="list skills by provenance — house (ours, maintained here) vs vendored (third-party)",
    )
    p.add_argument("--kind", choices=["house", "vendored", "all"], default="all")
    p.set_defaults(fn=cmd_skills)

    args = ap.parse_args(argv)
    # One command = one pass over the tree. The index is per-pass by design; a persisted cache is a
    # gate that can pass on a broken tree (see the note above `bust`).
    bust()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
