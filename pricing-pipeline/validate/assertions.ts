/**
 * Assertions for pricing validation
 */

import { validateNoAWSFields } from "../normalize/common.js";

/**
 * Assert all rates are numbers
 */
export function assertAllRatesAreNumbers(pricing: any, path: string = ""): void {
    for (const [key, value] of Object.entries(pricing)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Check if this looks like a rate field
        if (
            key === "rate" ||
            key === "hourly" ||
            key === "monthly" ||
            key.includes("price") ||
            key.includes("cost")
        ) {
            if (typeof value !== "number") {
                throw new Error(
                    `Rate field ${currentPath} must be a number, got ${typeof value}`
                );
            }
        }

        if (value && typeof value === "object") {
            assertAllRatesAreNumbers(value, currentPath);
        }
    }
}

/**
 * Assert no text descriptions in pricing
 */
export function assertNoDescriptions(pricing: any): void {
    const forbiddenKeys = [
        "description",
        "desc",
        "comment",
        "note",
        "remarks",
    ];

    function check(obj: any, path: string = ""): void {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (forbiddenKeys.includes(key.toLowerCase())) {
                throw new Error(
                    `Description field found: ${currentPath} - pricing should be data-only`
                );
            }

            if (value && typeof value === "object") {
                check(value, currentPath);
            }
        }
    }

    check(pricing);
}

/**
 * Assert all tiers are explicit
 */
export function assertExplicitTiers(pricing: any): void {
    function check(obj: any, path: string = ""): void {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (key === "tiers" && Array.isArray(value)) {
                if (value.length === 0) {
                    throw new Error(`Empty tiers array at: ${currentPath}`);
                }

                for (let i = 0; i < value.length; i++) {
                    const tier = value[i];

                    if (!("upTo" in tier)) {
                        throw new Error(
                            `Tier ${i} at ${currentPath} missing 'upTo' field`
                        );
                    }

                    if (!("rate" in tier)) {
                        throw new Error(
                            `Tier ${i} at ${currentPath} missing 'rate' field`
                        );
                    }

                    if (!("unit" in tier)) {
                        throw new Error(
                            `Tier ${i} at ${currentPath} missing 'unit' field`
                        );
                    }
                }

                // Last tier must be Infinity
                const lastTier = value[value.length - 1];
                if (lastTier.upTo !== "Infinity") {
                    throw new Error(
                        `Last tier at ${currentPath} must have upTo: "Infinity"`
                    );
                }
            }

            if (value && typeof value === "object") {
                check(value, currentPath);
            }
        }
    }

    check(pricing);
}

/**
 * Run all assertions
 */
export function runAllAssertions(pricing: any): void {
    console.log("Running pricing assertions...");

    validateNoAWSFields(pricing);
    console.log("  ✓ No AWS field names");

    assertNoDescriptions(pricing);
    console.log("  ✓ No text descriptions");

    assertAllRatesAreNumbers(pricing);
    console.log("  ✓ All rates are numbers");

    assertExplicitTiers(pricing);
    console.log("  ✓ All tiers are explicit");

    console.log("✓ All assertions passed");
}
