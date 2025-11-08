# Training Manuscripts for Productized Reference System

## Available in Repository

**`raw_manuscript_training.docx`** (2.3 MB)
- **Title**: "Caught in the Act"
- **Topic**: Political performance and democratic accountability
- **References**: 288 (baseline: 100% Primary, 93.4% Secondary coverage)
- **Citation Format**: Mixed, chapter-based RID scheme (100-199, 200-299, etc.)
- **Status**: ✅ Available in repository

## Large Files (Not in Repository - GitHub 100MB Limit)

**`authoritarian_ascent_usa.docx`** (497 MB)
- **Title**: "Authoritarian Ascent in the USA"
- **Topic**: Political science, authoritarian trends
- **Purpose**: Tests system scalability and performance with large manuscripts
- **Citation Format**: Complex political science citations
- **Status**: ⚠️ Too large for GitHub (use local copy)
- **Location**: Available from project maintainer or Dropbox

**`myth_male_menopause.docx`** (13 MB)
- **Title**: "The Myth of Male Menopause"
- **Topic**: Medical/scientific manuscript
- **Purpose**: Tests cross-disciplinary citation handling (medical/APA style)
- **Status**: ⚠️ Not in repository (use local copy)
- **Location**: Available from project maintainer or Dropbox

## For Claude Code Web Development

### Option 1: Use Caught in the Act Only (Recommended for Initial Development)
The `raw_manuscript_training.docx` file (2.3 MB) is sufficient for initial development and testing:
- Complete workflow validation
- Citation detection testing
- URL discovery validation
- Publication generation

### Option 2: Get Full Manuscript Set
If you need all three manuscripts for comprehensive testing:

**Contact Project Maintainer**:
- Request access to large manuscripts
- Available via Dropbox share or direct transfer
- Place files in `source/` directory after receiving

**Or Use Your Own Test Manuscripts**:
- System should work with ANY manuscript
- Create your own test documents with various citation formats
- Validate universal citation detection

## Validation Requirements

**V1 System Must Support**:
1. ✅ Caught in the Act (available in repo)
2. ⚠️ Authoritarian Ascent in USA (local copy needed)
3. ⚠️ Myth of Male Menopause (local copy needed)

**Success Criteria**:
- Process all three manuscripts through complete workflow
- Normalization → Refinement → Publication
- Match/exceed baseline metrics (100% Primary, 93.4% Secondary URLs)

## Notes

- The productized system is designed to work with **any** manuscript
- These three manuscripts validate different aspects:
  - **Caught in the Act**: Baseline quality metrics
  - **Authoritarian Ascent**: Scalability and performance
  - **Male Menopause**: Cross-disciplinary citation handling
- Start development with `raw_manuscript_training.docx`
- Add other manuscripts as testing expands
