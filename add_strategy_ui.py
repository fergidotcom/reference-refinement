#!/usr/bin/env python3
"""
Add Strategy Indicator UI to v18.0
"""

# Read the HTML file
with open('rr_v18.0.html', 'r') as f:
    html = f.read()

# 1. Add CSS for strategy badge
css_insertion = '''        .toggle-switch input:checked + .toggle-slider {
            background-color: var(--accent-color);
        }'''

css_addition = '''        .toggle-switch input:checked + .toggle-slider {
            background-color: var(--accent-color);
        }

        /* v18.0: Strategy Badge */
        .strategy-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 0.5rem;
        }

        .strategy-badge.default {
            background: #3498db;
            color: white;
        }

        .strategy-badge.keywords {
            background: #f39c12;
            color: white;
        }

        .strategy-badge.plus-tier {
            background: #27ae60;
            color: white;
        }'''

html = html.replace(css_insertion, css_addition)

# 2. Add strategy display div after queries textarea
textarea_marker = '''                    <textarea id="editQueries" placeholder="Generated queries will appear here..." rows="5"></textarea>'''

textarea_with_indicator = '''                    <textarea id="editQueries" placeholder="Generated queries will appear here..." rows="5"></textarea>
                    <div id="strategyIndicator" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); display: none;">
                        <strong>Strategy:</strong> <span id="strategyName"></span>
                    </div>'''

html = html.replace(textarea_marker, textarea_with_indicator)

# 3. Update the query generation success callback to show strategy
success_marker = '''                        this.showToast('Queries generated', 'success');
                    }'''

success_with_indicator = '''                        this.showToast('Queries generated', 'success');

                        // v18.0: Show strategy indicator
                        if (this.lastStrategyUsed) {
                            const indicator = document.getElementById('strategyIndicator');
                            const strategyName = document.getElementById('strategyName');
                            if (indicator && strategyName) {
                                const strategyLabels = {
                                    'title_first_60_chars': '<span class="strategy-badge default">Title First 60</span> (Default)',
                                    'title_keywords_5_terms': '<span class="strategy-badge keywords">Title Keywords 5</span> (Manual Review)',
                                    'plus_best_2_from_tier_1': '<span class="strategy-badge plus-tier">Plus Best 2</span> (Edge Case)'
                                };
                                strategyName.innerHTML = strategyLabels[this.lastStrategyUsed] || this.lastStrategyUsed;
                                indicator.style.display = 'block';
                            }
                        }
                    }'''

html = html.replace(success_marker, success_with_indicator)

# Write back
with open('rr_v18.0.html', 'w') as f:
    f.write(html)

print("✅ Successfully added strategy indicator UI")
print("   - Added CSS for strategy badges")
print("   - Added strategy display div")
print("   - Updated success callback to show strategy")
