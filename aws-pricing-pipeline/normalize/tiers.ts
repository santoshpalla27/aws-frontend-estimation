import { PricingTier, PricingUnit } from '../schema/base.js';
import { parseAwsPrice } from './units.js';

/**
 * AWS tier description patterns
 * Examples:
 * - "First 10 TB"
 * - "Next 40 TB"
 * - "Over 50 TB"
 * - "Up to 1 million requests"
 */

interface TierRange {
    start: number;
    end: number | 'Infinity';
    rate: number;
}

/**
 * Parse AWS tier description to numeric range
 */
function parseTierDescription(description: string): { boundary: number | null; isInfinity: boolean } {
    const desc = description.toLowerCase().trim();

    // "Over X" or "Greater than X" -> Infinity tier
    if (desc.includes('over') || desc.includes('greater than')) {
        return { boundary: null, isInfinity: true };
    }

    // Extract numeric value
    const match = desc.match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb|million|thousand|billion)?/i);
    if (!match) {
        throw new Error(`[TIER PARSING FAILED] Cannot parse tier description: "${description}"`);
    }

    let value = parseFloat(match[1]!);
    const unit = match[2]?.toLowerCase();

    // Convert to base units (GB for storage, raw number for requests)
    if (unit === 'tb') {
        value *= 1024; // TB to GB
    } else if (unit === 'mb') {
        value /= 1024; // MB to GB
    } else if (unit === 'million') {
        value *= 1_000_000;
    } else if (unit === 'billion') {
        value *= 1_000_000_000;
    } else if (unit === 'thousand') {
        value *= 1_000;
    }

    return { boundary: value, isInfinity: false };
}

/**
 * Expand AWS implicit tiers to explicit tier array
 * 
 * AWS format:
 * [
 *   { beginRange: "0", endRange: "10240", pricePerUnit: "0.09" },
 *   { beginRange: "10240", endRange: "51200", pricePerUnit: "0.085" },
 *   { beginRange: "51200", endRange: "Inf", pricePerUnit: "0.07" }
 * ]
 * 
 * Output format:
 * [
 *   { upTo: 10240, rate: 0.09, unit: "gb" },
 *   { upTo: 51200, rate: 0.085, unit: "gb" },
 *   { upTo: "Infinity", rate: 0.07, unit: "gb" }
 * ]
 */
export function expandTiers(
    awsTiers: Array<{
        beginRange: string;
        endRange: string;
        pricePerUnit: string | number;
    }>,
    unit: PricingUnit
): PricingTier[] {
    if (awsTiers.length === 0) {
        throw new Error('[TIER EXPANSION FAILED] Empty tier array');
    }

    const tiers: PricingTier[] = [];

    for (const awsTier of awsTiers) {
        const endRange = awsTier.endRange;
        const rate = parseAwsPrice(awsTier.pricePerUnit);

        let upTo: number | 'Infinity';

        if (endRange === 'Inf' || endRange === 'Infinity' || endRange === '') {
            upTo = 'Infinity';
        } else {
            upTo = parseFloat(endRange);
            if (!Number.isFinite(upTo)) {
                throw new Error(`[TIER EXPANSION FAILED] Invalid endRange: "${endRange}"`);
            }
        }

        tiers.push({ upTo, rate, unit });
    }

    // Validate tier continuity
    for (let i = 0; i < tiers.length - 1; i++) {
        const current = tiers[i]!;
        const next = tiers[i + 1]!;

        if (current.upTo === 'Infinity') {
            throw new Error(`[TIER EXPANSION FAILED] Infinity tier must be last, found at index ${i}`);
        }
    }

    const lastTier = tiers[tiers.length - 1]!;
    if (lastTier.upTo !== 'Infinity') {
        throw new Error(`[TIER EXPANSION FAILED] Last tier must have upTo="Infinity", got: ${lastTier.upTo}`);
    }

    return tiers;
}

/**
 * Create simple tier from single price
 */
export function createSimpleTier(rate: number, unit: PricingUnit): PricingTier[] {
    return [{ upTo: 'Infinity', rate, unit }];
}
