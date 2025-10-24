#!/bin/bash
#
# Master Workflow Script for Reference Refinement System Log Analysis
#
# Automates the complete analysis pipeline:
# 1. Parse debug log → JSON
# 2. Analyze overrides → insights
# 3. Compare with previous batches (if available)
# 4. Generate recommendations
#
# Usage:
#   ./run_analysis.sh <debug_log_file.txt> [batch_name]
#
# Example:
#   ./run_analysis.sh ~/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/debug_logs/session_*.txt batch1
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <debug_log_file.txt> [batch_name]"
    echo ""
    echo "Example:"
    echo "  $0 session_2025-10-23T22-56-34.txt batch1"
    echo ""
    exit 1
fi

DEBUG_LOG="$1"
BATCH_NAME="${2:-batch_$(date +%Y%m%d_%H%M%S)}"

# Verify debug log exists
if [ ! -f "$DEBUG_LOG" ]; then
    echo -e "${RED}Error: Debug log file not found: $DEBUG_LOG${NC}"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Reference Refinement System Log Analysis Pipeline${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Debug Log: ${GREEN}$DEBUG_LOG${NC}"
echo -e "Batch Name: ${GREEN}$BATCH_NAME${NC}"
echo ""

# Step 1: Parse debug log
echo -e "${YELLOW}[1/4] Parsing debug log...${NC}"
PARSED_JSON="${BATCH_NAME}_parsed.json"

python3 parse_debug_log.py "$DEBUG_LOG" "$PARSED_JSON"

if [ ! -f "$PARSED_JSON" ]; then
    echo -e "${RED}Error: Parsing failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Parsed successfully${NC}"
echo ""

# Step 1.5: Archive finalized references
echo -e "${YELLOW}[1.5/5] Archiving finalized references...${NC}"
python3 archive_finalized.py "$PARSED_JSON"
echo -e "${GREEN}✓ Archive updated${NC}"
echo ""

# Step 2: Analyze overrides
echo -e "${YELLOW}[2/5] Analyzing override patterns...${NC}"
python3 analyze_overrides.py "$PARSED_JSON"

ANALYSIS_JSON="${BATCH_NAME}_parsed_analysis.json"
if [ ! -f "$ANALYSIS_JSON" ]; then
    echo -e "${RED}Error: Analysis failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Analysis complete${NC}"
echo ""

# Step 2.5: Learning pattern analysis
echo -e "${YELLOW}[3/5] Analyzing learning patterns...${NC}"
python3 analyze_learning_patterns.py "$PARSED_JSON"

LEARNING_JSON="${BATCH_NAME}_parsed_learning_analysis.json"
if [ ! -f "$LEARNING_JSON" ]; then
    echo -e "${RED}Error: Learning analysis failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Learning analysis complete${NC}"
echo ""

# Step 3: Compare with previous batches (if they exist)
echo -e "${YELLOW}[4/5] Comparing with previous batches...${NC}"

# Find all previous analysis files
PREV_ANALYSES=$(ls -1 *_parsed_analysis.json 2>/dev/null | grep -v "^${BATCH_NAME}_" | sort || true)

if [ -z "$PREV_ANALYSES" ]; then
    echo -e "${BLUE}No previous batches found. Skipping comparison.${NC}"
else
    BATCH_COUNT=$(echo "$PREV_ANALYSES" | wc -l | tr -d ' ')
    echo -e "${BLUE}Found $BATCH_COUNT previous batch(es)${NC}"

    # Build comparison command with all batches
    COMPARE_CMD="python3 compare_batches.py"
    for prev in $PREV_ANALYSES; do
        COMPARE_CMD="$COMPARE_CMD $prev"
    done
    COMPARE_CMD="$COMPARE_CMD $ANALYSIS_JSON"

    $COMPARE_CMD
    echo -e "${GREEN}✓ Comparison complete${NC}"
fi
echo ""

# Step 4: Generate summary report
echo -e "${YELLOW}[5/5] Generating summary report...${NC}"

REPORT_FILE="${BATCH_NAME}_report.md"

cat > "$REPORT_FILE" << EOF
# System Log Analysis Report: ${BATCH_NAME}

**Generated:** $(date)
**Debug Log:** $(basename "$DEBUG_LOG")

---

## Quick Summary

EOF

# Extract key metrics from analysis JSON
python3 << PYTHON_SCRIPT >> "$REPORT_FILE"
import json
with open('$ANALYSIS_JSON', 'r') as f:
    data = json.load(f)

summary = data.get('summary', {})
override_patterns = data.get('override_patterns', {})
query_eff = data.get('query_effectiveness', {})

print(f"- **Total References:** {summary.get('total_references', 0)}")
print(f"- **Finalized:** {summary.get('finalized', 0)} ({summary.get('finalization_rate', 0):.1f}%)")
print(f"- **Override Rate:** {summary.get('override_rate', 0):.1f}%")
print(f"- **Unique Queries:** {query_eff.get('total_unique_queries', 0)}")
print(f"- **Winning Queries:** {len(query_eff.get('winning_queries', []))}")
print()

# Status
override_rate = summary.get('override_rate', 100)
if override_rate < 30:
    print("**Status:** ✅ READY FOR AUTOMATION")
elif override_rate < 50:
    print("**Status:** ◐ GOOD PROGRESS - Continue refinement")
elif override_rate < 80:
    print("**Status:** ○ NEEDS IMPROVEMENT - Major refinement needed")
else:
    print("**Status:** ⚠️  BASELINE - System not yet trained")
print()

PYTHON_SCRIPT

cat >> "$REPORT_FILE" << EOF

---

## Learning Patterns

EOF

# Extract learning patterns
python3 << PYTHON_SCRIPT >> "$REPORT_FILE"
import json
with open('$LEARNING_JSON', 'r') as f:
    data = json.load(f)

learning = data.get('learning_patterns', {})

# Domain preferences
domain_prefs = learning.get('domain_preferences', {})
if domain_prefs.get('highly_preferred'):
    print("### ✅ Preferred Domains\n")
    for domain, stats in domain_prefs['highly_preferred'][:3]:
        print(f"- **{domain}**: User selected {stats['user_selected']} time(s)")
    print()

if domain_prefs.get('rejected'):
    print("### ❌ Rejected Domains\n")
    for domain, stats in domain_prefs['rejected'][:3]:
        print(f"- **{domain}**: AI recommended but user chose different source")
    print()

# URL characteristics
chars = learning.get('url_characteristics', {})
print("### 📊 User Preferences\n")
print(f"- **PDF Preference:** {chars.get('pdf_preference', {}).get('percentage', 0):.0f}% of selections")
print(f"- **Institutional Sources:** {chars.get('institutional_preference', {}).get('percentage', 0):.0f}% of selections")
print(f"- **Direct Sources:** {chars.get('direct_vs_aggregator', {}).get('percentage_direct', 0):.0f}% (avoids aggregators)")
print()

# AI failure modes
failures = learning.get('ai_failure_modes', {})
if failures:
    print("### ⚠️ AI Failure Patterns\n")
    for mode, cases in failures.items():
        if cases:
            mode_name = mode.replace('_', ' ').title()
            print(f"- **{mode_name}:** {len(cases)} occurrence(s)")
    print()

PYTHON_SCRIPT

cat >> "$REPORT_FILE" << EOF

---

## Recommendations

EOF

# Extract recommendations
python3 << PYTHON_SCRIPT >> "$REPORT_FILE"
import json
with open('$ANALYSIS_JSON', 'r') as f:
    data = json.load(f)

recommendations = data.get('recommendations', [])
if not recommendations:
    print("No specific recommendations at this time.")
else:
    for i, rec in enumerate(recommendations, 1):
        priority = rec.get('priority', 'MEDIUM')
        category = rec.get('category', 'Unknown')
        finding = rec.get('finding', '')
        action = rec.get('action', '')

        emoji = "🔴" if priority == "HIGH" else "🟡" if priority == "MEDIUM" else "🟢"
        print(f"\n### {emoji} {priority} Priority: {category}\n")
        print(f"**Finding:** {finding}\n")
        print(f"**Action:** {action}\n")

        if 'examples' in rec:
            print("**Examples:**")
            for ex in rec['examples'][:2]:
                print(f"- {ex}")
            print()
PYTHON_SCRIPT

cat >> "$REPORT_FILE" << EOF

---

## Next Steps

1. **Review recommendations above**
2. **Apply prompt templates** from \`prompt_templates/\` directory
3. **Update code** in \`netlify/functions/\` as needed
4. **Deploy changes:** \`netlify deploy --prod --message "Iteration X refinements"\`
5. **Process next batch** of 10-20 references
6. **Run analysis again:** \`./run_analysis.sh <new_log> batch_next\`
7. **Compare improvement** using generated comparison report

---

## Files Generated

- **Parsed Data:** \`$PARSED_JSON\`
- **Analysis:** \`$ANALYSIS_JSON\`
- **Learning Patterns:** \`$LEARNING_JSON\`
- **This Report:** \`$REPORT_FILE\`
EOF

if [ -f "batch_comparison.json" ]; then
    echo "- **Batch Comparison:** \`batch_comparison.json\`" >> "$REPORT_FILE"
fi

echo -e "${GREEN}✓ Report generated: $REPORT_FILE${NC}"
echo ""

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Analysis pipeline complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📄 Output files:"
echo -e "   - ${GREEN}$PARSED_JSON${NC}"
echo -e "   - ${GREEN}$ANALYSIS_JSON${NC}"
echo -e "   - ${GREEN}$LEARNING_JSON${NC}"
echo -e "   - ${GREEN}$REPORT_FILE${NC}"
echo ""
echo -e "📖 View report: ${YELLOW}cat $REPORT_FILE${NC}"
echo -e "📊 View detailed analysis: ${YELLOW}cat $ANALYSIS_JSON | jq .${NC}"
echo ""
