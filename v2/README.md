# Reference Refinement v2

AI-powered academic reference refinement system that discovers, validates, and ranks URLs for bibliographic references.

## 🚀 Features

- **AI-Powered Search**: Generates optimized search queries using simple heuristics (or Claude AI in future versions)
- **Smart Ranking**: Uses Claude AI to rank URLs with mutual exclusivity rules (work itself vs. reviews)
- **3-Level URL Validation**: Detects hard 404s, soft 404s (content-type mismatch), and content-based errors
- **Batch Processing**: Process hundreds of references with progress tracking and resume capability
- **Multiple Output Formats**: decisions.txt, Final.txt, JSON, or Markdown
- **Cost Tracking**: Track Google CSE and Claude API costs in real-time

## 📋 Prerequisites

- Node.js 18+
- API Keys:
  - [Google Custom Search API](https://console.cloud.google.com/apis/credentials)
  - [Google Custom Search Engine ID](https://programmablesearchengine.google.com/)
  - [Anthropic API Key](https://console.anthropic.com/)

## 🔧 Installation

```bash
cd v2
npm install
npm run build
```

## ⚙️ Configuration

1. Copy the example configuration:

```bash
cp config.example.yaml config.yaml
```

2. Edit `config.yaml` and add your API keys, or set environment variables:

```bash
export GOOGLE_API_KEY="your-google-api-key"
export GOOGLE_CSE_ID="your-google-cse-id"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## 🎯 Quick Start

### Process a references file

```bash
npm run cli -- process decisions.txt --config config.yaml
```

### Validate configuration

```bash
npm run cli -- validate config.yaml
```

### Show statistics

```bash
npm run cli -- stats decisions.txt --detailed
```

### Resume interrupted processing

```bash
npm run cli -- process decisions.txt --config config.yaml
# Progress is automatically saved and resumed
```

## 📚 Usage Examples

### Process with custom output

```bash
npm run cli -- process input.txt \
  --config config.yaml \
  --output output/results.txt \
  --format decisions \
  --batch-version v2.1
```

### Auto-finalize high-confidence results

```bash
npm run cli -- process input.txt \
  --config config.yaml \
  --auto-finalize
```

### Dry run (preview without changes)

```bash
npm run cli -- process input.txt \
  --config config.yaml \
  --dry-run
```

## 📖 File Formats

### decisions.txt (Working Format)

```
[100] Pariser, E. (2011). The filter bubble. Penguin Press.
[FINALIZED BATCH_v2.0]
Relevance: This seminal work on algorithmic filtering...
Primary URL: https://archive.org/details/filterbubble00pari
Secondary URL: https://www.jstor.org/stable/review-article
Q: "The filter bubble" Pariser 2011 filetype:pdf site:edu
Q: "The filter bubble" Pariser free full text
```

### Final.txt (Clean Format)

```
[100] Pariser, E. (2011). The filter bubble. Penguin Press.
Primary URL: https://archive.org/details/filterbubble00pari
Secondary URL: https://www.jstor.org/stable/review-article
```

## 🏗️ Architecture

```
v2/
├── lib/
│   ├── types/              # Shared TypeScript types
│   ├── search-engine/      # Google Custom Search integration
│   ├── refinement-engine/  # URL validation, ranking, selection
│   │   ├── url-validator.ts      # 3-level validation
│   │   ├── llm-ranker.ts         # Claude AI ranking
│   │   ├── url-selector.ts       # Mutual exclusivity rules
│   │   └── index.ts
│   ├── output-generator/   # Multiple output formats
│   │   ├── decisions-formatter.ts
│   │   ├── final-formatter.ts
│   │   ├── json-formatter.ts
│   │   ├── markdown-formatter.ts
│   │   └── index.ts
│   └── pipeline/           # Integration layer
│       ├── pipeline-config.ts    # Configuration management
│       ├── progress-tracker.ts   # Progress tracking
│       ├── reference-pipeline.ts # Single reference processing
│       ├── batch-processor.ts    # Batch processing
│       └── index.ts
├── cli/                    # Command-line interface
├── tests/                  # Tests
└── docs/                   # Documentation
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 💰 Cost Estimates

- **Google Custom Search**: ~$0.04 per reference (8 queries × $0.005/query)
- **Claude API (Haiku)**: ~$0.10 per reference (query generation + ranking)
- **Total**: ~$0.14 per reference

For 288 references: ~$40

## 🔑 Key Patterns from v1

This v2 implementation incorporates proven patterns from v1:

### URL Validation (v16.7)
- **Level 1**: Hard 404 detection (HTTP status ≥400)
- **Level 2**: Soft 404 via content-type mismatch (PDF URLs returning HTML)
- **Level 3**: Soft 404 via content analysis (error patterns in HTML)

### LLM Ranking (v16.1 + v13.11)
- **Pipe-delimited format**: More reliable than JSON for Claude
- **Enhanced prompts**: Better query generation with specific guidance
- **Mutual exclusivity**: PRIMARY ≥70 → SECONDARY <30

### Batch Processing (v16.6)
- **Progress tracking**: Save/resume capability
- **Cost tracking**: Real-time API cost monitoring
- **Batch versioning**: Track which batch version processed each reference

## 📝 License

MIT

## 🤝 Contributing

This is an internal tool, but improvements and bug fixes are welcome!

## 🐛 Known Issues

- Query generation is currently simple (not using Claude AI yet)
- Level 3 soft-404 detection not yet fully implemented
- Resume command requires manual input file specification

## 🗺️ Roadmap

- [ ] Claude AI query generation (like v1)
- [ ] Full Level 3 soft-404 detection
- [ ] Document analyzer component
- [ ] Format controller component (better bibliographic parsing)
- [ ] Web interface (optional)
- [ ] Improved resume command

## 📞 Support

For issues or questions, see the v1 documentation in the parent directory.
