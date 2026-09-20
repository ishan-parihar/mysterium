#!/usr/bin/env python3
"""
For each module that has scoring.md + shadow-diagnostics.md but no module-spec.md:
- Create module-spec.md by concatenating them with a clean header
- Delete scoring.md and shadow-diagnostics.md
"""
# @script-status: historical — the retirement tool for the split `scoring.md` +
#                              `shadow-diagnostics.md` template. Every module now has a
#                              `module-spec.md` and the two source files are gone, so its own
#                              precondition is unreachable — but if it ever ran it would COPY those
#                              files into module-spec.md and DELETE them, shredding the authored
#                              spec. Destructive: do not run.
import re

BASE = "/home/ishanp/Documents/GitHub/MY-PROJECTS/Mysterium/docs/concept-drafts"

def make_module_spec(module_dir):
    scoring_path = os.path.join(module_dir, "scoring.md")
    shadow_path = os.path.join(module_dir, "shadow-diagnostics.md")
    spec_path = os.path.join(module_dir, "module-spec.md")

    if os.path.exists(spec_path):
        print(f"  SKIP (already exists): {spec_path}")
        return

    if not os.path.exists(scoring_path) or not os.path.exists(shadow_path):
        print(f"  SKIP (missing source files): {module_dir}")
        return

    with open(scoring_path) as f:
        scoring = f.read().strip()
    with open(shadow_path) as f:
        shadow = f.read().strip()

    # Extract the module title from scoring.md first heading
    title_match = re.match(r'^# (.+)', scoring)
    title = title_match.group(1) if title_match else os.path.basename(module_dir)

    # Build module-spec: replace scoring.md title with "Module Specification"
    # and append shadow-diagnostics content (minus its own title heading)
    scoring_body = re.sub(r'^# .+\n', f'# {title.replace("— Scoring", "— Module Specification").replace("— Shadow Diagnostics", "— Module Specification")}\n', scoring, count=1)
    
    # Remove the title line from shadow-diagnostics and append
    shadow_body = re.sub(r'^# .+\n', '', shadow, count=1).strip()

    combined = scoring_body + "\n\n---\n\n" + shadow_body + "\n"

    with open(spec_path, 'w') as f:
        f.write(combined)

    # Delete old files
    os.remove(scoring_path)
    os.remove(shadow_path)

    lines = len(combined.split('\n'))
    print(f"  Created module-spec.md ({lines} lines), deleted scoring.md + shadow-diagnostics.md")


if __name__ == "__main__":
    processed = 0
    for line_dir in sorted(os.listdir(BASE)):
        line_path = os.path.join(BASE, line_dir)
        if not os.path.isdir(line_path) or line_dir.startswith('.'):
            continue
        for stage_dir in sorted(os.listdir(line_path)):
            stage_path = os.path.join(line_path, stage_dir)
            if not os.path.isdir(stage_path):
                continue
            scoring = os.path.join(stage_path, "scoring.md")
            shadow = os.path.join(stage_path, "shadow-diagnostics.md")
            if os.path.exists(scoring) or os.path.exists(shadow):
                print(f"\n{line_dir}/{stage_dir}:")
                make_module_spec(stage_path)
                processed += 1

    print(f"\nProcessed {processed} modules.")
