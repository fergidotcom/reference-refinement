#!/bin/bash
# Reference Refinement v6.6 - Quick Deployment Script

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Reference Refinement v6.6 - Deploy       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo

# Check if in correct directory
if [ ! -f "rr_v60.html" ]; then
    echo -e "${YELLOW}⚠️  Not in reference-refinement-v6 directory${NC}"
    echo "Please cd to the project directory first:"
    echo "cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/reference-refinement-v6/"
    exit 1
fi

echo -e "${GREEN}✓${NC} In project directory"
echo

# Backup current version
echo "Creating backup of v6.5..."
cp rr_v60.html rr_v60_backup_$(date +%Y%m%d_%H%M%S).html
echo -e "${GREEN}✓${NC} Backup created"
echo

# Check if rr_v66.html exists in Downloads
if [ ! -f ~/Downloads/rr_v66.html ]; then
    echo -e "${YELLOW}⚠️  rr_v66.html not found in Downloads${NC}"
    echo "Please download rr_v66.html first"
    exit 1
fi

echo "Copying v6.6 to project..."
cp ~/Downloads/rr_v66.html rr_v60.html
echo -e "${GREEN}✓${NC} v6.6 installed"
echo

# Deploy to Netlify
echo "Deploying to Netlify..."
netlify deploy --prod --dir="." --message "v6.6 - compressed layout + save + URL controls"

if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  v6.6 Successfully Deployed!              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo
    echo "URL: https://rrv521-1760738877.netlify.app"
    echo
    echo "Next steps:"
    echo "1. Force refresh on iPad (pull down in Safari)"
    echo "2. Verify header shows 'Reference Refinement v6.6'"
    echo "3. Test compressed bibliographic layout"
    echo "4. Test Save Changes updates references"
    echo "5. Test URL designation buttons in search results"
    echo
else
    echo -e "${YELLOW}⚠️  Deployment failed${NC}"
    echo "Check error messages above"
    exit 1
fi
