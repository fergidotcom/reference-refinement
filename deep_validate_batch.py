#!/usr/bin/env python3
"""
Deep URL Validation - Batch Wrapper
Called from batch-processor.js to validate URLs

Usage:
    python3 deep_validate_batch.py <url> <citation> <url_type>

Returns JSON with validation results
"""

import sys
import json
import asyncio
from deep_url_validation import validate_url_deep

async def main():
    if len(sys.argv) < 4:
        print(json.dumps({
            "error": "Usage: deep_validate_batch.py <url> <citation> <url_type>"
        }))
        sys.exit(1)

    url = sys.argv[1]
    citation = sys.argv[2]
    url_type = sys.argv[3]  # 'primary' or 'secondary'

    try:
        result = await validate_url_deep(
            url=url,
            citation=citation,
            url_type=url_type,
            api_key=None  # Will use basic content matching
        )

        # Convert to JSON-serializable dict
        output = {
            "valid": result.valid,
            "accessible": result.accessible,
            "score": result.score,
            "reason": result.reason,
            "paywall": result.paywall,
            "login_required": result.login_required,
            "preview_only": result.preview_only,
            "soft_404": result.soft_404,
            "confidence": result.confidence,
            "content_matches": result.content_matches
        }

        print(json.dumps(output))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "valid": False,
            "accessible": False,
            "score": 0,
            "reason": f"Validation error: {str(e)}"
        }))
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
