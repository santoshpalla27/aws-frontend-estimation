/**
 * Common Normalization Utilities
 */

/**
 * Safe number parsing with validation
 */
export function parsePrice(value: any): number {
    const parsed = parseFloat(value);

    if (isNaN(parsed)) {
        throw new Error(`Invalid price value: ${value}`);
    }

    if (parsed < 0) {
        throw new Error(`Negative price not allowed: ${parsed}`);
    }

    return parsed;
}

/**
 * Extract region from location string
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
        "Canada (Central)": "ca-central-1",
        "South America (São Paulo)": "sa-east-1"
    };

    const region = regionMap[location];
    if (!region) {
        throw new Error(`Unknown location: ${location}`);
    }

    return region;
}

/**
 * Generate ISO timestamp
 */
export function getTimestamp(): string {
    return new Date().toISOString();
}

/**
 * Validate no AWS field names in output
 */
export function validateNoAWSFields(obj: any, path: string = "root"): void {
    const awsFieldPatterns = [
        /sku/i,
        /offerTermCode/i,
        /rateCode/i,
        /termAttributes/i,
        /pricePerUnit/i
    ];

    for (const key in obj) {
        const fullPath = `${path}.${key}`;

        // Check if key matches AWS patterns
        const isAWSField = awsFieldPatterns.some(pattern => pattern.test(key));
        if (isAWSField) {
            throw new Error(
                `AWS field name detected in output: ${fullPath}. ` +
                `Use normalized field names only.`
            );
        }

        // Recurse into nested objects
        if (typeof obj[key] === "object" && obj[key] !== null) {
            validateNoAWSFields(obj[key], fullPath);
        }
    }
}
