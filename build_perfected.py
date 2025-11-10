#!/usr/bin/env python3
"""
Build PERFECTED_decisions.txt by inserting instance references after their parents.
"""

import json

# Load instance data
with open('phase4_search_plan.json', 'r') as f:
    data = json.load(f)
    instances = data['instances']

# Create instance lookup by parent RID
instances_by_parent = {}
for inst in instances:
    parent = inst['parent_rid']
    if parent not in instances_by_parent:
        instances_by_parent[parent] = []
    instances_by_parent[parent].append(inst)

# Define unique secondary URLs for each instance
secondary_urls = {
    '102.1': 'https://www.journals.uchicago.edu/doi/10.1111/1468-2508.t01-1-00015',
    '103.1': 'https://daily.jstor.org/ronald-reagan-the-first-reality-tv-star-president/',
    '200.1': 'https://www.mdpi.com/2624-8611/5/4/71',
    '205.1': 'https://www.generation-online.org/other/stieglerreview.htm',
    '211.1': 'https://sites.socsci.uci.edu/~bskyrms/bio/readings/tversky_k_heuristics_biases.pdf',
    '322.1': 'https://dl.acm.org/doi/10.1145/2433396.2433479',
    '511.1': 'https://www.in-mind.org/article/intergroup-contact-theory-past-present-and-future',
    '623.1': 'https://www.pewresearch.org/journalism/fact-sheet/cable-news/',
    '624.1': 'https://www.hollywoodreporter.com/business/business-news/msnbc-fox-cnn-cable-news-future-1236127677/',
    '629.1': 'https://www.everycrsreport.com/reports/R41458.html',
    '714.1': 'https://www.mindfulnessinschools.org/about/'
}

# Secondary URL descriptions (for relevance context)
secondary_descriptions = {
    '102.1': 'University of Chicago Journal of Politics scholarly article analyzing television images\' impact on debate evaluations',
    '103.1': 'JSTOR Daily analysis of Reagan as first reality TV star president',
    '200.1': 'MDPI scholarly article on System 1 vs System 2 thinking in cognitive biases',
    '205.1': 'Scholarly review of Stiegler\'s critique of attention economy',
    '211.1': 'UCI educational resource - original Tversky & Kahneman paper on heuristics',
    '322.1': 'ACM Digital Library proceedings on social network information evolution',
    '511.1': 'In-Mind scholarly article on intergroup contact theory past, present, and future',
    '623.1': 'Pew Research Center comprehensive cable news industry fact sheet',
    '624.1': 'Hollywood Reporter business analysis of cable news networks\' existential crisis',
    '629.1': 'Congressional Research Service report on broadcast television economics',
    '714.1': 'Mindfulness in Schools Project - UK educational mindfulness implementation'
}

def format_instance_entry(inst, secondary_url, description):
    """Format an instance reference entry."""
    ref_id = inst['reference_id']
    parent_rid = inst['parent_rid']
    bib_info = inst['bibInfo']
    primary_url = inst['parentPrimaryUrl']
    relevance = inst['relevance']
    context = inst['manuscript_context']
    purpose = inst['context_purpose']

    # Format as multi-line entry for readability
    entry = f"""[{ref_id}] *INSTANCE REFERENCE - REQUIRES REVIEW*
Parent RID: [{parent_rid}]
Bibliographic: {bib_info}
Relevance: {relevance}
Context Purpose: {purpose}
Manuscript Context: {context}
FLAGS[BATCH_v17.0 WEB_CREATED INSTANCE]
PRIMARY_URL[{primary_url}]
SECONDARY_URL[{secondary_url}]
SECONDARY_DESCRIPTION[{description}]
"""
    return entry

# Read original decisions file
with open('caught_in_the_act_decisions.txt', 'r') as f:
    parent_lines = f.readlines()

# Build output
output_lines = []
for line in parent_lines:
    # Add the parent line
    output_lines.append(line)

    # Check if this parent has instances
    # Extract RID from line like "[102] ..."
    if line.startswith('['):
        try:
            rid = line.split(']')[0][1:]  # Extract number between [ ]
            if rid in instances_by_parent:
                # Add all instances for this parent
                for inst in instances_by_parent[rid]:
                    ref_id = inst['reference_id']
                    sec_url = secondary_urls.get(ref_id, 'MISSING')
                    sec_desc = secondary_descriptions.get(ref_id, 'MISSING')
                    instance_entry = format_instance_entry(inst, sec_url, sec_desc)
                    output_lines.append(instance_entry)
        except:
            pass  # Skip malformed lines

# Write output
with open('PERFECTED_decisions.txt', 'w') as f:
    f.writelines(output_lines)

print(f"✅ Created PERFECTED_decisions.txt")
print(f"   - Parent references: {len(parent_lines)}")
print(f"   - Instance references: {len(instances)}")
print(f"   - Total entries: {len(parent_lines) + len(instances)}")
