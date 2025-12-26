/**
 * Tier extraction and normalization
 */

import { PricingUnit } from "./units.js";
import { parsePrice } from "./common.js";

export interface PricingTier {
    upTo: number | "Infinity";
    rate: number;
    unit: PricingUnit;
}

/**
 * Extract explicit tiers from AWS pricing dimensions
 * AWS uses implicit tier ranges - we make them explicit
 */
export function extractTiers(
    dimensions: any[],
    unit: PricingUnit
): PricingTier[] {
    if (!dimensions || dimensions.length === 0) {
        throw new Error("No pricing dimensions provided");
    }

    const tiers: PricingTier[] = [];

    for (const dimension of dimensions) {
        const beginRange = dimension.beginRange
            ? parseFloat(dimension.beginRange)
            : 0;
        const endRange = dimension.endRange;

        const upTo =
            endRange === "Inf" || !endRange
                ? "Infinity"
                : parseFloat(endRange);

        const rate = parsePrice(dimension.pricePerUnit?.USD || 0);

        tiers.push({
            upTo,
            rate,
            unit,
        });
    }

    // Sort tiers by upTo value
    tiers.sort((a, b) => {
        if (a.upTo === "Infinity") return 1;
        if (b.upTo === "Infinity") return -1;
        return (a.upTo as number) - (b.upTo as number);
    });

    return tiers;
}

/**
 * Create single-tier pricing (no tiers)
 */
export function createSingleTier(
    rate: number,
    unit: PricingUnit
): PricingTier[] {
    return [
        {
            upTo: "Infinity",
            rate,
            unit,
        },
    ];
}

/**
 * Validate tier structure
 */
export function validateTiers(tiers: PricingTier[]): void {
    if (tiers.length === 0) {
        throw new Error("Tiers array cannot be empty");
    }

    // Last tier must be Infinity
    const lastTier = tiers[tiers.length - 1];
    if (lastTier.upTo !== "Infinity") {
        throw new Error("Last tier must have upTo: Infinity");
    }

    // All rates must be valid numbers
    for (const tier of tiers) {
        if (isNaN(tier.rate) || !isFinite(tier.rate)) {
            throw new Error(`Invalid tier rate: ${tier.rate}`);
        }
    }

    // Tiers must be in ascending order
    for (let i = 0; i < tiers.length - 1; i++) {
        const current = tiers[i].upTo;
        const next = tiers[i + 1].upTo;

        if (current === "Infinity") {
            throw new Error("Infinity tier must be last");
        }

        if (next !== "Infinity" && (current as number) >= (next as number)) {
            throw new Error("Tiers must be in ascending order");
        }
    }
}
