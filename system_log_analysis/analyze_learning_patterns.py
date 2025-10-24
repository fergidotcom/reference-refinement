#!/usr/bin/env python3
"""
Learning Pattern Analyzer for Reference Refinement

Advanced analysis that captures user decision-making patterns to predict
future URL selections with high fidelity.

Focus Areas:
1. Domain preference learning (which TLDs, publishers, archives user prefers)
2. URL characteristic patterns (PDF vs HTML, free vs paywalled, etc.)
3. Override reasoning analysis (from user annotations)
4. Confidence prediction (which refs will need manual review)
5. Automated prompt refinement generation

Usage:
    python analyze_learning_patterns.py <parsed_log.json>
"""

import json
import sys
import re
from collections import Counter, defaultdict
from urllib.parse import urlparse
from typing import Dict, List, Any, Tuple


class LearningPatternAnalyzer:
    """Advanced analyzer for learning user URL selection patterns"""

    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.references = data.get('references', [])
        self.patterns = {
            "domain_preferences": {},
            "url_characteristics": {},
            "override_reasons": {},
            "ai_failure_modes": {},
            "confidence_predictors": {},
            "prompt_refinements": []
        }

    def analyze(self) -> Dict[str, Any]:
        """Run complete learning pattern analysis"""
        self._analyze_domain_preferences()
        self._analyze_url_characteristics()
        self._analyze_ai_failure_modes()
        self._build_confidence_predictors()
        self._generate_prompt_refinements()

        return {
            "learning_patterns": self.patterns,
            "confidence_model": self._build_confidence_model(),
            "next_iteration_recommendations": self._prioritize_improvements()
        }

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            return parsed.netloc
        except:
            return "unknown"

    def _analyze_domain_preferences(self):
        """Learn which domains and TLDs user prefers"""
        domain_stats = defaultdict(lambda: {
            "user_selected": 0,
            "ai_recommended": 0,
            "user_preference_score": 0,
            "contexts": []
        })

        for ref in self.references:
            # Track AI recommendations
            ai_primary = ref.get('autorank', {}).get('ai_primary', {})
            if ai_primary.get('url'):
                domain = ai_primary.get('domain') or self._extract_domain(ai_primary['url'])
                domain_stats[domain]["ai_recommended"] += 1

            # Track user selections
            user_primary = ref.get('user_selections', {}).get('primary', {})
            if user_primary.get('url'):
                domain = user_primary.get('domain') or self._extract_domain(user_primary['url'])
                domain_stats[domain]["user_selected"] += 1
                domain_stats[domain]["contexts"].append({
                    "ref_id": ref.get('id'),
                    "title": ref.get('parsed_fields', {}).get('title'),
                    "url": user_primary.get('url')
                })

        # Calculate preference scores
        for domain, stats in domain_stats.items():
            if stats["ai_recommended"] > 0:
                # Negative score = AI recommended but user didn't select
                stats["user_preference_score"] = stats["user_selected"] - stats["ai_recommended"]
            else:
                # Positive score = User selected but AI didn't recommend
                stats["user_preference_score"] = stats["user_selected"]

        # Sort by preference score
        sorted_domains = sorted(
            domain_stats.items(),
            key=lambda x: x[1]["user_preference_score"],
            reverse=True
        )

        self.patterns["domain_preferences"] = {
            "highly_preferred": [(d, s) for d, s in sorted_domains if s["user_preference_score"] > 0][:10],
            "rejected": [(d, s) for d, s in sorted_domains if s["user_preference_score"] < 0][:10],
            "tld_analysis": self._analyze_tlds(domain_stats)
        }

    def _analyze_tlds(self, domain_stats):
        """Analyze top-level domain preferences (.edu, .org, .gov, etc.)"""
        tld_stats = defaultdict(lambda: {"selected": 0, "rejected": 0})

        for domain, stats in domain_stats.items():
            tld = domain.split('.')[-1] if '.' in domain else 'unknown'
            if stats["user_preference_score"] > 0:
                tld_stats[tld]["selected"] += stats["user_selected"]
            elif stats["user_preference_score"] < 0:
                tld_stats[tld]["rejected"] += abs(stats["user_preference_score"])

        return dict(sorted(
            tld_stats.items(),
            key=lambda x: x[1]["selected"],
            reverse=True
        ))

    def _analyze_url_characteristics(self):
        """Learn URL characteristic preferences (PDF, free, institutional, etc.)"""
        characteristics = {
            "pdf_preference": {"selected": 0, "total": 0},
            "free_vs_paywalled": {"free_selected": 0, "paywalled_selected": 0},
            "institutional_preference": {"institutional": 0, "commercial": 0},
            "direct_vs_aggregator": {"direct": 0, "aggregator": 0}
        }

        institutional_domains = ['.edu', '.gov', '.mil', 'archive.org', 'jstor.org', 'dtic.mil']
        aggregator_domains = ['scholar.google.com', 'researchgate.net', 'academia.edu', 'goodreads.com']

        for ref in self.references:
            user_primary = ref.get('user_selections', {}).get('primary', {})
            if not user_primary.get('url'):
                continue

            url = user_primary['url'].lower()

            # PDF preference
            characteristics["pdf_preference"]["total"] += 1
            if url.endswith('.pdf') or 'filetype=pdf' in url:
                characteristics["pdf_preference"]["selected"] += 1

            # Institutional preference
            if any(inst in url for inst in institutional_domains):
                characteristics["institutional_preference"]["institutional"] += 1
            else:
                characteristics["institutional_preference"]["commercial"] += 1

            # Aggregator avoidance
            if any(agg in url for agg in aggregator_domains):
                characteristics["direct_vs_aggregator"]["aggregator"] += 1
            else:
                characteristics["direct_vs_aggregator"]["direct"] += 1

        # Calculate percentages
        total_refs = len([r for r in self.references if r.get('user_selections', {}).get('primary')])
        if total_refs > 0:
            characteristics["pdf_preference"]["percentage"] = \
                round(characteristics["pdf_preference"]["selected"] / total_refs * 100, 1)
            characteristics["institutional_preference"]["percentage"] = \
                round(characteristics["institutional_preference"]["institutional"] / total_refs * 100, 1)
            characteristics["direct_vs_aggregator"]["percentage_direct"] = \
                round(characteristics["direct_vs_aggregator"]["direct"] / total_refs * 100, 1)

        self.patterns["url_characteristics"] = characteristics

    def _analyze_ai_failure_modes(self):
        """Identify specific ways AI recommendations fail"""
        failure_modes = defaultdict(list)

        for ref in self.references:
            if not ref.get('override'):
                continue

            ai_rec = ref.get('autorank', {}).get('ai_primary', {})
            user_sel = ref.get('user_selections', {}).get('primary', {})

            if not ai_rec or not user_sel:
                continue

            # Analyze what went wrong
            ai_url = ai_rec.get('url', '').lower()
            user_url = user_sel.get('url', '').lower()
            ai_domain = ai_rec.get('domain') or self._extract_domain(ai_url)

            # Failure mode: Recommended aggregator
            if any(agg in ai_url for agg in ['scholar.google.com', 'researchgate.net', 'academia.edu']):
                failure_modes["recommended_aggregator"].append({
                    "ref_id": ref.get('id'),
                    "ai_url": ai_rec.get('url'),
                    "user_url": user_sel.get('url'),
                    "ai_scores": f"P:{ai_rec.get('primary_score')}, S:{ai_rec.get('secondary_score')}"
                })

            # Failure mode: Recommended paywalled over free
            elif 'archive.org' in user_url and 'archive.org' not in ai_url:
                failure_modes["missed_free_archive"].append({
                    "ref_id": ref.get('id'),
                    "ai_domain": ai_domain,
                    "user_found_in": "archive.org"
                })

            # Failure mode: Unknown CDN over known publisher
            elif 'cdn.' in ai_domain and any(pub in user_url for pub in ['.edu', 'sage', 'oup', 'jstor']):
                failure_modes["unknown_cdn_over_publisher"].append({
                    "ref_id": ref.get('id'),
                    "ai_cdn": ai_domain,
                    "user_publisher": user_sel.get('domain') or self._extract_domain(user_url)
                })

            # Failure mode: Article ABOUT work instead of work itself
            elif ai_rec.get('primary_score', 0) < 80 and 'review' in ai_url:
                failure_modes["article_about_work"].append({
                    "ref_id": ref.get('id'),
                    "ai_url": ai_rec.get('url')
                })

        self.patterns["ai_failure_modes"] = dict(failure_modes)

    def _build_confidence_predictors(self):
        """Build predictors for which references will need manual review"""
        predictors = {
            "high_confidence_indicators": [],
            "low_confidence_indicators": [],
            "exception_patterns": []
        }

        # Analyze what makes AI successful
        for ref in self.references:
            if ref.get('override'):
                # AI failed - what were the warning signs?
                ai_rec = ref.get('autorank', {}).get('ai_primary', {})
                if ai_rec:
                    # Low scores predict failure
                    if ai_rec.get('primary_score', 0) < 80:
                        predictors["low_confidence_indicators"].append("Primary score < 80")
                    if ai_rec.get('secondary_score', 0) < 60:
                        predictors["low_confidence_indicators"].append("Secondary score < 60")
            else:
                # AI succeeded - what were the success factors?
                ai_rec = ref.get('autorank', {}).get('ai_primary', {})
                if ai_rec:
                    if ai_rec.get('primary_score', 0) >= 90:
                        predictors["high_confidence_indicators"].append("Primary score >= 90")

        # Deduplicate and count
        predictors["high_confidence_indicators"] = dict(Counter(predictors["high_confidence_indicators"]))
        predictors["low_confidence_indicators"] = dict(Counter(predictors["low_confidence_indicators"]))

        self.patterns["confidence_predictors"] = predictors

    def _build_confidence_model(self):
        """Build a simple confidence model for future predictions"""
        model = {
            "auto_finalize_threshold": {
                "primary_score": 95,
                "secondary_score": 80,
                "must_be_in_preferred_domains": True
            },
            "flag_for_review_threshold": {
                "primary_score_below": 70,
                "secondary_score_below": 60,
                "or_unknown_domain": True
            },
            "preferred_domain_list": []
        }

        # Extract preferred domains from analysis
        if "highly_preferred" in self.patterns.get("domain_preferences", {}):
            model["preferred_domain_list"] = [
                domain for domain, stats in self.patterns["domain_preferences"]["highly_preferred"]
            ]

        return model

    def _generate_prompt_refinements(self):
        """Generate specific prompt refinements based on patterns"""
        refinements = []

        # Domain-based refinements
        if "highly_preferred" in self.patterns.get("domain_preferences", {}):
            preferred = self.patterns["domain_preferences"]["highly_preferred"][:5]
            if preferred:
                refinements.append({
                    "priority": "HIGH",
                    "target": "llm-rank.ts PRIMARY CRITERIA",
                    "action": "Add explicit domain bonuses",
                    "code": f"// Preferred domains (learned from user): {', '.join([d for d, _ in preferred])}\n" +
                            "\n".join([f"if (url.includes('{domain}')): +{15 + (5-i)*5} points"
                                      for i, (domain, _) in enumerate(preferred)])
                })

        # Failure mode refinements
        failure_modes = self.patterns.get("ai_failure_modes", {})
        if "recommended_aggregator" in failure_modes and len(failure_modes["recommended_aggregator"]) > 2:
            refinements.append({
                "priority": "HIGH",
                "target": "llm-rank.ts PENALTIES",
                "action": "Increase aggregator penalty",
                "code": "if (url.includes('scholar.google.com') || url.includes('researchgate.net')):\n" +
                        "  PRIMARY score = max(40)  // Hard cap, not just penalty"
            })

        if "unknown_cdn_over_publisher" in failure_modes and failure_modes["unknown_cdn_over_publisher"]:
            refinements.append({
                "priority": "MEDIUM",
                "target": "llm-rank.ts PENALTIES",
                "action": "Penalize unknown CDN domains",
                "code": "if (domain.startswith('cdn.') and domain not in known_cdn_list):\n" +
                        "  PRIMARY score -= 40"
            })

        # Characteristic-based refinements
        chars = self.patterns.get("url_characteristics", {})
        if chars.get("pdf_preference", {}).get("percentage", 0) > 70:
            refinements.append({
                "priority": "MEDIUM",
                "target": "llm-rank.ts PRIMARY CRITERIA",
                "action": "Increase PDF bonus",
                "code": "if (url.endswith('.pdf')):\n  PRIMARY score += 15  // Increased from +10"
            })

        self.patterns["prompt_refinements"] = refinements

    def _prioritize_improvements(self):
        """Prioritize which improvements to implement first"""
        recommendations = []

        # Check override rate from failure modes
        failure_modes = self.patterns.get("ai_failure_modes", {})
        total_failures = sum(len(failures) for failures in failure_modes.values())

        if total_failures > 0:
            # Prioritize by frequency
            for mode, failures in sorted(failure_modes.items(), key=lambda x: len(x[1]), reverse=True):
                if len(failures) > 1:
                    recommendations.append({
                        "priority": "HIGH" if len(failures) > 3 else "MEDIUM",
                        "issue": mode.replace('_', ' ').title(),
                        "frequency": len(failures),
                        "impact": f"Fixing this could reduce override rate by ~{len(failures) / total_failures * 100:.0f}%"
                    })

        return recommendations


