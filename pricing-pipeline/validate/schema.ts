/**
 * Schema validation for normalized pricing
 */

import { NormalizedPricing } from "../normalize/common.js";

export interface PricingSchema {
    service: string;
    region: string;
    currency: string;
    version: string;
    lastUpdated: string;
    [key: string]: any;
}

/**
 * Validate pricing schema
 */
export function validatePricingSchema(pricing: any): void {
    // Required fields
    const requiredFields = ["service", "region", "currency", "version", "lastUpdated"];

    for (const field of requiredFields) {
        if (!(field in pricing)) {
            throw new Error(`Missing required field: ${field}`);
        }

        if (typeof pricing[field] !== "string") {
            throw new Error(`Field ${field} must be a string`);
        }
    }

    // Validate timestamp
    const timestamp = new Date(pricing.lastUpdated);
    if (isNaN(timestamp.getTime())) {
        throw new Error(`Invalid timestamp: ${pricing.lastUpdated}`);
    }

    // Validate version format
    if (!pricing.version.match(/^v\d+$/)) {
        throw new Error(`Invalid version format: ${pricing.version}`);
    }

    // Validate currency
    if (pricing.currency !== "USD") {
        throw new Error(`Unsupported currency: ${pricing.currency}`);
    }

    // Ensure JSON serializability
    try {
        JSON.stringify(pricing);
    } catch (error) {
        throw new Error("Pricing data is not JSON serializable");
    }
}

/**
 * Validate no NaN, null, undefined in pricing values
 */
export function validatePricingValues(obj: any, path: string = ""): void {
    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (value === null) {
            throw new Error(`Null value found at: ${currentPath}`);
        }

        if (value === undefined) {
            throw new Error(`Undefined value found at: ${currentPath}`);
        }

        if (typeof value === "number") {
            if (isNaN(value)) {
                throw new Error(`NaN found at: ${currentPath}`);
            }

            if (!isFinite(value)) {
                throw new Error(`Infinite value found at: ${currentPath}`);
            }
        }

        if (value && typeof value === "object") {
            validatePricingValues(value, currentPath);
        }
    }
}
