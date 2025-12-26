/**
 * Cloud service plugin interface
 * All service implementations must implement this interface
 */

import { ArchitectureNode } from "../core/types";
import { GlobalContext, CostLineItem } from "../core/types";
import { ArchitectureGraph } from "../engine/architecture/graph";

export interface CloudServicePlugin {
    /**
     * Service name (e.g., "ec2", "vpc", "s3")
     */
    service: string;

    /**
     * Create architecture nodes from configuration
     * 
     * @param config - Service-specific configuration
     * @returns Array of architecture nodes
     */
    createNodes(config: any): ArchitectureNode[];

    /**
     * Validate service configuration
     * 
     * @param config - Service-specific configuration
     * @throws Error if configuration is invalid
     */
    validateConfig(config: any): void;

    /**
     * Calculate costs for service nodes
     * 
     * @param nodes - Nodes for this service
     * @param context - Global context
     * @param graph - Full architecture graph (for cross-service dependencies)
     * @returns Array of cost line items
     */
    calculateCost(
        nodes: ArchitectureNode[],
        context: GlobalContext,
        graph: ArchitectureGraph
    ): Promise<CostLineItem[]>;
}

/**
 * Base plugin class with common utilities
 */
export abstract class BaseServicePlugin implements CloudServicePlugin {
    abstract service: string;
    abstract createNodes(config: any): ArchitectureNode[];
    abstract validateConfig(config: any): void;
    abstract calculateCost(
        nodes: ArchitectureNode[],
        context: GlobalContext,
        graph: ArchitectureGraph
    ): Promise<CostLineItem[]>;

    /**
     * Helper to create cost line item
     */
    protected createCostItem(
        component: string,
        description: string,
        quantity: number,
        unit: any,
        rate: number,
        cost: number,
        triggeredBy: string[]
    ): CostLineItem {
        return {
            service: this.service,
            component,
            description,
            quantity,
            unit,
            rate,
            cost,
            triggeredBy,
        };
    }

    /**
     * Helper to validate required config fields
     */
    protected validateRequired(config: any, fields: string[]): void {
        for (const field of fields) {
            if (!(field in config)) {
                throw new Error(
                    `Missing required field '${field}' in ${this.service} config`
                );
            }
        }
    }
}
