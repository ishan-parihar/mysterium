#!/usr/bin/env python3
"""
Rebuild malformed module-spec.md files (concatenated scoring+shadow-diagnostics)
into the proper 7-section template by extracting content from each half.

The concatenated files have structure:
  HALF 1 (from scoring.md): title, capacity definition, scoring architecture, 
    drive-health, shadow summary, modality affinity, cross-validation
  HALF 2 (from shadow-diagnostics.md): shadow archetypes, surfacing sequence,
    healing architecture, compound loops, detection methodology, integration criteria

We extract and reorganize into:
  §1 Capacity Definition
  §2 Shadow Archetypes  
  §3 Drive-Health Landscape
  §4 Healing Vectors
  §5 Scoring Parameters
  §6 Compound Shadows & Cross-Module
  §7 Shadow Surfacing Sequence
"""
# @script-status: historical — repaired the malformed concatenated module-spec files produced by
#                              `make_module_specs.py`; that repair is complete and the malformed
#                              inputs no longer exist. It rewrites module-spec.md wholesale from a
#                              hardcoded absolute path (/home/ishanp/...) and would destroy the
#                              current specs if run. Destructive: do not run.
import re

BASE = "/home/ishanp/Documents/GitHub/MY-PROJECTS/Mysterium/docs/concept-drafts"

def extract_section(content, heading_pattern):
    """Extract content of a section matching heading_pattern until next ## heading."""
    lines = content.split('\n')
    result = []
    in_section = False
    for line in lines:
        if re.match(r'^## ', line):
            if in_section:
                break
            if re.search(heading_pattern, line, re.IGNORECASE):
                in_section = True
                continue  # skip the heading itself
        elif in_section:
            result.append(line)
    return '\n'.join(result).strip()

def extract_all_sections(content):
    """Extract all ## sections as dict of {heading: content}."""
    lines = content.split('\n')
    sections = {}
    current_heading = None
    current_lines = []
    
    for line in lines:
        m = re.match(r'^## (.+)', line)
        if m:
            if current_heading:
                sections[current_heading] = '\n'.join(current_lines).strip()
            current_heading = m.group(1).strip()
            current_lines = []
        elif current_heading is not None:
            current_lines.append(line)
    
    if current_heading:
        sections[current_heading] = '\n'.join(current_lines).strip()
    
    return sections

def get_header(content):
    """Extract the title and blockquote header."""
    lines = content.split('\n')
    result = []
    for line in lines:
        if line.startswith('## '):
            break
        result.append(line)
    # Remove trailing blank lines and separator
    while result and result[-1].strip() in ('', '---'):
        result.pop()
    return '\n'.join(result).strip()

