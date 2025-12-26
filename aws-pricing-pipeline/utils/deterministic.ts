/**
 * Deep sort object keys recursively
 * Ensures deterministic JSON output
 */

export function deepSortObject(obj: any): any {
    // Handle null/undefined
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle primitives
    if (typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays - sort elements if they're objects
    if (Array.isArray(obj)) {
        return obj.map(item => deepSortObject(item));
    }

    // Handle objects - sort keys alphabetically
    const sortedKeys = Object.keys(obj).sort();
    const sortedObj: Record<string, any> = {};

    for (const key of sortedKeys) {
        sortedObj[key] = deepSortObject(obj[key]);
    }

    return sortedObj;
}
