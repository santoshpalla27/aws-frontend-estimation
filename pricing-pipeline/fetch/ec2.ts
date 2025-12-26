/**
 * EC2 Pricing Fetcher
 * Downloads raw AWS EC2 pricing data from public API
 * Uses streaming to handle large files efficiently
 */

import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const EC2_PRICING_URL =
    "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json";

const RAW_DIR = path.join(process.cwd(), "raw");
const EC2_RAW_FILE = path.join(RAW_DIR, "ec2.json");

/**
 * Ensure raw directory exists
 */
function ensureRawDir(): void {
    if (!fs.existsSync(RAW_DIR)) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
    }
}

/**
 * Download EC2 pricing data with streaming to handle large files
 */
export async function fetchEC2Pricing(): Promise<void> {
    console.log("Fetching EC2 pricing data...");
    console.log(`URL: ${EC2_PRICING_URL}`);

    ensureRawDir();

    try {
        const response = await fetch(EC2_PRICING_URL);

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        if (!response.body) {
            throw new Error("Response body is null");
        }

        // Stream to file to avoid loading entire file in memory
        const fileStream = fs.createWriteStream(EC2_RAW_FILE);

        // Convert web stream to Node stream
        const nodeStream = Readable.fromWeb(response.body as any);

        await pipeline(nodeStream, fileStream);

        const stats = fs.statSync(EC2_RAW_FILE);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`✓ EC2 pricing downloaded: ${sizeInMB} MB`);
        console.log(`✓ Saved to: ${EC2_RAW_FILE}`);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch EC2 pricing: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Load raw EC2 pricing from disk
 */
export function loadRawEC2Pricing(): any {
    if (!fs.existsSync(EC2_RAW_FILE)) {
        throw new Error(
            `Raw EC2 pricing not found. Run fetchEC2Pricing() first.`
        );
    }

    const data = fs.readFileSync(EC2_RAW_FILE, "utf-8");
    return JSON.parse(data);
}
