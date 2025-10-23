#!/usr/bin/env python3
"""
Batch Comparison Tool for Reference Refinement System Log Analysis

Compares analysis results across multiple batches to track improvement over time.

Usage:
    python compare_batches.py batch1_analysis.json batch2_analysis.json [batch3_analysis.json ...]

Generates:
- Improvement trends
- Metric comparisons
- Progress toward goals
"""

import json
import sys
from typing import List, Dict, Any
from datetime import datetime


class BatchComparator:
    """Compares multiple batch analyses"""

    def __init__(self, batch_files: List[str]):
        self.batches = []
        for i, file_path in enumerate(batch_files, 1):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    data['batch_number'] = i
                    data['file_name'] = file_path
                    self.batches.append(data)
            except Exception as e:
                print(f"Warning: Could not load {file_path}: {e}")

    def compare(self) -> Dict[str, Any]:
        """Generate comparison report"""
        if len(self.batches) < 2:
            return {"error": "Need at least 2 batches to compare"}

        comparison = {
            "batches_analyzed": len(self.batches),
            "metrics_over_time": self._track_metrics(),
            "improvement_analysis": self._analyze_improvement(),
            "goal_progress": self._check_goals()
        }

        return comparison

    def _track_metrics(self) -> Dict[str, List]:
        """Track key metrics across batches"""
        metrics = {
            "batch_number": [],
            "total_references": [],
            "override_rate": [],
            "finalization_rate": [],
            "total_queries": [],
            "ineffective_queries_pct": []
        }

        for batch in self.batches:
            summary = batch.get('summary', {})
            query_eff = batch.get('query_effectiveness', {})

            metrics['batch_number'].append(batch['batch_number'])
            metrics['total_references'].append(summary.get('total_references', 0))
            metrics['override_rate'].append(summary.get('override_rate', 0))
            metrics['finalization_rate'].append(summary.get('finalization_rate', 0))
            metrics['total_queries'].append(query_eff.get('total_unique_queries', 0))

            # Calculate ineffective query percentage
            total_q = query_eff.get('total_unique_queries', 0)
            ineffective_q = len(query_eff.get('ineffective_queries', []))
            ineffective_pct = (ineffective_q / total_q * 100) if total_q > 0 else 0
            metrics['ineffective_queries_pct'].append(round(ineffective_pct, 1))

        return metrics

    def _analyze_improvement(self) -> Dict[str, Any]:
        """Analyze improvement from first to last batch"""
        if len(self.batches) < 2:
            return {}

        first = self.batches[0]['summary']
        last = self.batches[-1]['summary']

        override_change = last.get('override_rate', 0) - first.get('override_rate', 0)
        finalization_change = last.get('finalization_rate', 0) - first.get('finalization_rate', 0)

        return {
            "override_rate_change": round(override_change, 1),
            "override_rate_improvement": override_change < 0,
            "finalization_rate_change": round(finalization_change, 1),
            "finalization_rate_improvement": finalization_change > 0,
            "batches_compared": f"Batch {self.batches[0]['batch_number']} → Batch {self.batches[-1]['batch_number']}",
            "interpretation": self._interpret_improvement(override_change)
        }

    def _interpret_improvement(self, override_change: float) -> str:
        """Interpret the improvement"""
        if override_change < -20:
            return "EXCELLENT: Major reduction in overrides. System learning user preferences."
        elif override_change < -10:
            return "GOOD: Significant improvement. Continue current approach."
        elif override_change < -5:
            return "MODERATE: Some improvement. May need additional tuning."
        elif override_change < 0:
            return "SLIGHT: Minor improvement. Consider different refinement approach."
        elif override_change == 0:
            return "NO CHANGE: Refinements not affecting override rate. Review prompt changes."
        else:
            return "REGRESSION: Override rate increased. Review recent changes."

    def _check_goals(self) -> Dict[str, Any]:
        """Check progress toward automation goals"""
        if not self.batches:
            return {}

        latest = self.batches[-1]['summary']
        override_rate = latest.get('override_rate', 100)

        goals = {
            "override_rate": {
                "current": override_rate,
                "target": 30,
                "progress": round(max(0, (100 - override_rate) / 70 * 100), 1),
                "status": self._goal_status(override_rate, 30, lower_is_better=True)
            },
            "ready_for_automation": override_rate < 30,
            "estimated_batches_to_goal": self._estimate_batches_to_goal(override_rate)
        }

        return goals

    def _goal_status(self, current: float, target: float, lower_is_better: bool = False) -> str:
        """Determine goal status"""
        if lower_is_better:
            if current <= target:
                return "✓ ACHIEVED"
            elif current <= target * 1.5:
                return "◐ CLOSE"
            else:
                return "○ IN PROGRESS"
        else:
            if current >= target:
                return "✓ ACHIEVED"
            elif current >= target * 0.8:
                return "◐ CLOSE"
            else:
                return "○ IN PROGRESS"

    def _estimate_batches_to_goal(self, current_override_rate: float) -> str:
        """Estimate how many more batches needed to reach goal"""
        if current_override_rate < 30:
            return "Goal already achieved!"

        if len(self.batches) < 2:
            return "Need more batches to estimate"

        # Calculate average improvement per batch
        first_rate = self.batches[0]['summary'].get('override_rate', 100)
        total_improvement = first_rate - current_override_rate
        batches_so_far = len(self.batches)
        avg_improvement_per_batch = total_improvement / batches_so_far if batches_so_far > 0 else 0

        if avg_improvement_per_batch <= 0:
            return "No improvement trend detected"

        remaining = current_override_rate - 30
        batches_needed = remaining / avg_improvement_per_batch

        if batches_needed <= 1:
            return "1-2 more batches"
        elif batches_needed <= 3:
            return f"~{int(batches_needed)} more batches"
        else:
            return f"~{int(batches_needed)} more batches (consider faster refinement)"


