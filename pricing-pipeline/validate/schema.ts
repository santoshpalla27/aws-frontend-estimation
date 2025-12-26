/**
 * Pricing Validation
 * Validates normalized pricing output against strict schema
 */

import { z } from "zod";

/**
 * Base pricing schema - all services must conform
 */
const BasePricingSchema = z.object({
    service: z.string(),
    region: z.string(),
    currency: z.literal("USD"),
    version: z.string(),
    lastUpdated: z.string().datetime()
});

/**
 * EC2 Pricing Schema
 */
const EC2InstanceSchema = z.object({
    vcpu: z.number().positive(),
    memory_gb: z.number().positive(),
    network_performance: z.string(),
    pricing: z.object({
        type: z.literal("hourly"),
        rate: z.number().nonnegative()
    })
});

const EC2PricingSchema = BasePricingSchema.extend({
    service: z.literal("ec2"),
    instances: z.record(z.string(), EC2InstanceSchema)
});

/**
 * Validate EC2 pricing output
 */
export function validateEC2Pricing(data: any): void {
    console.log("\n=== Validating EC2 Pricing ===");

    try {
        EC2PricingSchema.parse(data);
        console.log("✓ Schema validation passed");
    } catch (error) {
        console.error("✗ Schema validation failed:");
        throw error;
    }

    // Additional assertions
    assertNoPricingAnomalies(data);
    assertNoAWSFieldNames(data);

    console.log("✓ All validation checks passed");
}

/**
 * Assert no NaN, null, undefined in pricing
 */
function assertNoPricingAnomalies(data: any): void {
    const instances = data.instances || {};

    for (const [type, instance] of Object.entries(instances)) {
        const inst = instance as any;

        if (isNaN(inst.pricing.rate)) {
            throw new Error(`NaN rate for instance ${type}`);
        }

        if (inst.pricing.rate === null || inst.pricing.rate === undefined) {
            throw new Error(`Null/undefined rate for instance ${type}`);
        }

        if (inst.pricing.rate < 0) {
            throw new Error(`Negative rate for instance ${type}: ${inst.pricing.rate}`);
        }
    }

    console.log("✓ No pricing anomalies detected");
}

/**
 * Assert no AWS field names in output
 */
function assertNoAWSFieldNames(data: any): void {
    const awsFields = [
        "sku",
        "offerTermCode",
        "rateCode",
        "termAttributes",
        "pricePerUnit",
        "priceDimensions"
    ];

    const jsonStr = JSON.stringify(data);

    for (const field of awsFields) {
        if (jsonStr.includes(field)) {
            throw new Error(
                `AWS field name detected in output: "${field}". ` +
                `Use normalized field names only.`
            );
        }
    }

    console.log("✓ No AWS field names in output");
}
