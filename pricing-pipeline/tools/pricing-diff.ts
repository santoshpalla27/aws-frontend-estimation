/**
 * Pricing diff tool
 * Compares two pricing versions and reports changes
 */

import * as fs from "fs";
import * as path from "path";

export interface PricingDiff {
    service: string;
    component: string;
    type: "NEW" | "REMOVED" | "CHANGED";
    oldValue?: number;
    newValue?: number;
    delta?: number;
    deltaPercent?: number;
}

/**
 * Compare two pricing objects and generate diffs
 */
export function diffPricing(
    oldPricing: any,
    newPricing: any,
    service: string
): PricingDiff[] {
    const diffs: PricingDiff[] = [];

    // For EC2, compare instances
    if (service === "ec2") {
        const oldInstances = oldPricing.instances || {};
        const newInstances = newPricing.instances || {};

        // Find all instance types
        const allTypes = new Set([
            ...Object.keys(oldInstances),
            ...Object.keys(newInstances),
        ]);

        for (const instanceType of allTypes) {
            const oldInstance = oldInstances[instanceType];
            const newInstance = newInstances[instanceType];

            if (!oldInstance && newInstance) {
                // NEW instance type
                diffs.push({
                    service,
                    component: instanceType,
                    type: "NEW",
                    newValue: newInstance.pricing.rate,
                });
            } else if (oldInstance && !newInstance) {
                // REMOVED instance type
                diffs.push({
                    service,
                    component: instanceType,
                    type: "REMOVED",
                    oldValue: oldInstance.pricing.rate,
                });
            } else if (oldInstance && newInstance) {
                // Check for CHANGED pricing
                const oldRate = oldInstance.pricing.rate;
                const newRate = newInstance.pricing.rate;

                if (oldRate !== newRate) {
                    const delta = newRate - oldRate;
                    const deltaPercent = ((delta / oldRate) * 100);

                    diffs.push({
                        service,
                        component: instanceType,
                        type: "CHANGED",
                        oldValue: oldRate,
                        newValue: newRate,
                        delta,
                        deltaPercent,
                    });
                }
            }
        }
    }

    return diffs;
}

/**
 * Format diff for console output
 */
export function formatDiff(diffs: PricingDiff[]): string {
    if (diffs.length === 0) {
        return "No changes detected";
    }

    const lines: string[] = [];

    // Group by type
    const newItems = diffs.filter((d) => d.type === "NEW");
    const removedItems = diffs.filter((d) => d.type === "REMOVED");
    const changedItems = diffs.filter((d) => d.type === "CHANGED");

    if (newItems.length > 0) {
        lines.push(`\n✓ NEW (${newItems.length})`);
        for (const item of newItems.slice(0, 10)) {
            lines.push(`  + ${item.component}: $${item.newValue?.toFixed(4)}/hr`);
        }
        if (newItems.length > 10) {
            lines.push(`  ... and ${newItems.length - 10} more`);
        }
    }

    if (removedItems.length > 0) {
        lines.push(`\n✗ REMOVED (${removedItems.length})`);
        for (const item of removedItems.slice(0, 10)) {
            lines.push(`  - ${item.component}: $${item.oldValue?.toFixed(4)}/hr`);
        }
        if (removedItems.length > 10) {
            lines.push(`  ... and ${removedItems.length - 10} more`);
        }
    }

    if (changedItems.length > 0) {
        lines.push(`\n⚠ CHANGED (${changedItems.length})`);

        // Sort by absolute delta percent
        changedItems.sort((a, b) =>
            Math.abs(b.deltaPercent || 0) - Math.abs(a.deltaPercent || 0)
        );

        for (const item of changedItems.slice(0, 10)) {
            const sign = (item.delta || 0) > 0 ? "+" : "";
            const deltaStr = `${sign}${item.delta?.toFixed(4)}`;
            const percentStr = `${sign}${item.deltaPercent?.toFixed(2)}%`;

            lines.push(
                `  ~ ${item.component}: $${item.oldValue?.toFixed(4)} → $${item.newValue?.toFixed(4)} (${deltaStr}, ${percentStr})`
            );
        }
        if (changedItems.length > 10) {
            lines.push(`  ... and ${changedItems.length - 10} more`);
        }
    }

    return lines.join("\n");
}

/**
 * Load pricing file
 */
function loadPricingFile(version: string, service: string): any {
    const filePath = path.join(
        process.cwd(),
        "output",
        "aws",
        version,
        "services",
        `${service}.json`
    );

    if (!fs.existsSync(filePath)) {
        throw new Error(`Pricing file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
}

/**
 * Main diff function
 */
export async function runPricingDiff(
    oldVersion: string,
    newVersion: string,
    service: string = "ec2"
): Promise<void> {
    console.log("=".repeat(60));
    console.log(`Pricing Diff: ${service}`);
    console.log(`Old: ${oldVersion} → New: ${newVersion}`);
    console.log("=".repeat(60));

    try {
        const oldPricing = loadPricingFile(oldVersion, service);
        const newPricing = loadPricingFile(newVersion, service);

        const diffs = diffPricing(oldPricing, newPricing, service);

        console.log(formatDiff(diffs));
        console.log();
        console.log("=".repeat(60));
        console.log(`Total changes: ${diffs.length}`);
        console.log("=".repeat(60));
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        throw error;
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const oldVersion = process.argv[2] || "v1";
    const newVersion = process.argv[3] || "v1";
    const service = process.argv[4] || "ec2";

    runPricingDiff(oldVersion, newVersion, service);
}
