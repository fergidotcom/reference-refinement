/**
 * Cost Tracking Module
 * Tracks Claude API calls and Google Search costs
 */

import fs from 'fs/promises';

class CostTracker {
    constructor() {
        this.costs = {
            claude: {
                calls: 0,
                input_tokens: 0,
                output_tokens: 0,
                cost_per_input_token: 0, // Will be set by user
                cost_per_output_token: 0, // Will be set by user
                total_cost: 0
            },
            google: {
                queries: 0,
                cost_per_query: 0, // Will be set by user
                total_cost: 0
            },
            session_start: new Date().toISOString(),
            operations: []
        };
    }

    /**
     * Set pricing information
     */
    setPricing(claudeInputCost, claudeOutputCost, googleQueryCost) {
        this.costs.claude.cost_per_input_token = claudeInputCost;
        this.costs.claude.cost_per_output_token = claudeOutputCost;
        this.costs.google.cost_per_query = googleQueryCost;
    }

    /**
     * Track a Claude API call
     */
    trackClaude(operation, inputTokens, outputTokens, cost = null) {
        this.costs.claude.calls++;
        this.costs.claude.input_tokens += inputTokens;
        this.costs.claude.output_tokens += outputTokens;

        const calculatedCost = cost || (
            (inputTokens * this.costs.claude.cost_per_input_token) +
            (outputTokens * this.costs.claude.cost_per_output_token)
        );

        this.costs.claude.total_cost += calculatedCost;

        this.costs.operations.push({
            type: 'claude',
            operation,
            timestamp: new Date().toISOString(),
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost: calculatedCost
        });
    }

    /**
     * Track a Google Search query
     */
    trackGoogle(operation, numQueries, cost = null) {
        this.costs.google.queries += numQueries;

        const calculatedCost = cost || (numQueries * this.costs.google.cost_per_query);
        this.costs.google.total_cost += calculatedCost;

        this.costs.operations.push({
            type: 'google',
            operation,
            timestamp: new Date().toISOString(),
            queries: numQueries,
            cost: calculatedCost
        });
    }

    /**
     * Get current totals
     */
    getTotals() {
        return {
            total_cost: this.costs.claude.total_cost + this.costs.google.total_cost,
            claude_cost: this.costs.claude.total_cost,
            google_cost: this.costs.google.total_cost,
            claude_calls: this.costs.claude.calls,
            google_queries: this.costs.google.queries,
            claude_input_tokens: this.costs.claude.input_tokens,
            claude_output_tokens: this.costs.claude.output_tokens
        };
    }

    /**
     * Generate cost report
     */
    generateReport() {
        const totals = this.getTotals();

        let report = '═══════════════════════════════════════════════════\n';
        report += '           SESSION COST ANALYSIS REPORT\n';
        report += '═══════════════════════════════════════════════════\n\n';

        report += `Session Started: ${this.costs.session_start}\n`;
        report += `Report Generated: ${new Date().toISOString()}\n\n`;

        report += '─────────────────────────────────────────────────\n';
        report += '  TOTALS\n';
        report += '─────────────────────────────────────────────────\n';
        report += `Total Cost: $${totals.total_cost.toFixed(4)}\n`;
        report += `  Claude API: $${totals.claude_cost.toFixed(4)}\n`;
        report += `  Google Search: $${totals.google_cost.toFixed(4)}\n\n`;

        report += '─────────────────────────────────────────────────\n';
        report += '  CLAUDE API USAGE\n';
        report += '─────────────────────────────────────────────────\n';
        report += `API Calls: ${totals.claude_calls}\n`;
        report += `Input Tokens: ${totals.claude_input_tokens.toLocaleString()}\n`;
        report += `Output Tokens: ${totals.claude_output_tokens.toLocaleString()}\n`;
        report += `Total Tokens: ${(totals.claude_input_tokens + totals.claude_output_tokens).toLocaleString()}\n`;
        report += `Cost per Call (avg): $${(totals.claude_cost / Math.max(1, totals.claude_calls)).toFixed(4)}\n`;
        report += `Cost per 1K Input Tokens: $${(this.costs.claude.cost_per_input_token * 1000).toFixed(4)}\n`;
        report += `Cost per 1K Output Tokens: $${(this.costs.claude.cost_per_output_token * 1000).toFixed(4)}\n\n`;

        report += '─────────────────────────────────────────────────\n';
        report += '  GOOGLE SEARCH USAGE\n';
        report += '─────────────────────────────────────────────────\n';
        report += `Queries: ${totals.google_queries}\n`;
        report += `Cost per Query: $${this.costs.google.cost_per_query.toFixed(4)}\n\n`;

        if (this.costs.operations.length > 0) {
            report += '─────────────────────────────────────────────────\n';
            report += '  OPERATION BREAKDOWN\n';
            report += '─────────────────────────────────────────────────\n';

            for (const op of this.costs.operations) {
                report += `\n[${new Date(op.timestamp).toLocaleTimeString()}] ${op.type.toUpperCase()}: ${op.operation}\n`;

                if (op.type === 'claude') {
                    report += `  Tokens: ${op.input_tokens} in / ${op.output_tokens} out\n`;
                } else if (op.type === 'google') {
                    report += `  Queries: ${op.queries}\n`;
                }

                report += `  Cost: $${op.cost.toFixed(4)}\n`;
            }
        }

        report += '\n═══════════════════════════════════════════════════\n';

        return report;
    }

    /**
     * Save cost data to JSON file
     */
    async save(filename = 'cost-tracking.json') {
        await fs.writeFile(filename, JSON.stringify(this.costs, null, 2));
    }

    /**
     * Load cost data from JSON file
     */
    async load(filename = 'cost-tracking.json') {
        try {
            const data = await fs.readFile(filename, 'utf-8');
            this.costs = JSON.parse(data);
        } catch (error) {
            // File doesn't exist, start fresh
            console.log('No existing cost tracking data found, starting fresh');
        }
    }
}

export { CostTracker };
