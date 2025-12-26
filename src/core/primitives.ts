/**
 * Pricing primitives for cost calculations
 * All temporal logic is centralized through GlobalContext
 */

import { GlobalContext, PricingTier, PricingUnit } from "./types";

export class PricingPrimitives {
    /**
     * Calculate hourly cost using centralized time assumptions from GlobalContext
     * Prevents plugins from inventing their own temporal logic
     * 
     * @param quantity - Number of resources
     * @param rate - Hourly rate per resource
     * @param ctx - Global context with hoursPerMonth
     * @returns Monthly cost
     */
    static hourly(quantity: number, rate: number, ctx: GlobalContext): number {
        return quantity * rate * ctx.hoursPerMonth;
    }

    /**
     * Calculate cost per GB
     * 
     * @param gb - Gigabytes
     * @param rate - Rate per GB
     * @returns Total cost
     */
    static perGB(gb: number, rate: number): number {
        return gb * rate;
    }

    /**
     * Calculate cost per request
     * 
     * @param requests - Number of requests
     * @param rate - Rate per request
     * @returns Total cost
     */
    static perRequest(requests: number, rate: number): number {
        return requests * rate;
    }

    /**
     * Calculate tiered pricing
     * Handles explicit tier ranges with proper accumulation
     * 
     * @param quantity - Total quantity to price
     * @param tiers - Explicit pricing tiers
     * @returns Total cost across all tiers
     */
    static tiered(quantity: number, tiers: PricingTier[]): number {
        if (tiers.length === 0) {
            throw new Error("Tiers array cannot be empty");
        }

        let cost = 0;
        let remaining = quantity;
        let previousUpTo = 0;

        for (const tier of tiers) {
            if (remaining <= 0) break;

            const tierSize =
                tier.upTo === "Infinity"
                    ? remaining
                    : Math.min(remaining, tier.upTo - previousUpTo);

            cost += tierSize * tier.rate;
            remaining -= tierSize;

            if (tier.upTo !== "Infinity") {
                previousUpTo = tier.upTo;
            }
        }

        return cost;
    }

    /**
     * Calculate flat/one-time cost
     * 
     * @param rate - Flat rate
     * @returns Flat cost
     */
    static flat(rate: number): number {
        return rate;
    }

    /**
     * Validate all rates are valid numbers
     */
    private static validateRate(rate: number, context: string): void {
        if (isNaN(rate) || !isFinite(rate) || rate < 0) {
            throw new Error(`Invalid rate in ${context}: ${rate}`);
        }
    }

    /**
     * Validate quantity is valid
     */
    private static validateQuantity(quantity: number, context: string): void {
        if (isNaN(quantity) || !isFinite(quantity) || quantity < 0) {
            throw new Error(`Invalid quantity in ${context}: ${quantity}`);
        }
    }
}