def print_learning_analysis(analysis: Dict[str, Any]):
    """Print formatted learning pattern analysis"""
    print("\n" + "="*80)
    print("LEARNING PATTERN ANALYSIS")
    print("="*80)

    patterns = analysis.get('learning_patterns', {})

    # Domain preferences
    print("\n🌐 DOMAIN PREFERENCES")
    print("-" * 80)
    domain_prefs = patterns.get('domain_preferences', {})

    print("\nHighly Preferred Domains:")
    for domain, stats in domain_prefs.get('highly_preferred', [])[:5]:
        print(f"  ✓ {domain}: User selected {stats['user_selected']} times, " +
              f"AI recommended {stats['ai_recommended']} times (score: +{stats['user_preference_score']})")

    print("\nRejected Domains:")
    for domain, stats in domain_prefs.get('rejected', [])[:5]:
        print(f"  ✗ {domain}: AI recommended but user rejected (score: {stats['user_preference_score']})")

    print("\nTLD Preferences:")
    for tld, stats in list(domain_prefs.get('tld_analysis', {}).items())[:5]:
        print(f"  .{tld}: Selected {stats['selected']} times, Rejected {stats['rejected']} times")

    # URL characteristics
    print("\n📊 URL CHARACTERISTIC PREFERENCES")
    print("-" * 80)
    chars = patterns.get('url_characteristics', {})

    pdf_pref = chars.get('pdf_preference', {})
    print(f"PDF Preference: {pdf_pref.get('percentage', 0):.1f}% " +
          f"({pdf_pref.get('selected', 0)}/{pdf_pref.get('total', 0)} selections were PDFs)")

    inst_pref = chars.get('institutional_preference', {})
    print(f"Institutional Sources: {inst_pref.get('percentage', 0):.1f}% " +
          f"({inst_pref.get('institutional', 0)} institutional vs {inst_pref.get('commercial', 0)} commercial)")

    direct_pref = chars.get('direct_vs_aggregator', {})
    print(f"Direct Sources: {direct_pref.get('percentage_direct', 0):.1f}% " +
          f"({direct_pref.get('direct', 0)} direct vs {direct_pref.get('aggregator', 0)} aggregator)")

    # AI failure modes
    print("\n⚠️  AI FAILURE MODES")
    print("-" * 80)
    failures = patterns.get('ai_failure_modes', {})

    for mode, cases in failures.items():
        if cases:
            print(f"\n{mode.replace('_', ' ').title()}: {len(cases)} occurrences")
            for case in cases[:2]:
                print(f"  Example: Ref #{case.get('ref_id')}")
                if 'ai_url' in case:
                    print(f"    AI: {case['ai_url'][:60]}...")
                    print(f"    User: {case['user_url'][:60]}...")

    # Prompt refinements
    print("\n💡 RECOMMENDED PROMPT REFINEMENTS")
    print("-" * 80)
    for i, refinement in enumerate(patterns.get('prompt_refinements', []), 1):
        print(f"\n{i}. [{refinement['priority']}] {refinement['target']}")
        print(f"   Action: {refinement['action']}")
        print(f"   Code:\n{refinement['code']}")

    # Confidence model
    print("\n🎯 CONFIDENCE MODEL")
    print("-" * 80)
    conf_model = analysis.get('confidence_model', {})

    auto_threshold = conf_model.get('auto_finalize_threshold', {})
    print(f"Auto-Finalize When:")
    print(f"  - Primary Score >= {auto_threshold.get('primary_score')}")
    print(f"  - Secondary Score >= {auto_threshold.get('secondary_score')}")
    if auto_threshold.get('must_be_in_preferred_domains'):
        print(f"  - Domain in preferred list: {conf_model.get('preferred_domain_list', [])[:3]}")

    review_threshold = conf_model.get('flag_for_review_threshold', {})
    print(f"\nFlag for Review When:")
    print(f"  - Primary Score < {review_threshold.get('primary_score_below')}")
    print(f"  - OR Secondary Score < {review_threshold.get('secondary_score_below')}")

    # Next steps
    print("\n🚀 NEXT ITERATION PRIORITIES")
    print("-" * 80)
    recommendations = analysis.get('next_iteration_recommendations', [])
    for i, rec in enumerate(recommendations[:5], 1):
        print(f"\n{i}. [{rec['priority']}] {rec['issue']}")
        print(f"   Frequency: {rec['frequency']} occurrences")
        print(f"   {rec['impact']}")

    print("\n" + "="*80 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_learning_patterns.py <parsed_log.json>")
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
    analyzer = LearningPatternAnalyzer(data)
    analysis = analyzer.analyze()

    # Print results
    print_learning_analysis(analysis)

    # Save detailed analysis
    output_file = input_file.replace('.json', '_learning_analysis.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2)

    print(f"✓ Detailed learning analysis saved to: {output_file}\n")


if __name__ == '__main__':
    main()
