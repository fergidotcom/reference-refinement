#!/usr/bin/env python3
"""
Override Pattern Analyzer for Reference Refinement System Log Analysis

Analyzes parsed debug logs to identify patterns in user overrides of AI recommendations.

Usage:
    python analyze_overrides.py <parsed_log.json>

Generates insights on:
- Override frequency
- URL selection patterns
- Query effectiveness
- Domain preferences
- Recommendations for improvement
"""

import json
import sys
from collections import Counter, defaultdict
from urllib.parse import urlparse
from typing import Dict, List, Any


class OverrideAnalyzer:
    """Analyzer for user override patterns"""

    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.references = data.get('references', [])
        self.insights = {
            "summary": {},
            "override_patterns": {},
            "query_effectiveness": {},
            "domain_analysis": {},
            "recommendations": []
        }

    def analyze(self) -> Dict[str, Any]:
        """Run complete analysis"""
        self._analyze_summary()
        self._analyze_overrides()
        self._analyze_queries()
        self._analyze_domains()
        self._generate_recommendations()

        return self.insights

    def _analyze_summary(self):
        """Generate high-level summary"""
        total = len(self.references)
        finalized = sum(1 for r in self.references if r.get('finalized'))
        overridden = sum(1 for r in self.references if r.get('override'))

        self.insights['summary'] = {
            "total_references": total,
            "finalized": finalized,
            "overridden": overridden,
            "override_rate": round(overridden / total * 100, 1) if total > 0 else 0,
            "finalization_rate": round(finalized / total * 100, 1) if total > 0 else 0
        }

    def _analyze_overrides(self):
        """Analyze override patterns"""
        override_cases = []

        for ref in self.references:
            if not ref.get('override'):
                continue

            ai_primary = ref.get('autorank', {}).get('ai_primary', {})
            user_primary = ref.get('user_selections', {}).get('primary', {})

            case = {
                "reference_id": ref.get('id'),
                "reference_title": ref.get('parsed_fields', {}).get('title'),
                "ai_recommended": {
                    "url": ai_primary.get('url'),
                    "primary_score": ai_primary.get('primary_score'),
                    "secondary_score": ai_primary.get('secondary_score'),
                    "domain": self._extract_domain(ai_primary.get('url'))
                },
                "user_selected": {
                    "url": user_primary.get('url'),
                    "query": user_primary.get('query'),
                    "domain": self._extract_domain(user_primary.get('url'))
                }
            }

            override_cases.append(case)

        self.insights['override_patterns'] = {
            "total_overrides": len(override_cases),
            "cases": override_cases
        }

        # Domain preference analysis
        ai_domains = [c['ai_recommended']['domain'] for c in override_cases
                      if c['ai_recommended']['domain']]
        user_domains = [c['user_selected']['domain'] for c in override_cases
                        if c['user_selected']['domain']]

        self.insights['override_patterns']['ai_domain_distribution'] = dict(Counter(ai_domains).most_common())
        self.insights['override_patterns']['user_domain_distribution'] = dict(Counter(user_domains).most_common())

    def _analyze_queries(self):
        """Analyze query effectiveness"""
        query_stats = defaultdict(lambda: {
            "used_count": 0,
            "found_selected_url": 0,
            "total_results": 0
        })

        winning_queries = []

        for ref in self.references:
            # Track all queries and their results
            for query, count in ref.get('search_results', {}).get('by_query', {}).items():
                query_stats[query]["used_count"] += 1
                query_stats[query]["total_results"] += count

            # Identify winning queries (found selected URLs)
            user_primary = ref.get('user_selections', {}).get('primary', {})
            if user_primary.get('query'):
                query = user_primary['query']
                query_stats[query]["found_selected_url"] += 1
                winning_queries.append({
                    "reference_id": ref.get('id'),
                    "query": query,
                    "url": user_primary.get('url')
                })

            user_secondary = ref.get('user_selections', {}).get('secondary', {})
            if user_secondary.get('query'):
                query = user_secondary['query']
                query_stats[query]["found_selected_url"] += 1

        # Calculate effectiveness scores
        query_effectiveness = []
        for query, stats in query_stats.items():
            effectiveness = stats["found_selected_url"] / stats["used_count"] if stats["used_count"] > 0 else 0
            query_effectiveness.append({
                "query": query,
                "effectiveness": round(effectiveness, 3),
                "times_used": stats["used_count"],
                "times_won": stats["found_selected_url"],
                "avg_results": round(stats["total_results"] / stats["used_count"], 1) if stats["used_count"] > 0 else 0
            })

        # Sort by effectiveness
        query_effectiveness.sort(key=lambda x: x["effectiveness"], reverse=True)

        self.insights['query_effectiveness'] = {
            "total_unique_queries": len(query_stats),
            "winning_queries": winning_queries,
            "top_queries": query_effectiveness[:10],
            "ineffective_queries": [q for q in query_effectiveness if q["avg_results"] == 0]
        }

    def _analyze_domains(self):
        """Analyze domain preferences"""
        domain_selections = {
            "primary": Counter(),
            "secondary": Counter()
        }

        for ref in self.references:
            for url_type in ['primary', 'secondary']:
                selection = ref.get('user_selections', {}).get(url_type, {})
                if selection.get('url'):
                    domain = self._extract_domain(selection['url'])
                    if domain:
                        domain_selections[url_type][domain] += 1

        self.insights['domain_analysis'] = {
            "primary_domains": dict(domain_selections['primary'].most_common(20)),
            "secondary_domains": dict(domain_selections['secondary'].most_common(20))
        }

    def _generate_recommendations(self):
        """Generate recommendations for improvement"""
        recommendations = []

        override_rate = self.insights['summary']['override_rate']

        # Override rate analysis
        if override_rate > 80:
            recommendations.append({
                "priority": "HIGH",
                "category": "Ranking Algorithm",
                "finding": f"Override rate is {override_rate}%, indicating AI rankings don't match user preferences",
                "action": "Review and update ranking criteria in llm-rank.ts prompt"
            })
        elif override_rate > 50:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Ranking Algorithm",
                "finding": f"Override rate is {override_rate}%",
                "action": "Fine-tune ranking algorithm weights"
            })

        # Query effectiveness
        ineffective = self.insights['query_effectiveness'].get('ineffective_queries', [])
        if len(ineffective) > 5:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Query Generation",
                "finding": f"{len(ineffective)} queries consistently return 0 results",
                "action": "Remove or refine these query patterns in llm-chat.ts prompt",
                "examples": [q['query'] for q in ineffective[:3]]
            })

        # Domain preferences
        ai_domains = self.insights.get('override_patterns', {}).get('ai_domain_distribution', {})
        user_domains = self.insights.get('override_patterns', {}).get('user_domain_distribution', {})

        # Check if AI prefers aggregators
        aggregators = ['scholar.google.com', 'researchgate.net', 'academia.edu']
        ai_aggregator_count = sum(ai_domains.get(d, 0) for d in aggregators)
        if ai_aggregator_count > 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "Domain Filtering",
                "finding": f"AI recommends aggregator sites {ai_aggregator_count} times, but user prefers direct sources",
                "action": "Add explicit penalty for aggregator domains in ranking prompt"
            })

        # Check user preferences for institutional archives
        institutional = [d for d in user_domains.keys() if any(
            x in d for x in ['.edu', '.gov', 'dtic.mil', 'archive.org', 'jstor.org']
        )]
        if len(institutional) > len(user_domains) * 0.5:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Domain Prioritization",
                "finding": f"User prefers institutional archives ({len(institutional)} / {len(user_domains)} selections)",
                "action": "Increase weight for .edu, .gov, and known archive domains in ranking"
            })

        self.insights['recommendations'] = recommendations

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL"""
        if not url:
            return None
        try:
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except:
            return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_overrides.py <parsed_log.json>")
        sys.exit(1)

    input_file = sys.argv[1]

    # Read parsed log
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON: {e}")
        sys.exit(1)

    # Analyze
    analyzer = OverrideAnalyzer(data)
    insights = analyzer.analyze()

    # Output
    print("\n" + "="*80)
    print("OVERRIDE PATTERN ANALYSIS")
    print("="*80)

    print("\n📊 SUMMARY")
    print("-" * 80)
    summary = insights['summary']
    print(f"Total References: {summary['total_references']}")
    print(f"Finalized: {summary['finalized']} ({summary['finalization_rate']}%)")
    print(f"Overridden: {summary['overridden']} ({summary['override_rate']}%)")

    print("\n🔄 OVERRIDE PATTERNS")
    print("-" * 80)
    override_patterns = insights['override_patterns']
    print(f"Total Overrides: {override_patterns['total_overrides']}")

    print("\n  AI Recommended Domains:")
    for domain, count in list(override_patterns.get('ai_domain_distribution', {}).items())[:5]:
        print(f"    {domain}: {count}")

    print("\n  User Selected Domains:")
    for domain, count in list(override_patterns.get('user_domain_distribution', {}).items())[:5]:
        print(f"    {domain}: {count}")

    print("\n🔍 QUERY EFFECTIVENESS")
    print("-" * 80)
    query_eff = insights['query_effectiveness']
    print(f"Total Unique Queries: {query_eff['total_unique_queries']}")
    print(f"Winning Queries: {len(query_eff['winning_queries'])}")

    print("\n  Top Performing Queries:")
    for q in query_eff['top_queries'][:3]:
        print(f"    {q['effectiveness']:.1%} - {q['query'][:60]}...")

    print("\n  Ineffective Queries (0 results):")
    for q in query_eff['ineffective_queries'][:3]:
        print(f"    {q['query'][:60]}...")

    print("\n🌐 DOMAIN ANALYSIS")
    print("-" * 80)
    domain_analysis = insights['domain_analysis']

    print("\n  Most Selected Primary Domains:")
    for domain, count in list(domain_analysis['primary_domains'].items())[:5]:
        print(f"    {domain}: {count}")

    print("\n💡 RECOMMENDATIONS")
    print("-" * 80)
    for rec in insights['recommendations']:
        print(f"\n  [{rec['priority']}] {rec['category']}")
        print(f"  Finding: {rec['finding']}")
        print(f"  Action: {rec['action']}")
        if 'examples' in rec:
            print(f"  Examples: {rec['examples'][:2]}")

    print("\n" + "="*80)

    # Save full insights to JSON
    output_file = input_file.replace('.json', '_analysis.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(insights, f, indent=2)

    print(f"\n✓ Full analysis saved to: {output_file}\n")


if __name__ == '__main__':
    main()
