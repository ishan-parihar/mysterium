#!/usr/bin/env python3
"""
Strip old 9-section game concept files to new 5-section template.
Keeps: header quote, §1 Game Identity, §2→Catalyst Delivery, §6→Game Design, §7→Item Pool, §9→Technical Requirements
Removes: §3 Drive Probing, §4 Shadow Surfacing, §5 Healing/Evolution, §8 Scoring Rubric
"""
# @script-status: historical — converted the corpus from the 9-section to the 5-section game-file
#                              template; that conversion is complete. It DELETES sections from every
#                              game file it matches, and its target template is itself superseded by
#                              the current concept-draft template in docs/concept-drafts/README.md,
#                              so running it would strip live content. Destructive: do not run.
import re
import sys

GAME_FILES = [
    "deterministic.md",
    "language-reflective.md",
    "scenario-choice.md",
    "embodied-somatic.md",
    "strategic-planning.md",
    "social-cooperative.md",
    "immersive-rpg.md",
]

# Section headings to KEEP (by their number in the old template)
KEEP_SECTIONS = {
    "1": "1",   # Game Identity → stays §1
    "2": "2",   # Catalyst Flow → becomes §2 Catalyst Delivery
    "6": "3",   # Game Design → becomes §3
    "7": "4",   # Item Pool → becomes §4
    "9": "5",   # Technical Requirements → becomes §5
}

# Section headings to DROP
DROP_SECTIONS = {"3", "4", "5", "8"}

def strip_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    output = []
    current_section = None
    skip = False
    in_header = True  # lines before first ## section

    for line in lines:
        # Detect section headers (## N. Title)
        m = re.match(r'^## (\d+)\. (.+)', line)
        if m:
            in_header = False
            num = m.group(1)
            title = m.group(2)
            if num in DROP_SECTIONS:
                skip = True
                current_section = num
                continue
            elif num in KEEP_SECTIONS:
                skip = False
                new_num = KEEP_SECTIONS[num]
                # Rename section 2 to "Catalyst Delivery"
                if num == "2":
                    title = "Catalyst Delivery"
                # Renumber
                output.append(f"## {new_num}. {title}")
                current_section = num
                continue
            else:
                # Unknown section number — keep as-is
                skip = False
                output.append(line)
                continue
        
        if skip:
            continue
        
        output.append(line)

    # Clean up: remove excessive blank lines (max 2 consecutive)
    cleaned = []
    blank_count = 0
    for line in output:
        if line.strip() == '':
            blank_count += 1
            if blank_count <= 2:
                cleaned.append(line)
        else:
            blank_count = 0
            cleaned.append(line)

    # Remove trailing blank lines
    while cleaned and cleaned[-1].strip() == '':
        cleaned.pop()

    result = '\n'.join(cleaned) + '\n'
    
    with open(filepath, 'w') as f:
        f.write(result)
    
    return len(result.split('\n'))


def process_module(module_dir):
    results = []
    for fname in GAME_FILES:
        fpath = os.path.join(module_dir, fname)
        if os.path.exists(fpath):
            lines = strip_file(fpath)
            results.append(f"  {fname}: {lines} lines")
        else:
            results.append(f"  {fname}: NOT FOUND")
    return results


if __name__ == "__main__":
    base = "/home/ishanp/Documents/GitHub/MY-PROJECTS/Mysterium/docs/concept-drafts"
    
    # Find all modules that still have old-format files (have scoring.md OR have large game files)
    modules_to_process = []
    for line_dir in sorted(os.listdir(base)):
        line_path = os.path.join(base, line_dir)
        if not os.path.isdir(line_path) or line_dir.startswith('.') or line_dir in ('README.md', 'ROADMAP.md'):
            continue
        for stage_dir in sorted(os.listdir(line_path)):
            stage_path = os.path.join(line_path, stage_dir)
            if not os.path.isdir(stage_path):
                continue
            # Check if any game file is still in old format (>120 lines = has old sections)
            for fname in GAME_FILES:
                fpath = os.path.join(stage_path, fname)
                if os.path.exists(fpath):
                    with open(fpath) as f:
                        lcount = sum(1 for _ in f)
                    if lcount > 120:  # old format
                        modules_to_process.append(stage_path)
                        break
    
    print(f"Modules to process: {len(modules_to_process)}")
    for mod in modules_to_process:
        print(f"\nProcessing: {mod}")
        results = process_module(mod)
        for r in results:
            print(r)
    
    print("\nDone.")
