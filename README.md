# Reference Refinement

A web-based tool for managing academic references with AI-powered search and ranking capabilities.

## Version

Current: **v9.4**

## Features

- 📝 **Reference Management**: Parse and manage academic references from text files
- 🔍 **AI-Powered Search**: Generate optimized search queries using Claude AI
- 🏆 **Smart Ranking**: Automatically rank search results by relevance
- 🔗 **URL Tracking**: Maintain primary and secondary URLs for each reference
- ✅ **Finalization Workflow**: Move validated references to final collection
- 📊 **Debug Tools**: Built-in debugging and feedback system

## Architecture

- **Frontend**: Single-page HTML application with inline CSS/JavaScript
- **Backend**: Netlify Functions (TypeScript) for serverless API
- **AI Integration**: Anthropic Claude API for query generation and ranking
- **Search**: Google Custom Search API

## Deployment

Deployed on Netlify: https://rrv521-1760738877.netlify.app

### Deploy Commands

```bash
# Copy working version to deployment file
cp rr_v90.html rr_v60.html

# Deploy to production
netlify deploy --prod
```

## Configuration

Required environment variables (set in Netlify):
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `GOOGLE_CSE_API_KEY`: Google Custom Search API key
- `GOOGLE_CSE_CX`: Google Custom Search Engine ID

## File Structure

- `rr_v60.html`: Production file (served at root)
- `rr_v90.html`: Development file (working version)
- `netlify/functions/`: Serverless functions
- `decisions.txt`: Working references
- `Final.txt`: Finalized references

## Development

1. Edit `rr_v90.html`
2. Test locally
3. Copy to `rr_v60.html` when ready
4. Deploy with `netlify deploy --prod`

## Version History

See [CLAUDE.md](CLAUDE.md) for detailed development documentation.

---

**Built with Claude Code** 🤖
# reference-refinement
