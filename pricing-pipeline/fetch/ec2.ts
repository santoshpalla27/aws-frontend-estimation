/**
 * EC2 Pricing Fetcher
 * Downloads raw AWS EC2 pricing data from public API
 */

import * as fs from "fs";
import * as path from "path";

const EC2_PRICING_URL = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json";
const RAW_DIR = path.join(process.cwd(), "raw");
const OUTPUT_FILE = path.join(RAW_DIR, "ec2.json");

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a simple progress bar
 */
function createProgressBar(current: number, total: number, width: number = 40): string {
    const percentage = Math.min(100, Math.floor((current / total) * 100));
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${formatBytes(current)} / ${formatBytes(total)})`;
}

/**
 * Fetch EC2 pricing data with progress tracking and streaming write
 * Downloads to raw/ directory without loading entire file into memory
 */
export async function fetchEC2Pricing(): Promise<void> {
    console.log("⏳ Starting download...");
    console.log("⚠️  Note: AWS pricing files can be very large (up to 7GB)\n");

    // Ensure raw directory exists
    if (!fs.existsSync(RAW_DIR)) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
    }

    try {
        const response = await fetch(EC2_PRICING_URL);

        if (!response.ok) {
            throw new Error(
                `Failed to fetch EC2 pricing: ${response.status} ${response.statusText}`
            );
        }

        // Get content length for progress tracking
        const contentLength = parseInt(response.headers.get('content-length') || '0');

        if (!response.body) {
            throw new Error("Response body is null");
        }

        console.log(`📦 Total size: ${formatBytes(contentLength)}\n`);

        // Create write stream for direct file writing
        const writeStream = fs.createWriteStream(OUTPUT_FILE);

        // Stream the response directly to file with progress tracking
        const reader = response.body.getReader();
        let receivedLength = 0;
        let lastProgressUpdate = 0;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            // Write chunk directly to file
            writeStream.write(value);
            receivedLength += value.length;

            // Update progress every 50MB
            const progressDelta = receivedLength - lastProgressUpdate;
            if (progressDelta >= 50 * 1024 * 1024) {
                process.stdout.write('\r' + createProgressBar(receivedLength, contentLength));
                lastProgressUpdate = receivedLength;
            }
        }

        // Final progress update
        process.stdout.write('\r' + createProgressBar(receivedLength, contentLength) + '\n\n');

        // Close the write stream
        await new Promise<void>((resolve, reject) => {
            writeStream.end(() => {
                resolve();
            });
            writeStream.on('error', reject);
        });

        const sizeInGB = (receivedLength / 1024 / 1024 / 1024).toFixed(2);
        console.log(`✓ Downloaded EC2 pricing data (${sizeInGB} GB)`);
        console.log(`✓ Saved to: ${OUTPUT_FILE}`);
        console.log(`⚠️  Processing will use streaming parser (2-pass algorithm)...\n`);

    } catch (error) {
        // FAIL LOUDLY on network errors
        console.error("\n✗ Failed to fetch EC2 pricing:");
        console.error(error);
        throw error;
    }
}
