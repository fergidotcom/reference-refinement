#!/bin/bash
# Claude Code Project Startup Hook - Reference Refinement
# Automatically processes Claude.ai perspectives and loads Mac perspectives

PROJECT_NAME="ReferenceRefinement"
PROJECT_DIR="$HOME/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References"
PERSPECTIVE_PROCESSOR="$HOME/Library/CloudStorage/Dropbox/Fergi/.claude-perspective-processor.sh"
MAC_PERSPECTIVE_FILE="$HOME/Downloads/${PROJECT_NAME}MacPerspective.yaml"

# Process Claude.ai perspective (archives from Downloads, checks for new instructions)
if [ -f "$PERSPECTIVE_PROCESSOR" ]; then
    CLAUDE_PERSPECTIVE=$("$PERSPECTIVE_PROCESSOR" "$PROJECT_NAME" "$PROJECT_DIR")
fi

# Also check for Mac perspective (from previous Mac session)
if [ -f "$MAC_PERSPECTIVE_FILE" ]; then
    # Color codes for output
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📋 Mac Checkpoint Available: Reference Refinement${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Get timestamp
    TIMESTAMP=$(grep "^timestamp:" "$MAC_PERSPECTIVE_FILE" | cut -d'"' -f2)
    if [ -n "$TIMESTAMP" ]; then
        echo -e "${BLUE}⏰ Last Mac Session:${NC} $TIMESTAMP"
    fi

    # Get status
    STATUS=$(grep "^  status:" "$MAC_PERSPECTIVE_FILE" | sed 's/^  status: "\(.*\)"/\1/')
    if [ -n "$STATUS" ]; then
        echo -e "${BLUE}📍 Status:${NC} $STATUS"
    fi

    echo ""

    # Extract session summary
    echo -e "${YELLOW}📝 Last Session:${NC}"
    sed -n '/^session_summary: |/,/^[^ ]/p' "$MAC_PERSPECTIVE_FILE" | \
        grep -v "^session_summary:" | \
        grep -v "^[^ ]" | \
        sed 's/^  //' | \
        sed 's/^/  /'

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
fi
