/**
 * Normalize AWS region codes
 * AWS uses inconsistent region naming
 */
const REGION_MAP: Record<string, string> = {
    'US East (N. Virginia)': 'us-east-1',
    'US East (Ohio)': 'us-east-2',
    'US West (N. California)': 'us-west-1',
    'US West (Oregon)': 'us-west-2',
    'EU (Ireland)': 'eu-west-1',
    'EU (Frankfurt)': 'eu-central-1',
    'EU (London)': 'eu-west-2',
    'EU (Paris)': 'eu-west-3',
    'EU (Stockholm)': 'eu-north-1',
    'Asia Pacific (Tokyo)': 'ap-northeast-1',
    'Asia Pacific (Seoul)': 'ap-northeast-2',
    'Asia Pacific (Singapore)': 'ap-southeast-1',
    'Asia Pacific (Sydney)': 'ap-southeast-2',
    'Asia Pacific (Mumbai)': 'ap-south-1',
    'Canada (Central)': 'ca-central-1',
    'Canada West (Calgary)': 'ca-west-1',
    'South America (São Paulo)': 'sa-east-1',
};

export function normalizeRegion(awsRegion: string): string {
    // If already in code format (us-east-1), return as-is
    if (/^[a-z]{2}-[a-z]+-\d+$/.test(awsRegion)) {
        return awsRegion;
    }

    const normalized = REGION_MAP[awsRegion];
    if (!normalized) {
        throw new Error(
            `[REGION NORMALIZATION FAILED] Unknown AWS region: "${awsRegion}". ` +
            `Add mapping to REGION_MAP.`
        );
    }

    return normalized;
}

/**
 * Validate currency (must be USD)
 */
export function validateCurrency(currency: string): void {
    if (currency !== 'USD') {
        throw new Error(`[CURRENCY VALIDATION FAILED] Only USD supported, got: ${currency}`);
    }
}

/**
 * Extract numeric value from AWS attribute
 * Handles strings like "8 vCPU", "32 GB", etc.
 */
export function extractNumericValue(value: string): number | null {
    const match = value.match(/^(\d+(?:\.\d+)?)/);
    if (!match) {
        return null;
    }
    return parseFloat(match[1]!);
}

/**
 * Safe JSON parse with error context
 */
export function safeJSONParse<T>(json: string, context: string): T {
    try {
        return JSON.parse(json) as T;
    } catch (error) {
        throw new Error(`[JSON PARSE FAILED] ${context}: ${error}`);
    }
}

/**
 * Validate required fields exist
 */
export function validateRequiredFields(
    obj: Record<string, unknown>,
    fields: string[],
    context: string
): void {
    for (const field of fields) {
        if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
            throw new Error(
                `[VALIDATION FAILED] ${context}: Missing required field "${field}"`
            );
        }
    }
}
