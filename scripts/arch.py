#!/usr/bin/env python3
"""arch — the Mysterium architecture-record CLI (project-local).

The single write path for architecture records (AD = decision, RG = regression
guard) and the single validator for the documentation rungs. This is the
Mysterium-local adaptation of the `architecture-discipline` governance pattern:
nothing here reaches outside this repository.

Specification + rationale: docs/ARCHITECTURE-TRANSMUTATION-PLAN.md
Vocabulary + ownership:     docs/foundations/44-system-ontology-and-vocabulary.md
Structure declaration:      _org.yaml

    python3 scripts/arch.py route <path>                 resolve a path to its rung/organ
    python3 scripts/arch.py recon <keyword>              coverage report before creating a record
    python3 scripts/arch.py new --type ad|rg --title T --desc D --organ O --body F --recon R
    python3 scripts/arch.py update <ID> --field Status=Superseded --reason R --recon I
    python3 scripts/arch.py log --action A --target T --reason R
    python3 scripts/arch.py emit                         regenerate docs/INDEX.md
    python3 scripts/arch.py validate [--gate DG5]        run the doc-governance gates

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
    out: list[Path] = []
    for d in live_roots(cfg):
        out.extend(sorted(d.rglob("*.md")))
    plans = cfg["rungs"]["plans"]
    for f in plans.get("files", []):
        p = ROOT / f
        if p.is_file():
            out.append(p)
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


# ─────────────────────────────────────────────────────────────────────────────
# Gates (DG1–DG10)
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
        ]
        for name, fn in gates:
            if only and name != only:
                continue
            if not self.cfg["gates"].get(f"{name.lower()}_{name.lower()}", {}).get("enabled", True):
                # config keys are dgN_<slug>; absence of an explicit disabled flag = enabled
                pass
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
        retired: set[str] = set()
        if ledger_path.exists():
            for line in ledger_path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                    continue
                try:
                    ev = json.loads(line)
                except json.JSONDecodeError:
                    self.err(g, f"ledger line is not JSON: {line[:60]}")
                    continue
                if ev.get("action") == "create" and ev.get("target"):
                    retired.add(ev["target"])
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
    for organ, o in cfg["organs"].items():
        if f"docs/system/sub-systems/{organ}/" in r:
            print(f"rung:   system\norgan:  {organ}\ncontract: {o.get('contract_docs')}\ncode:   {o.get('code')}")
            return 0
    print(f"rung:   (unclaimed)\n{cfg['project']['name']}: this path is not declared in _org.yaml")
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
        AUTO_END,
    ]
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
            (d / sub).mkdir(parents=True, exist_ok=True)
        p = d / "AGENTS.md"
        existing = p.read_text(encoding="utf-8") if p.exists() else None
        p.write_text(organ_router(cfg, organ, o, existing), encoding="utf-8")
        n += 1
    return n


def cmd_emit(args: argparse.Namespace) -> int:
    cfg = org()
    organs_written = emit_organ_routers(cfg)
    print(f"wrote {organs_written} organ routers under docs/system/sub-systems/")
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
    for name, rung in cfg["rungs"].items():
        paths = [d["path"] for d in rung.get("dirs", [])] or [", ".join(rung.get("files", []))]
        lines.append(
            f"| `{name}` | {'<br>'.join('`' + p + '`' for p in paths)} | "
            f"{'yes' if rung.get('live') else 'no'} | `{rung.get('authority', '—')}` |"
        )
    lines += ["", "## Organs", "", "| Organ | Architecture doc | Code it describes |", "|---|---|---|"]
    for organ, o in cfg["organs"].items():
        doc = f"`docs/system/sub-systems/{organ}/AGENTS.md`"
        lines.append(
            f"| `{organ}` | {doc} | {', '.join('`' + c + '`' for c in o.get('code', []))} |"
        )
    recs = records(cfg)
    lines += ["", f"## Records ({len(recs)})", "", "| ID | Status | Title |", "|---|---|---|"]
    rows = []
    for r in recs:
        fm = frontmatter(r["text"])
        rows.append(f"| `{fm.get('ID')}` | {fm.get('Status')} | {fm.get('Title')} |")
    lines += rows or ["| — | — | *(none yet)* |"]
    out = ROOT / "docs" / "INDEX.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {rel(out)} ({len(recs)} records, {len(cfg['organs'])} organs)")
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