def rebuild_module_spec(filepath):
    with open(filepath) as f:
        content = f.read()
    
    # Check if already properly structured (7 sections)
    sections = extract_all_sections(content)
    if len(sections) <= 8:
        print(f"  SKIP (already {len(sections)} sections): {filepath}")
        return
    
    # Get the header (title + blockquote)
    header = get_header(content)
    
    # Find the split point between scoring half and shadow half
    # The shadow half starts with a new title heading (# Line / Stage — Shadow...)
    # or with "## 1. The Four Shadow Archetypes"
    parts = re.split(r'\n---\n\n>', content, maxsplit=1)
    if len(parts) == 2:
        scoring_half = parts[0]
        shadow_half = '>' + parts[1]
    else:
        # Try splitting on duplicate ## 1. heading
        idx = content.find('\n## 1.', content.find('\n## 1.') + 10)
        if idx > 0:
            scoring_half = content[:idx]
            shadow_half = content[idx:]
        else:
            print(f"  CANNOT SPLIT: {filepath}")
            return
    
    scoring_sections = extract_all_sections(scoring_half)
    shadow_sections = extract_all_sections(shadow_half)
    
    # --- Build §1: Capacity Definition ---
    cap_def = ''
    for k, v in scoring_sections.items():
        if re.search(r'capacity.definition|capacity.scoring|what.this.module', k, re.I):
            cap_def = v
            break
    if not cap_def:
        # Take first section from scoring half
        cap_def = list(scoring_sections.values())[0] if scoring_sections else ''
    
    # --- Build §2: Shadow Archetypes ---
    shadow_arch = ''
    for k, v in shadow_sections.items():
        if re.search(r'four.shadow|shadow.archetype', k, re.I):
            shadow_arch = v
            break
    if not shadow_arch:
        for k, v in scoring_sections.items():
            if re.search(r'shadow.summary|shadow.archetype', k, re.I):
                shadow_arch = v
                break
    
    # --- Build §3: Drive-Health Landscape ---
    drive_health = ''
    for k, v in scoring_sections.items():
        if re.search(r'drive.health|drive.integration', k, re.I):
            drive_health = v
            break
    
    # --- Build §4: Healing Vectors ---
    healing = ''
    for k, v in shadow_sections.items():
        if re.search(r'healing|heal.evolve|vector', k, re.I):
            healing = v
            break
    
    # --- Build §5: Scoring Parameters ---
    scoring_params = ''
    for k, v in scoring_sections.items():
        if re.search(r'scoring.arch|theta|composite|stage.transition|decay', k, re.I):
            scoring_params = v
            break
    
    # --- Build §6: Compound Shadows ---
    compounds = ''
    for k, v in shadow_sections.items():
        if re.search(r'compound|bidirectional|cross.module|loop', k, re.I):
            compounds = v
            break
    if not compounds:
        for k, v in scoring_sections.items():
            if re.search(r'compound|cross.module', k, re.I):
                compounds = v
                break
    
    # --- Build §7: Shadow Surfacing Sequence ---
    surfacing = ''
    for k, v in shadow_sections.items():
        if re.search(r'surfacing|sequence|detection|integration.criteria', k, re.I):
            surfacing = v
            break
    # Also grab cross-validation from scoring half
    cross_val = ''
    for k, v in scoring_sections.items():
        if re.search(r'cross.valid|modality.affin', k, re.I):
            cross_val = v
            break
    if cross_val and surfacing:
        surfacing = surfacing + '\n\n### Cross-Validation Rules\n' + cross_val
    elif cross_val:
        surfacing = cross_val
    
    # Also grab integration criteria from shadow half
    integration = ''
    for k, v in shadow_sections.items():
        if re.search(r'integration.criteria|what.*healed', k, re.I):
            integration = v
            break
    if integration:
        healing = healing + '\n\n### Integration Criteria\n' + integration
    
    # Build the new file
    output = f"""{header}

---

## 1. Capacity Definition

{cap_def}

---

## 2. Shadow Archetypes

{shadow_arch}

---

## 3. Drive-Health Landscape

{drive_health}

---

## 4. Healing Vectors

{healing}

---

## 5. Scoring Parameters

{scoring_params}

---

## 6. Compound Shadows & Cross-Module Relationships

{compounds}

---

## 7. Shadow Surfacing Sequence

{surfacing}
"""
    
    with open(filepath, 'w') as f:
        f.write(output)
    
    new_sections = extract_all_sections(output)
    print(f"  Rebuilt: {len(new_sections)} sections, {len(output.split(chr(10)))} lines")


if __name__ == "__main__":
    for line_dir in sorted(os.listdir(BASE)):
        line_path = os.path.join(BASE, line_dir)
        if not os.path.isdir(line_path) or line_dir.startswith('.'):
            continue
        for stage_dir in sorted(os.listdir(line_path)):
            stage_path = os.path.join(line_path, stage_dir)
            spec = os.path.join(stage_path, "module-spec.md")
            if os.path.exists(spec):
                sections = extract_all_sections(open(spec).read())
                if len(sections) > 8:
                    print(f"\n{line_dir}/{stage_dir}:")
                    rebuild_module_spec(spec)
    print("\nDone.")
