import re

with open('overnight_pipeline.py', 'r') as f:
    lines = f.readlines()

# Find the section where we parse the reference line
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    
    # After parsing the reference ID line, also check for URLs on that same line
    if 'ref_match.group(2).strip()' in line:
        # Insert URL extraction code right after citation parsing
        new_lines.append('''
            # Check for URLs on same line (new format)
            if 'PRIMARY_URL[' in line:
                match = re.search(r'PRIMARY_URL\\[([^\\]]+)\\]', line)
                if match:
                    current_ref['primary_url'] = match.group(1)
            if 'SECONDARY_URL[' in line:
                match = re.search(r'SECONDARY_URL\\[([^\\]]+)\\]', line)
                if match:
                    current_ref['secondary_url'] = match.group(1)
            if 'TERTIARY_URL[' in line:
                match = re.search(r'TERTIARY_URL\\[([^\\]]+)\\]', line)
                if match:
                    current_ref['tertiary_url'] = match.group(1)
''')

with open('overnight_pipeline.py', 'w') as f:
    f.writelines(new_lines)

print("✅ Fixed parser to check URLs on citation line")
