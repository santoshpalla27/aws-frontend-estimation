/**
 * Common utilities for pricing normalization
 */

export interface RawAWSPricing {
    formatVersion: string;
    disclaimer: string;
    offerCode: string;
    version: string;
    publicationDate: string;
    products: Record<string, any>;
    terms: {
        OnDemand?: Record<string, any>;
        Reserved?: Record<string, any>;
    };
}

export interface NormalizedPricing {
    service: string;
    region: string;
    currency: string;
    version: string;
    lastUpdated: string;
    [key: string]: any;
}

/**
 * Extract region from AWS location string
 */
export function normalizeRegion(location: string): string {
    const regionMap: Record<string, string> = {
        "US East (N. Virginia)": "us-east-1",
        "US East (Ohio)": "us-east-2",
        "US West (N. California)": "us-west-1",
        "US West (Oregon)": "us-west-2",
        "Europe (Ireland)": "eu-west-1",
        "Europe (London)": "eu-west-2",
        "Europe (Paris)": "eu-west-3",
        "Europe (Frankfurt)": "eu-central-1",
        "Asia Pacific (Tokyo)": "ap-northeast-1",
        "Asia Pacific (Seoul)": "ap-northeast-2",
        "Asia Pacific (Singapore)": "ap-southeast-1",
        "Asia Pacific (Sydney)": "ap-southeast-2",
        "Asia Pacific (Mumbai)": "ap-south-1",
        "South America (Sao Paulo)": "sa-east-1",
        "Canada (Central)": "ca-central-1",
    };

    return regionMap[location] || location;
}

/**
 * Safe number parsing with validation
 */
export function parsePrice(value: string | number): number {
    const num = typeof value === "string" ? parseFloat(value) : value;

    if (isNaN(num) || !isFinite(num)) {
        throw new Error(`Invalid price value: ${value}`);
    }

    return num;
}

/**
 * Generate ISO timestamp
 */
export function getCurrentTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Validate no AWS-specific field names in output
 */
export function validateNoAWSFields(obj: any, path: string = ""): void {
    const forbiddenPatterns = [
        /sku/i,
        /offerTermCode/i,
        /rateCode/i,
        /termAttributes/i,
        /pricePerUnit/i,
    ];

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(key)) {
                throw new Error(
                    `Forbidden AWS field name found: ${currentPath}`
                );
            }
        }

        if (value && typeof value === "object") {
            validateNoAWSFields(value, currentPath);
        }
    }
}
