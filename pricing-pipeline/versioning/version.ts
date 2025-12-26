/**
 * Versioning utilities
 * Manages pricing version bumps and symlinks
 */

import * as fs from "fs";
import * as path from "path";
import { diffPricing } from "../tools/pricing-diff.js";

/**
 * Parse version string (e.g., "v1" -> 1)
 */
export function parseVersion(version: string): number {
    const match = version.match(/^v(\d+)$/);
    if (!match) {
        throw new Error(`Invalid version format: ${version}`);
    }
    return parseInt(match[1]);
}

/**
 * Format version number (e.g., 1 -> "v1")
 */
export function formatVersion(versionNum: number): string {
    return `v${versionNum}`;
}

/**
 * Increment major version
 */
export function incrementMajor(currentVersion: string): string {
    const num = parseVersion(currentVersion);
    return formatVersion(num + 1);
}

/**
 * Increment minor version (for now, same as major)
 */
export function incrementMinor(currentVersion: string): string {
    return incrementMajor(currentVersion);
}

/**
 * Check if schema has changed
 */
export function hasSchemaChanges(oldPricing: any, newPricing: any): boolean {
    // Compare top-level keys
    const oldKeys = new Set(Object.keys(oldPricing));
    const newKeys = new Set(Object.keys(newPricing));

    // Check for added/removed keys
    for (const key of oldKeys) {
        if (!newKeys.has(key)) {
            return true; // Key removed
        }
    }

    for (const key of newKeys) {
        if (!oldKeys.has(key)) {
            return true; // Key added
        }
    }

    // Check for type changes in common keys
    for (const key of oldKeys) {
        if (newKeys.has(key)) {
            const oldType = typeof oldPricing[key];
            const newType = typeof newPricing[key];

            if (oldType !== newType) {
                return true; // Type changed
            }
        }
    }

    return false;
}

/**
 * Check if numeric values have changed
 */
export function hasNumericChanges(oldPricing: any, newPricing: any, service: string): boolean {
    const diffs = diffPricing(oldPricing, newPricing, service);
    return diffs.length > 0;
}

/**
 * Determine next version based on changes
 */
export function determineNextVersion(
    oldPricing: any,
    newPricing: any,
    currentVersion: string,
    service: string
): string {
    // Major bump: schema changes
    if (hasSchemaChanges(oldPricing, newPricing)) {
        console.log("  Schema changes detected → Major version bump");
        return incrementMajor(currentVersion);
    }

    // Minor bump: numeric value changes
    if (hasNumericChanges(oldPricing, newPricing, service)) {
        console.log("  Numeric changes detected → Minor version bump");
        return incrementMinor(currentVersion);
    }

    // No changes
    console.log("  No changes detected → Keep current version");
    return currentVersion;
}

/**
 * Get latest version from output directory
 */
export function getLatestVersion(service: string): string | null {
    const outputDir = path.join(process.cwd(), "output", "aws");

    if (!fs.existsSync(outputDir)) {
        return null;
    }

    const versions = fs
        .readdirSync(outputDir)
        .filter((name) => name.match(/^v\d+$/))
        .filter((version) => {
            const servicePath = path.join(outputDir, version, "services", `${service}.json`);
            return fs.existsSync(servicePath);
        });

    if (versions.length === 0) {
        return null;
    }

    // Sort versions numerically
    versions.sort((a, b) => parseVersion(b) - parseVersion(a));

    return versions[0];
}

/**
 * Create or update 'latest' symlink
 */
export function updateLatestSymlink(version: string): void {
    const outputDir = path.join(process.cwd(), "output", "aws");
    const latestPath = path.join(outputDir, "latest");
    const targetPath = version;

    // Remove existing symlink if it exists
    if (fs.existsSync(latestPath)) {
        fs.unlinkSync(latestPath);
    }

    // Create new symlink
    // On Windows, use junction for directories
    try {
        fs.symlinkSync(targetPath, latestPath, "junction");
        console.log(`✓ Updated 'latest' symlink → ${version}`);
    } catch (error) {
        // Fallback: just log the version
        console.log(`  (Symlink not supported on this system)`);
        console.log(`  Latest version: ${version}`);
    }
}
