#!/bin/bash

# ============================================================================
# OVERNIGHT PIPELINE RUNNER
# ============================================================================
#
# Runs the complete deep URL validation pipeline while you sleep.
#
# WHAT IT DOES:
# 1. Checks environment variables
# 2. Creates backup of decisions.txt
# 3. Runs overnight_pipeline.py
# 4. Saves all results to timestamped directory
#
# USAGE:
#   bash RUN_OVERNIGHT.sh
#
# REQUIREMENTS:
#   export ANTHROPIC_API_KEY="sk-ant-..."
#
# OUTPUT:
#   results/YYYYMMDD_HHMMSS/
#     - overnight_pipeline_log_*.txt
#     - phase2_sample25_results.json
#     - phase3_decision.json
#     - phase4_final_report.md
#     - ReferenceRefinementMacPerspective.yaml
#
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌙 OVERNIGHT PIPELINE RUNNER${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ERROR: ANTHROPIC_API_KEY not set${NC}"
    echo -e "${YELLOW}   Run: export ANTHROPIC_API_KEY='sk-ant-...'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ANTHROPIC_API_KEY found${NC}"

# Check Python dependencies
echo -e "\n${BLUE}Checking Python dependencies...${NC}"
if ! python3 -c "import aiohttp, anthropic" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Installing required packages...${NC}"
    pip3 install aiohttp anthropic --quiet
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Create results directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="results/${TIMESTAMP}"
mkdir -p "$RESULTS_DIR"

echo -e "\n${BLUE}Results will be saved to: ${RESULTS_DIR}${NC}"

# Create backup
BACKUP_FILE="${RESULTS_DIR}/decisions_backup_${TIMESTAMP}.txt"
echo -e "\n${BLUE}Creating backup of decisions.txt...${NC}"
if [ -f "/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions.txt" ]; then
    cp "/Users/joeferguson/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions.txt" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup saved: ${BACKUP_FILE}${NC}"
else
    echo -e "${RED}❌ ERROR: decisions.txt not found${NC}"
    exit 1
fi

# Run pipeline
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 STARTING OVERNIGHT PIPELINE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}This will take several hours. You can safely close this terminal.${NC}"
echo -e "${YELLOW}Results will be saved to: ${RESULTS_DIR}${NC}\n"

# Change to project directory
cd "/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References"

# Run pipeline and save output
python3 overnight_pipeline.py 2>&1 | tee "${RESULTS_DIR}/console_output.txt"

# Move generated files to results directory
echo -e "\n${BLUE}Moving results to ${RESULTS_DIR}...${NC}"
mv -f overnight_pipeline_log_*.txt "${RESULTS_DIR}/" 2>/dev/null || true
mv -f phase2_sample25_results.json "${RESULTS_DIR}/" 2>/dev/null || true
mv -f phase3_decision.json "${RESULTS_DIR}/" 2>/dev/null || true
mv -f phase4_final_report.md "${RESULTS_DIR}/" 2>/dev/null || true

# Copy checkpoint to Downloads
if [ -f "/Users/joeferguson/Downloads/ReferenceRefinementMacPerspective.yaml" ]; then
    cp "/Users/joeferguson/Downloads/ReferenceRefinementMacPerspective.yaml" "${RESULTS_DIR}/"
    echo -e "${GREEN}✅ Checkpoint saved to results directory${NC}"
fi

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 PIPELINE COMPLETE!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}📊 Results saved to: ${RESULTS_DIR}${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "  1. Review: ${RESULTS_DIR}/phase4_final_report.md"
echo -e "  2. Check: ${RESULTS_DIR}/phase2_sample25_results.json"
echo -e "  3. Decision: ${RESULTS_DIR}/phase3_decision.json"
echo -e "  4. Complete log: ${RESULTS_DIR}/overnight_pipeline_log_*.txt"
echo -e "\n${GREEN}Sleep well! 😴${NC}\n"
