#!/bin/bash
# One-command overnight pipeline runner
# Prompts for API key if not already set

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "Enter your Anthropic API key:"
    read -s ANTHROPIC_API_KEY
    export ANTHROPIC_API_KEY
fi

cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References && \
pip3 install -q aiohttp anthropic && \
bash RUN_OVERNIGHT.sh
