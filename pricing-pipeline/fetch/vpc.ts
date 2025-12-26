/**
 * VPC Pricing Fetcher
 * Downloads raw AWS VPC pricing data from public API
 */

import * as fs from "fs";
import * as path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const VPC_PRICING_URL =
    "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonVPC/current/index.json";

const RAW_DIR = path.join(process.cwd(), "raw");
const VPC_RAW_FILE = path.join(RAW_DIR, "vpc.json");

/**
 * Ensure raw directory exists
 */
function ensureRawDir(): void {
    if (!fs.existsSync(RAW_DIR)) {
        fs.mkdirSync(RAW_DIR, { recursive: true });
    }
}

/**
 * Download VPC pricing data with streaming
 */
export async function fetchVPCPricing(): Promise<void> {
    console.log("Fetching VPC pricing data...");
    console.log(`URL: ${VPC_PRICING_URL}`);

    ensureRawDir();

    try {
        const response = await fetch(VPC_PRICING_URL);

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );
        }

        if (!response.body) {
            throw new Error("Response body is null");
        }

        // Stream to file
        const fileStream = fs.createWriteStream(VPC_RAW_FILE);
        const nodeStream = Readable.fromWeb(response.body as any);

        await pipeline(nodeStream, fileStream);

        const stats = fs.statSync(VPC_RAW_FILE);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

        console.log(`✓ VPC pricing downloaded: ${sizeInMB} MB`);
        console.log(`✓ Saved to: ${VPC_RAW_FILE}`);
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch VPC pricing: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Load raw VPC pricing from disk
 */
export function loadRawVPCPricing(): any {
    if (!fs.existsSync(VPC_RAW_FILE)) {
        throw new Error(
            `Raw VPC pricing not found. Run fetchVPCPricing() first.`
        );
    }

    const data = fs.readFileSync(VPC_RAW_FILE, "utf-8");
    return JSON.parse(data);
}
