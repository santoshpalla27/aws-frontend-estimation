/**
 * Core type definitions for AWS Cost Engine
 */

export type Cloud = "aws" | "azure" | "gcp";
export type PricingUnit = "hour" | "gb" | "request" | "transition" | "flat";

/**
 * Global context for cost calculations
 * Centralizes all temporal and regional assumptions
 */
export interface GlobalContext {
    cloud: Cloud;
    region: string;
    currency: string;
    pricingVersion: string;
    hoursPerMonth: number; // Centralized temporal assumption (e.g., 730)
}

/**
 * Pricing tier for tiered pricing models
 */
export interface PricingTier {
    upTo: number | "Infinity";
    rate: number;
    unit: PricingUnit;
}

/**
 * Cost line item with full provenance
 */
export interface CostLineItem {
    service: string;
    component: string;
    description: string;
    quantity: number;
    unit: PricingUnit;
    rate: number;
    cost: number;
    triggeredBy: string[]; // Multi-node provenance
}

/**
 * Architecture node in the dependency graph
 */
export interface ArchitectureNode {
    id: string;
    type: string;
    service: string;
    config: Record<string, any>;
    dependencies: string[];
    conflicts: string[];
}

/**
 * Cost breakdown by service
 */
export interface CostBreakdown {
    total: number;
    byService: Map<string, CostLineItem[]>;
    lineItems: CostLineItem[];
}

/**
 * Default global context
 */
export const DEFAULT_CONTEXT: GlobalContext = {
    cloud: "aws",
    region: "us-east-1",
    currency: "USD",
    pricingVersion: "v1",
    hoursPerMonth: 730, // 365 days / 12 months * 24 hours
};
