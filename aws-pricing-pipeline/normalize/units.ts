import { PricingUnit } from '../schema/base.js';

/**
 * AWS uses inconsistent unit naming
 * This maps ALL known AWS units to canonical units
 * If a unit is not found, the pipeline MUST crash
 */
const AWS_UNIT_MAP: Record<string, PricingUnit> = {
    // Time units
    'Hrs': 'hour',
    'hrs': 'hour',
    'Hour': 'hour',
    'hour': 'hour',
    'hours': 'hour',
    'Seconds': 'second',
    'seconds': 'second',
    'Second': 'second',
    'Minutes': 'minute',
    'minutes': 'minute',

    // Storage units
    'GB': 'gb',
    'gb': 'gb',
    'GB-Mo': 'gb_month',
    'GB-Month': 'gb_month',
    'GBMonth': 'gb_month',
    'GB-month': 'gb_month',

    // Compute units
    'vCPU-Hours': 'vcpu_hour',
    'vCPU-hrs': 'vcpu_hour',
    'eCPU-Hours': 'ecpu_hour',
    'eCPU-hrs': 'ecpu_hour',
    'GB-Second': 'second', // Lambda GB-seconds
    'GB-Seconds': 'second',

    // Request units
    'Requests': 'request',
    'requests': 'request',
    'Request': 'request',
    '1M Requests': 'million_requests',
    '1M requests': 'million_requests',
    'Million Requests': 'million_requests',

    // Transition/operation units
    'Transitions': 'transition',
    'transitions': 'transition',

    // Flat/one-time
    'Flat': 'flat',
    'flat': 'flat',
    'Each': 'flat',
    'each': 'flat',
};

/**
 * Normalize AWS unit to canonical unit
 * CRASHES if unit is unknown
 */
export function normalizeUnit(awsUnit: string): PricingUnit {
    const normalized = AWS_UNIT_MAP[awsUnit];

    if (!normalized) {
        throw new Error(
            `[UNIT NORMALIZATION FAILED] Unknown AWS unit: "${awsUnit}". ` +
            `Must add mapping to AWS_UNIT_MAP. Known units: ${Object.keys(AWS_UNIT_MAP).join(', ')}`
        );
    }

    return normalized;
}

/**
 * Convert price to per-unit rate
 * Some AWS prices are given in non-standard quantities
 */
export function normalizePriceQuantity(
    price: number,
    awsUnit: string,
    quantity: number = 1
): number {
    // Handle "per 1M requests" -> convert to per-request
    if (awsUnit.includes('1M') || awsUnit.includes('Million')) {
        return price / 1_000_000;
    }

    return price / quantity;
}

/**
 * Parse AWS price string to number
 * AWS prices are strings like "0.0104" or "0.0000000104"
 */
export function parseAwsPrice(priceStr: string | number): number {
    if (typeof priceStr === 'number') {
        return priceStr;
    }

    const parsed = parseFloat(priceStr);

    if (!Number.isFinite(parsed)) {
        throw new Error(`[PRICE PARSING FAILED] Invalid price: "${priceStr}"`);
    }

    if (parsed < 0) {
        throw new Error(`[PRICE PARSING FAILED] Negative price: "${priceStr}"`);
    }

    return parsed;
}
