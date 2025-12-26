/**
 * Cost calculation engine
 * Orchestrates cost calculations across all service plugins
 */

import { GlobalContext, CostLineItem, CostBreakdown } from "../core/types.ts";
import { ArchitectureGraph } from "./architecture/graph.ts";
import { CloudServicePlugin } from "../services/plugin.ts";

export class CostCalculator {
    constructor(
        private plugins: CloudServicePlugin[],
        private context: GlobalContext
    ) { }

    /**
     * Calculate costs for entire architecture
     * 
     * @param graph - Architecture graph
     * @returns All cost line items
     */
    async calculate(graph: ArchitectureGraph): Promise<CostLineItem[]> {
        const allCosts: CostLineItem[] = [];

        // Validate graph is acyclic before calculation
        graph.validateAcyclic();

        for (const plugin of this.plugins) {
            const nodes = graph.getNodesByService(plugin.service);

            if (nodes.length === 0) {
                continue;
            }

            const costs = await plugin.calculateCost(nodes, this.context, graph);
            allCosts.push(...costs);
        }

        return allCosts;
    }

    /**
     * Get total cost across all line items
     * 
     * @param costs - Cost line items
     * @returns Total cost
     */
    getTotalCost(costs: CostLineItem[]): number {
        return costs.reduce((sum, item) => sum + item.cost, 0);
    }

    /**
     * Group costs by service
     * 
     * @param costs - Cost line items
     * @returns Map of service to cost items
     */
    groupByService(costs: CostLineItem[]): Map<string, CostLineItem[]> {
        const grouped = new Map<string, CostLineItem[]>();

        for (const cost of costs) {
            if (!grouped.has(cost.service)) {
                grouped.set(cost.service, []);
            }
            grouped.get(cost.service)!.push(cost);
        }

        return grouped;
    }

    /**
     * Group costs by component
     * 
     * @param costs - Cost line items
     * @returns Map of component to cost items
     */
    groupByComponent(costs: CostLineItem[]): Map<string, CostLineItem[]> {
        const grouped = new Map<string, CostLineItem[]>();

        for (const cost of costs) {
            if (!grouped.has(cost.component)) {
                grouped.set(cost.component, []);
            }
            grouped.get(cost.component)!.push(cost);
        }

        return grouped;
    }

    /**
     * Get cost breakdown with totals
     * 
     * @param graph - Architecture graph
     * @returns Complete cost breakdown
     */
    async getBreakdown(graph: ArchitectureGraph): Promise<CostBreakdown> {
        const lineItems = await this.calculate(graph);
        const total = this.getTotalCost(lineItems);
        const byService = this.groupByService(lineItems);

        return {
            total,
            byService,
            lineItems,
        };
    }

    /**
     * Get costs triggered by specific node
     * 
     * @param costs - Cost line items
     * @param nodeId - Node ID
     * @returns Costs triggered by node
     */
    getCostsForNode(costs: CostLineItem[], nodeId: string): CostLineItem[] {
        return costs.filter((cost) => cost.triggeredBy.includes(nodeId));
    }

    /**
     * Update context (e.g., change region)
     * 
     * @param updates - Partial context updates
     */
    updateContext(updates: Partial<GlobalContext>): void {
        this.context = { ...this.context, ...updates };
    }

    /**
     * Get current context
     */
    getContext(): GlobalContext {
        return { ...this.context };
    }
}

