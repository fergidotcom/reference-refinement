#!/usr/bin/env python3
"""
Inject v18.0 Query Evolution code into rr_v18.0.html
"""

# Read the v18_query_evolution.js code
with open('v18_query_evolution.js', 'r') as f:
    query_evolution_code = f.read()

# Read the HTML file
with open('rr_v18.0.html', 'r') as f:
    html = f.read()

# Find the insertion point (before generateQueries function)
# Look for the line: async generateQueries() {
insertion_marker = '            async generateQueries() {'
insertion_index = html.find(insertion_marker)

if insertion_index == -1:
    print("ERROR: Could not find insertion point")
    exit(1)

# Insert the new code before generateQueries
# Add proper indentation (12 spaces to match the class methods)
indented_code = '\n'.join(['            ' + line if line.strip() else line
                            for line in query_evolution_code.split('\n')])

# Create new HTML with injected code
new_html = (html[:insertion_index] +
            '\n            // ===== v18.0: Query Evolution Algorithms =====\n' +
            indented_code + '\n\n' +
            html[insertion_index:])

# Write back
with open('rr_v18.0.html', 'w') as f:
    f.write(new_html)

print("✅ Successfully injected v18.0 Query Evolution code")
print(f"   Inserted {len(indented_code)} characters of code")
print(f"   New file size: {len(new_html)} bytes")
