/**
 * Unit Normalization
 * Maps AWS pricing units to strict, calculator-ready primitives
 */

export type PricingUnit = "hour" | "gb" | "request" | "transition" | "flat";

/**
 * Normalize AWS unit strings to primitive types
 * FAILS LOUDLY if unit is unmappable - no silent assumptions
 */
export function normalizeUnit(awsUnit: string): PricingUnit {
    const normalized = awsUnit.toLowerCase().trim();

    // Hourly units
    if (normalized.includes("hour") || normalized.includes("hrs")) {
        return "hour";
    }

    // Storage units (GB, TB, etc.)
    if (normalized.includes("gb") || normalized.includes("gigabyte")) {
        return "gb";
    }

    // Request/transaction units
    if (normalized.includes("request") || normalized.includes("transaction")) {
        return "request";
    }

    // State transitions (S3 lifecycle, etc.)
    if (normalized.includes("transition")) {
        return "transition";
    }

    // Flat fees
    if (normalized === "flat" || normalized === "quantity") {
        return "flat";
    }

    // FAIL LOUDLY - no silent fallbacks
    throw new Error(
        `UNMAPPABLE UNIT: "${awsUnit}". Add explicit mapping or reject this SKU.`
    );
}

/**
 * Convert AWS storage units to GB
 */
export function normalizeStorageToGB(value: number, unit: string): number {
    const normalized = unit.toLowerCase().trim();

    if (normalized.includes("tb") || normalized.includes("terabyte")) {
        return value * 1024;
    }

    if (normalized.includes("mb") || normalized.includes("megabyte")) {
        return value / 1024;
    }

    if (normalized.includes("gb") || normalized.includes("gigabyte")) {
        return value;
    }

    throw new Error(`UNMAPPABLE STORAGE UNIT: "${unit}"`);
}
