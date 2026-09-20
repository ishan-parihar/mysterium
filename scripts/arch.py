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
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.problems: list[str] = []
        self.checked: dict[str, int] = {}

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
            # Records and the transmutation plan *document* authority violations: exempt.
            if r.startswith("docs/system/core/") or r == "docs/ARCHITECTURE-TRANSMUTATION-PLAN.md":
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
        self.checked[g] = n

    # DG10 — canon↔code: every code artifact cited by a record exists
    def dg10_canon_code(self, g: str) -> None:
        n = 0
        for r in records(self.cfg):
            n += 1
            for path in re.findall(r"`((?:src|tests|scripts)/[A-Za-z0-9_./-]+)`", r["text"]):
                if not (ROOT / path).exists():
                    self.err(g, f"{r['rel']}: cited code artifact `{path}` does not exist")
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
        r"(?<![\w/`])((?:docs/)?(?:foundations|system|stages|lines|progression|narrative|concept-drafts)/[A-Za-z0-9_./-]+)",
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


def cmd_search(args: argparse.Namespace) -> int:
    """Keyword search over the LIVE knowledge-base: canon, organs, records, corpus.

    The specification's *keyword -> docs + references* step (audit UT-2). AND across terms, ranked by
    body frequency, title match, then heading match; every hit reports where it lives and what it
    references, so a hit is a starting point rather than a dead end.
    """
    cfg = org()
    terms = [t for t in re.split(r"\s+", (args.keyword or "").strip().lower()) if t]
    if not terms:
        fail("search needs at least one term")
    hits: list[dict] = []
    for p in live_files(cfg):
        text = p.read_text(encoding="utf-8", errors="ignore")
        low = text.lower()
        if not all(t in low for t in terms):
            continue
        fm = frontmatter(text) if text.startswith("---") else {}
        title = str(fm.get("Title") or doc_title(p))
        headings = re.findall(r"^#{1,6} (.+)$", text, re.M)
        score = sum(low.count(t) for t in terms)
        score += 8 * sum(1 for t in terms if t in title.lower())
        score += 4 * sum(1 for t in terms if any(t in h.lower() for h in headings))
        lines: list[tuple[int, str]] = []
        for i, line in enumerate(text.splitlines(), 1):
            if any(t in line.lower() for t in terms):
                lines.append((i, " ".join(line.split())[:140]))
                if len(lines) >= args.lines:
                    break
        rung, organ = where_is(cfg, rel(p))
        hits.append(
            {
                "score": score,
                "path": rel(p),
                "rung": rung,
                "organ": organ,
                "title": title,
                "lines": [{"n": i, "text": s} for i, s in lines],
                "refs": [rel(q) for q in outbound_refs(text, p.parent)],
            }
        )
    hits.sort(key=lambda h: (-h["score"], h["path"]))
    if args.json:
        print(json.dumps({"keyword": args.keyword, "count": len(hits), "hits": hits[: args.limit]}, indent=2))
        return 0 if hits else 1
    if not hits:
        print(f"no live document matches {terms}")
        return 1
    print(f"search {terms} — {len(hits)} hit(s)\n")
    for h in hits[: args.limit]:
        where = f"  [{h['organ']}]" if h["organ"] else ""
        print(f"{h['path']}{where}  (score {h['score']})")
        print(f"  {h['title']}")
        for line in h["lines"]:
            print(f"  {line['n']}: {line['text']}")
        if h["refs"]:
            tail = " …" if len(h["refs"]) > 6 else ""
            print(f"  -> refs: {', '.join(h['refs'][:6])}{tail}")
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
