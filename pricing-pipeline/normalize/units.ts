/**
 * Unit normalization for AWS pricing
 */

export type PricingUnit = "hour" | "gb" | "request" | "transition" | "flat";

/**
 * Map AWS pricing units to normalized primitives
 */
export function normalizeUnit(awsUnit: string): PricingUnit {
    const normalized = awsUnit.toLowerCase().trim();

    // Hourly units
    if (
        normalized.includes("hrs") ||
        normalized.includes("hour") ||
        normalized === "quantity"
    ) {
        return "hour";
    }

    // Storage units
    if (
        normalized.includes("gb-mo") ||
        normalized.includes("gb") ||
        normalized.includes("gigabyte")
    ) {
        return "gb";
    }

    // Request units
    if (
        normalized.includes("request") ||
        normalized.includes("req")
    ) {
        return "request";
    }

    // Transition units (lifecycle)
    if (normalized.includes("transition")) {
        return "transition";
    }

    // Flat/one-time
    if (normalized.includes("flat") || normalized.includes("one-time")) {
        return "flat";
    }

    throw new Error(`Unable to normalize unit: ${awsUnit}`);
}

/**
 * Validate unit is a known primitive
 */
export function isValidUnit(unit: string): unit is PricingUnit {
    const validUnits: PricingUnit[] = ["hour", "gb", "request", "transition", "flat"];
    return validUnits.includes(unit as PricingUnit);
}
