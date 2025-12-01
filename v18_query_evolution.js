// v18.0: Query Evolution Algorithms (from batch processor v21.0)
// These replace simple mode with intelligent strategy selection

// Helper: Extract title from reference
extractTitle(ref) {
    return ref.title || '';
},

// Helper: Detect if reference is an edge case
isEdgeCase(ref) {
    const title = this.extractTitle(ref);
    const hasShortTitle = title.length < 20;
    const hasMissingAuthor = !ref.authors || ref.authors.trim().length === 0;
    const hasManualReview = ref.flags && ref.flags.includes('MANUAL_REVIEW');
    const previouslyFailed = ref.note && (ref.note.includes('URL_VALIDATION_FAILED') || ref.note.includes('PAYWALL'));

    return hasShortTitle || hasMissingAuthor || previouslyFailed;
},

// Strategy 1: title_first_60_chars (DEFAULT - 82.3% usage in research)
// Win rate: 100% in research validation
// Use: Typical references with clear titles
generateTitleFirst60Chars(ref) {
    const title = this.extractTitle(ref);
    const query = title.substring(0, 60).trim();
    this.lastStrategyUsed = 'title_first_60_chars';
    return query;
},

// Strategy 2: title_keywords_5_terms (MANUAL_REVIEW - 14.2% usage)
// Win rate: 91.4% in research validation
// Use: References flagged for manual review or difficult matches
generateTitleKeywords5Terms(ref) {
    const title = this.extractTitle(ref);

    // Common stop words to filter out
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                       'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been'];

    // Extract words from title
    const words = title.toLowerCase()
        .replace(/[^\w\s]/g, ' ')  // Remove punctuation
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));

    // Sort by length (longer words are usually more meaningful)
    const keywords = words
        .sort((a, b) => b.length - a.length)
        .slice(0, 5)  // Take top 5
        .join(' ');

    this.lastStrategyUsed = 'title_keywords_5_terms';
    return keywords;
},

// Strategy 3: plus_best_2_from_tier_1 (EDGE CASES - 3.5% usage)
// Win rate: 100% in research validation
// Use: Edge cases, short titles, missing authors
generatePlusBest2FromTier1(ref) {
    const title = this.extractTitle(ref);

    // Extract domain keywords from existing good URLs if available
    const domainKeywords = [];

    if (ref.urls && ref.urls.primary) {
        const url = ref.urls.primary.toLowerCase();
        if (url.includes('.edu')) domainKeywords.push('academic');
        if (url.includes('pdf')) domainKeywords.push('PDF');
        if (url.includes('archive.org')) domainKeywords.push('archive');
        if (url.includes('researchgate')) domainKeywords.push('research');
        if (url.includes('scholar.google')) domainKeywords.push('scholar');
        if (url.includes('jstor')) domainKeywords.push('journal');
    }

    // Combine title with domain keywords
    const query = `${title} ${domainKeywords.slice(0, 2).join(' ')}`.trim();

    this.lastStrategyUsed = 'plus_best_2_from_tier_1';
    return query;
},

// Strategy Selection (matches batch processor logic)
selectQueryStrategy(ref) {
    // Check for MANUAL_REVIEW flag
    if (ref.flags && ref.flags.includes('MANUAL_REVIEW')) {
        return 'title_keywords_5_terms';
    }

    // Check for edge cases
    if (this.isEdgeCase(ref)) {
        return 'plus_best_2_from_tier_1';
    }

    // DEFAULT: Use simple title truncation for typical references
    return 'title_first_60_chars';
},

// Generate query using selected strategy
generateQueryWithStrategy(ref) {
    const strategy = this.selectQueryStrategy(ref);

    let query;
    switch(strategy) {
        case 'title_keywords_5_terms':
            query = this.generateTitleKeywords5Terms(ref);
            break;
        case 'plus_best_2_from_tier_1':
            query = this.generatePlusBest2FromTier1(ref);
            break;
        case 'title_first_60_chars':
        default:
            query = this.generateTitleFirst60Chars(ref);
            break;
    }

    console.log(`[v18.0 Query Evolution] Strategy: ${strategy}, Query: ${query}`);
    return query;
},