def print_comparison_report(comparison: Dict[str, Any]):
    """Print formatted comparison report"""
    print("\n" + "="*80)
    print("BATCH COMPARISON REPORT")
    print("="*80)

    if "error" in comparison:
        print(f"\nError: {comparison['error']}")
        return

    print(f"\n📈 ANALYZING {comparison['batches_analyzed']} BATCHES")
    print("-" * 80)

    # Metrics over time
    metrics = comparison['metrics_over_time']
    print("\nMetrics Over Time:")
    print(f"{'Batch':>8} {'Refs':>6} {'Override%':>12} {'Finalized%':>12} {'Queries':>8} {'Ineffective%':>14}")
    print("-" * 80)

    for i in range(len(metrics['batch_number'])):
        print(f"{metrics['batch_number'][i]:>8} "
              f"{metrics['total_references'][i]:>6} "
              f"{metrics['override_rate'][i]:>11.1f}% "
              f"{metrics['finalization_rate'][i]:>11.1f}% "
              f"{metrics['total_queries'][i]:>8} "
              f"{metrics['ineffective_queries_pct'][i]:>13.1f}%")

    # Improvement analysis
    improvement = comparison['improvement_analysis']
    print(f"\n📊 IMPROVEMENT ANALYSIS")
    print("-" * 80)
    print(f"Comparison: {improvement.get('batches_compared', 'N/A')}")
    print(f"\nOverride Rate Change: {improvement.get('override_rate_change', 0):+.1f}%")
    if improvement.get('override_rate_improvement'):
        print("  ✓ Improved (lower is better)")
    else:
        print("  ✗ Regression (higher is worse)")

    print(f"\nFinalization Rate Change: {improvement.get('finalization_rate_change', 0):+.1f}%")
    if improvement.get('finalization_rate_improvement'):
        print("  ✓ Improved (higher is better)")

    print(f"\nInterpretation: {improvement.get('interpretation', 'N/A')}")

    # Goal progress
    goals = comparison['goal_progress']
    print(f"\n🎯 GOAL PROGRESS")
    print("-" * 80)

    override_goal = goals.get('override_rate', {})
    print(f"Override Rate: {override_goal.get('current', 0):.1f}% "
          f"(Target: {override_goal.get('target', 30)}%) "
          f"[{override_goal.get('status', 'N/A')}]")
    print(f"Progress to Goal: {override_goal.get('progress', 0):.1f}%")

    print(f"\nAutomation Ready: {'YES ✓' if goals.get('ready_for_automation') else 'NO ✗'}")
    print(f"Estimated to Goal: {goals.get('estimated_batches_to_goal', 'N/A')}")

    print("\n" + "="*80 + "\n")


def main():
    if len(sys.argv) < 3:
        print("Usage: python compare_batches.py batch1_analysis.json batch2_analysis.json [batch3_analysis.json ...]")
        print("\nExample:")
        print("  python compare_batches.py batch1_analysis.json batch2_analysis.json batch3_analysis.json")
        sys.exit(1)

    batch_files = sys.argv[1:]

    print(f"Loading {len(batch_files)} batch analysis files...")
    comparator = BatchComparator(batch_files)

    print(f"Successfully loaded {len(comparator.batches)} batches")

    comparison = comparator.compare()
    print_comparison_report(comparison)

    # Save detailed comparison
    output_file = "batch_comparison.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(comparison, f, indent=2)

    print(f"✓ Detailed comparison saved to: {output_file}\n")


if __name__ == '__main__':
    main()
