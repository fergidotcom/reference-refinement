#!/bin/bash
# Deploy script for Reference Refinement

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Copy working version to production file
echo "📋 Copying rr_v90.html to rr_v60.html..."
cp rr_v90.html rr_v60.html

# Commit to Git
echo "💾 Committing to Git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit"
else
    echo "📝 Enter commit message:"
    read -r commit_msg
    git commit -m "$commit_msg"
    echo "⬆️  Pushing to GitHub..."
    git push
fi

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod

echo ""
echo "✅ Deployment complete!"
echo "🔗 Live at: https://rrv521-1760738877.netlify.app"
