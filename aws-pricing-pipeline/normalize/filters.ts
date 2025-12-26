/**
 * SKU filtering framework
 * Each service defines explicit allow-list filters
 * Deny-by-default approach: only explicitly allowed SKUs pass
 */

export interface SKUFilter {
    field: string;
    allowedValues: string[];
    description: string;
}

/**
 * EC2 SKU Filters
 * Only Linux, Shared Tenancy, On-Demand instances
 */
export const EC2_FILTERS: SKUFilter[] = [
    {
        field: 'operatingSystem',
        allowedValues: ['Linux'],
        description: 'Linux only (no Windows, RHEL, SUSE)',
    },
    {
        field: 'tenancy',
        allowedValues: ['Shared'],
        description: 'Shared tenancy only (no Dedicated, Host)',
    },
    {
        field: 'capacitystatus',
        allowedValues: ['Used', 'UnusedCapacityReservation'],
        description: 'On-Demand only (no Spot)',
    },
    {
        field: 'preInstalledSw',
        allowedValues: ['NA'],
        description: 'No pre-installed software',
    },
];

/**
 * S3 SKU Filters
 * Standard storage classes, no special configurations
 */
export const S3_FILTERS: SKUFilter[] = [
    {
        field: 'storageClass',
        allowedValues: [
            'General Purpose',
            'Infrequent Access',
            'Archive',
            'Deep Archive',
            'Intelligent-Tiering',
        ],
        description: 'Standard storage classes',
    },
];

/**
 * Lambda SKU Filters
 * Standard compute, no provisioned concurrency
 */
export const LAMBDA_FILTERS: SKUFilter[] = [
    {
        field: 'group',
        allowedValues: ['AWS-Lambda-Duration', 'AWS-Lambda-Requests'],
        description: 'Standard Lambda pricing (no provisioned concurrency)',
    },
];

/**
 * Apply filters to AWS product attributes
 * Returns true if SKU passes all filters
 */
export function applySKUFilters(
    productAttributes: Record<string, string>,
    filters: SKUFilter[]
): boolean {
    for (const filter of filters) {
        const value = productAttributes[filter.field];

        if (!value) {
            // Field not present -> reject
            return false;
        }

        if (!filter.allowedValues.includes(value)) {
            // Value not in allow-list -> reject
            return false;
        }
    }

    return true;
}

/**
 * Generic filter builder for simple field matching
 */
export function createFieldFilter(
    field: string,
    allowedValues: string[],
    description: string
): SKUFilter {
    return { field, allowedValues, description };
}
