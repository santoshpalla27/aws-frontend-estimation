import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Pricing diff engine
 * Compares new pricing against previous version
 * Determines version bump type
 */

export type BumpType = 'major' | 'minor' | 'patch';

export interface DiffResult {
    bumpType: BumpType;
    changes: ChangeRecord[];
    summary: string;
}

export interface ChangeRecord {
    service: string;
    changeType: 'schema' | 'pricing' | 'metadata';
    path: string;
    oldValue?: any;
    newValue?: any;
}

/**
 * Compare two pricing objects
 */
export function diffPricing(
    oldData: any,
    newData: any,
    serviceName: string
): DiffResult {
    const changes: ChangeRecord[] = [];
    let bumpType: BumpType = 'patch';

    // Deep comparison
    const diff = deepDiff(oldData, newData, serviceName);
    changes.push(...diff.changes);

    // Determine bump type
    const hasSchemaChange = changes.some(c => c.changeType === 'schema');
    const hasPricingChange = changes.some(c => c.changeType === 'pricing');

    if (hasSchemaChange) {
        bumpType = 'major';
    } else if (hasPricingChange) {
        bumpType = 'minor';
    } else {
        bumpType = 'patch';
    }

    const summary = `${serviceName}: ${changes.length} change(s) detected (${bumpType} bump)`;

    return { bumpType, changes, summary };
}

/**
 * Deep diff two objects
 */
function deepDiff(
    oldObj: any,
    newObj: any,
    basePath: string,
    changes: ChangeRecord[] = []
): { changes: ChangeRecord[] } {
    // Handle null/undefined
    if (oldObj === null || oldObj === undefined) {
        if (newObj !== null && newObj !== undefined) {
            changes.push({
                service: basePath,
                changeType: 'schema',
                path: basePath,
                oldValue: oldObj,
                newValue: newObj,
            });
        }
        return { changes };
    }

    // Handle primitives
    if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
        if (oldObj !== newObj) {
            const changeType = typeof oldObj === 'number' && typeof newObj === 'number'
                ? 'pricing'
                : 'metadata';

            changes.push({
                service: basePath,
                changeType,
                path: basePath,
                oldValue: oldObj,
                newValue: newObj,
            });
        }
        return { changes };
    }

    // Handle objects
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
        const oldValue = oldObj[key];
        const newValue = newObj[key];
        const newPath = `${basePath}.${key}`;

        if (!(key in oldObj)) {
            changes.push({
                service: basePath,
                changeType: 'schema',
                path: newPath,
                oldValue: undefined,
                newValue,
            });
        } else if (!(key in newObj)) {
            changes.push({
                service: basePath,
                changeType: 'schema',
                path: newPath,
                oldValue,
                newValue: undefined,
            });
        } else {
            deepDiff(oldValue, newValue, newPath, changes);
        }
    }

    return { changes };
}

/**
 * Load previous version for comparison
 */
export function loadPreviousVersion(
    service: string,
    outputDir: string = 'output/aws'
): any | null {
    const latestPath = path.join(outputDir, 'latest', 'services', `${service}.json`);

    if (!fs.existsSync(latestPath)) {
        console.log(chalk.yellow(`[DIFF] No previous version found for ${service}`));
        return null;
    }

    return JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
}

/**
 * Generate diff report
 */
export function generateDiffReport(diffs: DiffResult[]): string {
    const lines: string[] = [];

    lines.push('# Pricing Diff Report\n');
    lines.push(`Generated: ${new Date().toISOString()}\n`);

    const majorChanges = diffs.filter(d => d.bumpType === 'major');
    const minorChanges = diffs.filter(d => d.bumpType === 'minor');
    const patchChanges = diffs.filter(d => d.bumpType === 'patch');

    if (majorChanges.length > 0) {
        lines.push('## Major Changes (Schema)\n');
        majorChanges.forEach(d => {
            lines.push(`- ${d.summary}`);
            d.changes.forEach(c => {
                lines.push(`  - ${c.path}: ${c.oldValue} → ${c.newValue}`);
            });
        });
        lines.push('');
    }

    if (minorChanges.length > 0) {
        lines.push('## Minor Changes (Pricing)\n');
        minorChanges.forEach(d => {
            lines.push(`- ${d.summary}`);
        });
        lines.push('');
    }

    if (patchChanges.length > 0) {
        lines.push('## Patch Changes (Metadata)\n');
        patchChanges.forEach(d => {
            lines.push(`- ${d.summary}`);
        });
        lines.push('');
    }

    return lines.join('\n');
}
