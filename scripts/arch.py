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
    python3 scripts/arch.py log --action A --target T --reason R
    python3 scripts/arch.py emit                         regenerate INDEX.md + organ routers
    python3 scripts/arch.py validate [--gate DG5]        run the doc-governance gates (DG1-DG12)

Exit codes: 0 = clean, 1 = violations, 2 = misuse.
"""

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
}


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
    """
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
    return out


def record_dirs(cfg: dict) -> list[Path]:
    rec = cfg["rungs"]["records"]
    dirs = [ROOT / rec["decisions"]["system"], ROOT / rec["regressions"]["system"]]
    for organ in cfg["organs"]:
        dirs.append(ROOT / rec["decisions"]["organ_pattern"].format(organ=organ))
        dirs.append(ROOT / rec["regressions"]["organ_pattern"].format(organ=organ))
    return dirs


def records(cfg: dict) -> list[dict]:
    out = []
    for d in record_dirs(cfg):
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.md")):
            if p.name.startswith("."):
                continue
            out.append({"path": p, "dir": d, "text": p.read_text(encoding="utf-8"), "rel": rel(p)})
    return out


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
        self._edges: dict[str, list[Path]] | None = None

    def edge_index(self) -> dict[str, list[Path]]:
        """Outbound citation edges for every live document, computed once per validate pass."""
        if self._edges is None:
            idx: dict[str, list[Path]] = {}
            for p in live_files(self.cfg):
                idx[rel(p)] = outbound_refs(p.read_text(encoding="utf-8", errors="ignore"), p.parent)
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

    def run(self, only: str | None) -> int:
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
        ]
        for name, fn in gates:
            if only and name != only:
                continue
            # Config keys are `dgN_<slug>`; resolve them through the gate's own key so
            # `enabled: false` actually disables the gate (red-team RT-5a: it silently did not).
            gcfg = self.cfg.get("gates", {}).get(GATE_CONFIG_KEY.get(name, ""), {})
            if gcfg.get("enabled", True) is False:
                continue
            fn(name)
        width = max((len(k) for k in self.checked), default=0)
        for name, n in self.checked.items():
            print(f"  {name:<{width}}  {n}")
        if self.problems:
            print(f"\n{len(self.problems)} violation(s):\n")
            for p in self.problems:
                print(f"  ✗ {p}")
            return 1
        print("\narch: 0 violations — all requested gates passed")
        return 0

    # DG1 — frontmatter + filename schema
    def dg1_frontmatter(self, g: str) -> None:
        n = 0
        for r in records(self.cfg):
            n += 1
            m = RECORD_RE.match(r["path"].name)
            if not m:
                self.err(g, f"{r['rel']}: filename must match MY-(AD|RG)-NNNN-kebab.md")
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
            for line in ledger_path.read_text(encoding="utf-8").splitlines():
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
            text = p.read_text(encoding="utf-8")
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
            text = p.read_text(encoding="utf-8")
            # The vocabulary doc DEFINES the blacklist; records QUOTE superseded vocabulary when
            # documenting an incident. Neither is a drift.
            if r == VOCAB_REL or r.startswith("docs/system/core/"):
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
            if r == "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md" or r.startswith("docs/system/core/"):
                continue
            n += 1
            text = p.read_text(encoding="utf-8")
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
            for line in ledger_path.read_text(encoding="utf-8").splitlines():
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
        elif strip_generated_date(idx.read_text(encoding="utf-8")) != strip_generated_date(
            render_index(cfg)
        ):
            self.err(g, "docs/INDEX.md is stale — run `python3 scripts/arch.py emit` (never hand-edit it)")
        for organ, o in cfg["organs"].items():
            n += 1
            p = ROOT / "docs" / "system" / "sub-systems" / organ / "AGENTS.md"
            if not p.exists():
                self.err(g, f"docs/system/sub-systems/{organ}/AGENTS.md is missing — run emit")
                continue
            existing = p.read_text(encoding="utf-8")
            if organ_router(cfg, organ, o, existing) != existing:
                self.err(g, f"docs/system/sub-systems/{organ}/AGENTS.md auto-zone is stale — run emit")
        self.checked[g] = n

    # DG12 — canon link integrity. Canon cross-references with wiki-links (`[[path|label]]`),
    # which DG8 (records' markdown links) never sees (red-team RT-3: 168 links, 0 guards).
    def dg12_canon_links(self, g: str) -> None:
        n = 0
        for p in live_files(self.cfg):
            r = rel(p)
            if r.startswith("docs/system/core/"):
                continue  # records: DG8 owns their links
            n += 1
            text = p.read_text(encoding="utf-8")
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
            text = p.read_text(encoding="utf-8", errors="ignore")
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
            text = p.read_text(encoding="utf-8", errors="ignore")
            for m in pat.finditer(text):
                if m.group(0) not in known:
                    self.err(
                        g,
                        f"{here}: cites record `{m.group(0)}` which does not exist — author it "
                        f"or correct the citation",
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
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
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


def outbound_refs(text: str, base: Path) -> list[Path]:
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
    out: list[Path] = []
    for raw in raws:
        p = resolve_ref(raw, base)
        if p is not None and p not in out:
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
            text = p.read_text(encoding="utf-8", errors="ignore")
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
                "refs": outbound_refs(text, p.parent),
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
    edges = outbound_refs(text, target.parent)
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
        if target in outbound_refs(p.read_text(encoding="utf-8", errors="ignore"), p.parent):
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
    if not outbound_refs(body, d) and not args.allow_orphan:
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
    for field in args.field or []:
        key, _, value = field.partition("=")
        text = re.sub(rf"(?m)^{key}:.*$", f"{key}: {value}", text, count=1)
    text += f"\n<!-- {datetime.now(timezone.utc).date().isoformat()}: {args.reason} (recon {args.recon}) -->\n"
    target["path"].write_text(text, encoding="utf-8")
    append_ledger(
        cfg,
        {
            "action": "update",
            "target": args.id,
            "fields": args.field,
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
    print(f"arch validate — {len(org()['gates'])} gates configured\n")
    return Gate(cfg).run(args.gate)


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
    p.set_defaults(fn=cmd_validate)

    args = ap.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
