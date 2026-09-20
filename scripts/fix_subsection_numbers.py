#!/usr/bin/env python3
"""
Renumber ### subsections so they match their parent ## section number.
E.g., ### 1.1 inside ## 2. Shadow Archetypes → ### 2.1
"""
# @script-status: historical — a corpus-wide renumbering for the retired template. It rewrites
#                              heading numbers in docs/concept-drafts/ in place, and the corpus was
#                              already renumbered by hand into its current SCORING-ARCHITECTURE
#                              shape. Running it now would renumber current headings against the old
#                              section semantics. Destructive: do not run.

BASE = "docs/concept-drafts"

def fix_subsections(filepath):
    with open(filepath) as f:
        lines = f.readlines()
    
    current_section = 0
    new_lines = []
    changed = 0
    
    for line in lines:
        m2 = re.match(r'^## (\d+)\.', line)
        if m2:
            current_section = int(m2.group(1))
            new_lines.append(line)
            continue
        
        m3 = re.match(r'^(### )(\d+)\.(\d+)(.*)', line)
        if m3 and current_section > 0:
            prefix, old_parent, sub, rest = m3.groups()
            old_parent = int(old_parent)
            sub = int(sub)
            if old_parent != current_section:
                new_line = f"{prefix}{current_section}.{sub}{rest}\n"
                new_lines.append(new_line)
                changed += 1
                continue
        
        new_lines.append(line)
    
    if changed:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
    
    return changed

total = 0
for line_dir in sorted(os.listdir(BASE)):
    lp = os.path.join(BASE, line_dir)
    if not os.path.isdir(lp) or line_dir.startswith('.'): continue
    for stage_dir in sorted(os.listdir(lp)):
        spec = os.path.join(lp, stage_dir, "module-spec.md")
        if not os.path.exists(spec): continue
        n = fix_subsections(spec)
        if n:
            print(f"  {line_dir}/{stage_dir}: {n} subsections renumbered")
            total += n

print(f"\nTotal fixes: {total}")
