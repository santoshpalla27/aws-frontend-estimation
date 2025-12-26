import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import chalk from 'chalk';

/**
 * Fetch AWS pricing data and save to raw/
 * Uses streaming to handle large files
 * NO RETRIES - fail fast on any error
 */

export interface FetchResult {
    service: string;
    success: boolean;
    filePath: string;
    error?: string;
}

export async function fetchPricingData(
    serviceCode: string,
    url: string,
    outputDir: string = 'raw'
): Promise<FetchResult> {
    const fileName = `${serviceCode}.json`;
    const filePath = path.join(outputDir, fileName);

    console.log(chalk.blue(`[FETCH] ${serviceCode} from ${url}`));

    try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Stream download to file
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'stream',
            timeout: 300000, // 5 minutes timeout
            headers: {
                'Accept': 'application/json',
            },
        });

        // Validate HTTP 200
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Stream to file
        const writer = fs.createWriteStream(filePath);
        await pipeline(response.data, writer);

        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(chalk.green(`[FETCH SUCCESS] ${serviceCode} (${sizeMB} MB) -> ${filePath}`));

        return {
            service: serviceCode,
            success: true,
            filePath,
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`[FETCH FAILED] ${serviceCode}: ${errorMsg}`));

        // Clean up partial file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return {
            service: serviceCode,
            success: false,
            filePath,
            error: errorMsg,
        };
    }
}

/**
 * Fetch multiple services in parallel
 * Fails if ANY service fails
 */
export async function fetchAllServices(
    services: Array<{ code: string; url: string }>,
    concurrency: number = 5
): Promise<FetchResult[]> {
    console.log(chalk.bold(`\n[FETCH] Starting download of ${services.length} services...\n`));

    const results: FetchResult[] = [];

    // Process in batches for controlled concurrency
    for (let i = 0; i < services.length; i += concurrency) {
        const batch = services.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(s => fetchPricingData(s.code, s.url))
        );
        results.push(...batchResults);
    }

    // Check for failures
    const failures = results.filter(r => !r.success);

    if (failures.length > 0) {
        console.error(chalk.red.bold(`\n[FETCH FAILED] ${failures.length} service(s) failed:\n`));
        failures.forEach(f => {
            console.error(chalk.red(`  - ${f.service}: ${f.error}`));
        });
        throw new Error(`[FETCH FAILED] ${failures.length} service(s) failed to download. Pipeline aborted.`);
    }

    console.log(chalk.green.bold(`\n[FETCH SUCCESS] All ${services.length} services downloaded successfully\n`));

    return results;
}
