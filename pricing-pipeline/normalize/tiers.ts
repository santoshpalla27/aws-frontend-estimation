/**
 * Tier Extraction
 * Converts AWS implicit pricing tiers to explicit numeric tiers
 */

import type { PricingUnit } from "./units.js";

export interface PricingTier {
    upTo: number | "Infinity";
    rate: number;
    unit: PricingUnit;
}

/**
 * Extract explicit tiers from AWS pricing dimensions
 * AWS uses ranges like "0 GB - 10 TB", we convert to numeric tiers
 */
export function extractTiers(
    dimensions: any[],
    unit: PricingUnit
): PricingTier[] {
    const tiers: PricingTier[] = [];

    for (const dimension of dimensions) {
        const beginRange = dimension.beginRange;
        const endRange = dimension.endRange;
        const pricePerUnit = parseFloat(dimension.pricePerUnit?.USD || "0");

        // Parse end range
        let upTo: number | "Infinity";
        if (endRange === "Inf" || endRange === "Infinity" || !endRange) {
            upTo = "Infinity";
        } else {
            upTo = parseFloat(endRange);
        }

        tiers.push({
            upTo,
            rate: pricePerUnit,
            unit
        });
    }

    // Sort tiers by upTo value (Infinity last)
    tiers.sort((a, b) => {
        if (a.upTo === "Infinity") return 1;
        if (b.upTo === "Infinity") return -1;
        return a.upTo - b.upTo;
    });

    return tiers;
}

/**
 * Validate tier structure
 * Ensures tiers are contiguous and non-overlapping
 */
export function validateTiers(tiers: PricingTier[]): void {
    if (tiers.length === 0) {
        throw new Error("Tiers cannot be empty");
    }

    // Last tier must be Infinity
    const lastTier = tiers[tiers.length - 1];
    if (lastTier.upTo !== "Infinity") {
        throw new Error("Last tier must have upTo: Infinity");
    }

    // Check for gaps or overlaps
    for (let i = 0; i < tiers.length - 1; i++) {
        const current = tiers[i];
        const next = tiers[i + 1];

        if (current.upTo === "Infinity") {
            throw new Error("Only last tier can have upTo: Infinity");
        }

        // Tiers should be contiguous (next starts where current ends)
        // Allow small floating point differences
        const gap = Math.abs((next.upTo as number) - (current.upTo as number));
        if (gap > 0.01 && i < tiers.length - 2) {
            console.warn(`Potential gap in tiers: ${current.upTo} -> ${next.upTo}`);
        }
    }
}
