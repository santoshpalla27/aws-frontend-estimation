import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { BumpType } from './diff.js';

/**
 * Version bump logic
 * Manages versioned output directories
 */

export interface VersionInfo {
    current: string;
    next: string;
    major: number;
    minor: number;
    patch: number;
}

/**
 * Parse version string (e.g., "v1.2.3")
 */
export function parseVersion(version: string): { major: number; minor: number; patch: number } {
    const match = version.match(/^v(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);

    if (!match) {
        throw new Error(`[VERSION] Invalid version format: ${version}`);
    }

    return {
        major: parseInt(match[1]!, 10),
        minor: parseInt(match[2] || '0', 10),
        patch: parseInt(match[3] || '0', 10),
    };
}

/**
 * Format version object to string
 */
export function formatVersion(major: number, minor: number, patch: number): string {
    return `v${major}.${minor}.${patch}`;
}

/**
 * Get current version from output directory
 */
export function getCurrentVersion(outputDir: string = 'output/aws'): VersionInfo {
    const latestPath = path.join(outputDir, 'latest');

    if (!fs.existsSync(latestPath)) {
        // No previous version, start at v1.0.0
        return {
            current: 'v0.0.0',
            next: 'v1.0.0',
            major: 1,
            minor: 0,
            patch: 0,
        };
    }

    // Read version from metadata
    const metadataPath = path.join(latestPath, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
        throw new Error(`[VERSION] metadata.json not found in ${latestPath}`);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const current = metadata.version;
    const parsed = parseVersion(current);

    return {
        current,
        next: current, // Will be updated by bump
        ...parsed,
    };
}

/**
 * Bump version based on change type
 */
export function bumpVersion(
    current: VersionInfo,
    bumpType: BumpType
): VersionInfo {
    let { major, minor, patch } = current;

    switch (bumpType) {
        case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor += 1;
            patch = 0;
            break;
        case 'patch':
            patch += 1;
            break;
    }

    const next = formatVersion(major, minor, patch);

    console.log(chalk.blue(`[VERSION] ${current.current} → ${next} (${bumpType})`));

    return {
        current: current.current,
        next,
        major,
        minor,
        patch,
    };
}

/**
 * Create new version directory
 */
export function createVersionDirectory(
    version: VersionInfo,
    outputDir: string = 'output/aws'
): string {
    const versionDir = path.join(outputDir, version.next);
    const servicesDir = path.join(versionDir, 'services');

    if (fs.existsSync(versionDir)) {
        throw new Error(`[VERSION] Version directory already exists: ${versionDir}`);
    }

    fs.mkdirSync(servicesDir, { recursive: true });

    console.log(chalk.green(`[VERSION] Created ${versionDir}`));

    return versionDir;
}

/**
 * Update 'latest' symlink/pointer
 */
export function updateLatestPointer(
    version: VersionInfo,
    outputDir: string = 'output/aws'
): void {
    const latestPath = path.join(outputDir, 'latest');
    const versionPath = path.join(outputDir, version.next);

    // Remove old latest
    if (fs.existsSync(latestPath)) {
        fs.rmSync(latestPath, { recursive: true, force: true });
    }

    // Copy new version to latest
    copyDirectory(versionPath, latestPath);

    console.log(chalk.green(`[VERSION] Updated latest → ${version.next}`));
}

/**
 * Copy directory recursively
 */
function copyDirectory(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Write version metadata
 */
export function writeVersionMetadata(
    version: VersionInfo,
    versionDir: string
): void {
    const metadata = {
        version: version.next,
        createdAt: new Date().toISOString(),
        previousVersion: version.current !== 'v0.0.0' ? version.current : null,
    };

    const metadataPath = path.join(versionDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(chalk.green(`[VERSION] Wrote metadata to ${metadataPath}`));
}
