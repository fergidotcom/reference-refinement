import re

# Read the file
with open('overnight_pipeline.py', 'r') as f:
    content = f.read()

# Find and replace the URL parsing section
old_section = '''        # Parse URLs
        if line.startswith('Primary URL:'):
            current_ref['primary_url'] = line.replace('Primary URL:', '').strip()
        elif line.startswith('Secondary URL:'):
            current_ref['secondary_url'] = line.replace('Secondary URL:', '').strip()
        elif line.startswith('Tertiary URL:'):
            current_ref['tertiary_url'] = line.replace('Tertiary URL:', '').strip()'''

new_section = '''        # Parse URLs (both formats)
        if line.startswith('Primary URL:'):
            current_ref['primary_url'] = line.replace('Primary URL:', '').strip()
        elif line.startswith('Secondary URL:'):
            current_ref['secondary_url'] = line.replace('Secondary URL:', '').strip()
        elif line.startswith('Tertiary URL:'):
            current_ref['tertiary_url'] = line.replace('Tertiary URL:', '').strip()
        elif 'PRIMARY_URL[' in line:
            match = re.search(r'PRIMARY_URL\\[([^\\]]+)\\]', line)
            if match:
                current_ref['primary_url'] = match.group(1)
        elif 'SECONDARY_URL[' in line:
            match = re.search(r'SECONDARY_URL\\[([^\\]]+)\\]', line)
            if match:
                current_ref['secondary_url'] = match.group(1)
        elif 'TERTIARY_URL[' in line:
            match = re.search(r'TERTIARY_URL\\[([^\\]]+)\\]', line)
            if match:
                current_ref['tertiary_url'] = match.group(1)'''

content = content.replace(old_section, new_section)

# Also fix the division by zero
content = content.replace(
    '''    logger.log(f"  Accessible: {results['accessible']} ({results['accessible']/results['total_urls']*100:.1f}%)")''',
    '''    if results['total_urls'] > 0:
        logger.log(f"  Accessible: {results['accessible']} ({results['accessible']/results['total_urls']*100:.1f}%)")
    else:
        logger.log("  ⚠️ No URLs found!")'''
)

# Write back
with open('overnight_pipeline.py', 'w') as f:
    f.write(content)

print("✅ Applied fixes")
