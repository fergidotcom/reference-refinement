#!/bin/bash
# Fix Claude Code Auto-Update Issue - DEFINITIVE SOLUTION
# Date: October 31, 2025
# Issue: npm cache has root-owned files preventing auto-updates

echo "════════════════════════════════════════════════════════════"
echo "  Claude Code Auto-Update Fix - Definitive Solution"
echo "════════════════════════════════════════════════════════════"
echo ""

# Step 1: Fix npm cache permissions (requires password)
echo "Step 1/4: Fixing npm cache permissions..."
echo "→ This will require your password"
sudo chown -R $(id -u):$(id -g) "$HOME/.npm"
if [ $? -eq 0 ]; then
    echo "✅ Permissions fixed"
else
    echo "❌ Failed to fix permissions - you may need to run this manually"
    exit 1
fi
echo ""

# Step 2: Clean npm cache
echo "Step 2/4: Cleaning npm cache..."
npm cache clean --force
if [ $? -eq 0 ]; then
    echo "✅ Cache cleaned"
else
    echo "⚠️  Cache clean had warnings but continuing..."
fi
echo ""

# Step 3: Reinstall Claude Code
echo "Step 3/4: Reinstalling Claude Code..."
npm install -g @anthropic-ai/claude-code@latest
if [ $? -eq 0 ]; then
    echo "✅ Claude Code reinstalled"
else
    echo "❌ Failed to reinstall - trying with sudo..."
    sudo npm install -g @anthropic-ai/claude-code@latest
fi
echo ""

# Step 4: Verify installation
echo "Step 4/4: Verifying installation..."
VERSION=$(claude --version 2>&1 | head -1)
echo "Installed version: $VERSION"
echo ""

# Check for latest version
LATEST=$(npm view @anthropic-ai/claude-code version)
echo "Latest available: $LATEST"
echo ""

if [[ "$VERSION" == *"$LATEST"* ]]; then
    echo "✅ SUCCESS: Claude Code is up to date!"
    echo ""
    echo "The auto-update message should now disappear."
else
    echo "⚠️  Version mismatch - you may need to restart your terminal"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Fix complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Close all terminal windows"
echo "2. Open a new terminal"
echo "3. Verify the message is gone"
echo ""
echo "If the message still appears, run:"
echo "  rm -rf ~/.npm"
echo "  npm install -g @anthropic-ai/claude-code@latest"
echo ""
