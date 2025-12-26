import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * Download Manifest
 * Tracks which services were successfully downloaded
 */

export interface DownloadResult {
    service: string;
    success: boolean;
    error?: string;
}

export interface DownloadManifest {
    downloaded: string[];
    failed: string[];
    timestamp: string;
}

/**
 * Generate manifest from download results
 */
export function generateManifest(results: DownloadResult[]): DownloadManifest {
    const downloaded = results
        .filter(r => r.success)
        .map(r => r.service);

    const failed = results
        .filter(r => !r.success)
        .map(r => r.service);

    return {
        downloaded,
        failed,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Validate manifest - throw if any failures
 */
export function validateManifest(manifest: DownloadManifest): void {
    if (manifest.failed.length > 0) {
        const errorLines: string[] = [];
        errorLines.push('');
        errorLines.push(chalk.red('╔════════════════════════════════════════════════════════════════╗'));
        errorLines.push(chalk.red('║  FATAL ERROR: DOWNLOAD FAILURES DETECTED                       ║'));
        errorLines.push(chalk.red('╚════════════════════════════════════════════════════════════════╝'));
        errorLines.push('');
        errorLines.push(chalk.red(`Failed to download ${manifest.failed.length} service(s):`));
        manifest.failed.forEach(service => {
            errorLines.push(chalk.red(`  - ${service}`));
        });
        errorLines.push('');
        errorLines.push(chalk.yellow('All enabled services MUST be downloaded before processing.'));
        errorLines.push(chalk.yellow('Fix the download errors and try again.'));
        errorLines.push('');

        throw new Error(errorLines.join('\n'));
    }
}

/**
 * Write manifest to disk
 */
export function writeManifest(manifest: DownloadManifest, outputDir: string = 'raw'): void {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const manifestPath = path.join(outputDir, 'download-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(chalk.green(`[MANIFEST] Written to ${manifestPath}`));
    console.log(chalk.blue(`[MANIFEST] Downloaded: ${manifest.downloaded.length} services`));

    if (manifest.failed.length > 0) {
        console.log(chalk.red(`[MANIFEST] Failed: ${manifest.failed.length} services`));
    }
}

/**
 * Read and validate existing manifest
 */
export function readManifest(outputDir: string = 'raw'): DownloadManifest {
    const manifestPath = path.join(outputDir, 'download-manifest.json');

    if (!fs.existsSync(manifestPath)) {
        throw new Error(
            `[MANIFEST] Download manifest not found at ${manifestPath}. ` +
            `Run the fetch stage first.`
        );
    }

    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as DownloadManifest;
}
