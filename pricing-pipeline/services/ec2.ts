/**
 * EC2 Service Processor - Streaming Version
 * Transforms raw AWS EC2 pricing into strict, calculator-ready format
 * Uses streaming JSON parser to handle large files (7GB+)
 */

import * as fs from "fs";
import * as path from "path";
import Chain from "stream-chain";
import Parser from "stream-json";
import StreamObject from "stream-json/streamers/StreamObject.js";
import { isValidEC2SKU } from "../normalize/filters.js";
import { normalizeRegion, parsePrice, getTimestamp } from "../normalize/common.js";

const RAW_FILE = path.join(process.cwd(), "raw", "ec2.json");
const OUTPUT_DIR = path.join(process.cwd(), "output", "aws", "v1", "services");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "ec2.json");

interface EC2Instance {
    vcpu: number;
    memory_gb: number;
    network_performance: string;
    pricing: {
        type: "hourly";
        rate: number;
    };
}

interface EC2PricingOutput {
    service: "ec2";
    region: string;
    currency: "USD";
    version: "v1";
    lastUpdated: string;
    instances: Record<string, EC2Instance>;
}

/**
 * Process EC2 pricing data using streaming JSON parser
 */
export async function processEC2Pricing(targetRegion: string = "us-east-1"): Promise<void> {
    console.log(`🎯 Target region: ${targetRegion}`);
    console.log("📖 Streaming JSON file...\n");

    const instances: Record<string, EC2Instance> = {};
    const skuToInstanceType: Map<string, string> = new Map();
    let processedCount = 0;
    let skippedCount = 0;
    let totalProcessed = 0;

    // First pass: Extract products (instance metadata)
    console.log("🔄 Pass 1: Extracting instance metadata...");

    await new Promise<void>((resolve, reject) => {
        const pipeline = new Chain([
            fs.createReadStream(RAW_FILE),
            Parser(),
            new StreamObject()
        ]);

        let lastUpdate = 0;

        pipeline.on('data', (data: any) => {
            const key: string = data.key;
            const value: any = data.value;

            // We're looking for keys like "products.SKU"
            if (!key.startsWith('products.')) {
                return;
            }

            totalProcessed++;

            // Show progress every 10,000 items
            if (totalProcessed - lastUpdate >= 10000) {
                process.stdout.write(`\r⏳ Processed ${totalProcessed.toLocaleString()} products - Found: ${processedCount} instances`);
                lastUpdate = totalProcessed;
            }

            // Extract SKU from key (format: "products.SKU")
            const sku = key.substring(9); // Remove "products." prefix
            const attrs = value?.attributes;

            if (!attrs) {
                skippedCount++;
                return;
            }

            // Skip if not valid EC2 SKU
            if (!isValidEC2SKU(attrs)) {
                skippedCount++;
                return;
            }

            // Skip if not target region
            try {
                const region = normalizeRegion(attrs.location);
                if (region !== targetRegion) {
                    skippedCount++;
                    return;
                }
            } catch {
                skippedCount++;
                return;
            }

            // Extract instance type
            const instanceType = attrs.instanceType;
            if (!instanceType) {
                skippedCount++;
                return;
            }

            // Store SKU to instance type mapping
            skuToInstanceType.set(sku, instanceType);

            // Parse vCPU and memory
            const vcpu = parseInt(attrs.vcpu) || 0;
            const memoryStr = attrs.memory || "0 GiB";
            const memoryMatch = memoryStr.match(/([0-9.]+)/);
            const memory_gb = memoryMatch ? parseFloat(memoryMatch[1]) : 0;

            // Store instance metadata (pricing will be added in pass 2)
            instances[instanceType] = {
                vcpu,
                memory_gb,
                network_performance: attrs.networkPerformance || "Unknown",
                pricing: {
                    type: "hourly",
                    rate: 0 // Will be filled in pass 2
                }
            };

            processedCount++;
        });

        pipeline.on('end', () => {
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            console.log(`✓ Pass 1 complete: Found ${processedCount} instances`);
            console.log(`  Processed ${totalProcessed.toLocaleString()} products total`);
            resolve();
        });

        pipeline.on('error', reject);
    });

    if (processedCount === 0) {
        console.error("\n⚠️  No instances found in Pass 1. This might indicate:");
        console.error("  - Wrong region specified");
        console.error("  - Filtering is too strict");
        console.error("  - JSON structure has changed");
        throw new Error("No instances found in Pass 1");
    }

    // Second pass: Extract pricing from terms
    console.log("\n🔄 Pass 2: Extracting pricing data...");
    totalProcessed = 0;
    let pricingFound = 0;

    await new Promise<void>((resolve, reject) => {
        const pipeline = new Chain([
            fs.createReadStream(RAW_FILE),
            Parser(),
            new StreamObject()
        ]);

        let lastUpdate = 0;

        pipeline.on('data', (data: any) => {
            const key: string = data.key;
            const value: any = data.value;

            // Look for OnDemand terms (format: "terms.OnDemand.SKU.termCode")
            if (!key.startsWith('terms.OnDemand.')) {
                return;
            }

            totalProcessed++;

            // Show progress every 10,000 items
            if (totalProcessed - lastUpdate >= 10000) {
                process.stdout.write(`\r⏳ Processed ${totalProcessed.toLocaleString()} terms - Pricing found: ${pricingFound}`);
                lastUpdate = totalProcessed;
            }

            // Extract SKU from key (format: "terms.OnDemand.SKU.termCode")
            const parts = key.split('.');
            if (parts.length < 4) return;

            const sku = parts[2];

            // Check if we have this SKU
            const instanceType = skuToInstanceType.get(sku);
            if (!instanceType) return;

            // Extract price from priceDimensions
            const priceDimensions = value?.priceDimensions;
            if (!priceDimensions) return;

            for (const dimCode in priceDimensions) {
                const dimension = priceDimensions[dimCode];
                const pricePerUnit = dimension?.pricePerUnit?.USD;

                if (pricePerUnit !== undefined) {
                    const hourlyRate = parsePrice(pricePerUnit);

                    // Update the instance pricing
                    if (instances[instanceType]) {
                        instances[instanceType].pricing.rate = hourlyRate;
                        pricingFound++;
                    }
                    break;
                }
            }
        });

        pipeline.on('end', () => {
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            console.log(`✓ Pass 2 complete: Pricing found for ${pricingFound} instances`);
            console.log(`  Processed ${totalProcessed.toLocaleString()} terms total\n`);
            resolve();
        });

        pipeline.on('error', reject);
    });

    // Filter out instances without pricing
    const validInstances: Record<string, EC2Instance> = {};
    for (const [type, instance] of Object.entries(instances)) {
        if (instance.pricing.rate > 0) {
            validInstances[type] = instance;
        }
    }

    console.log(`✓ Total valid instances: ${Object.keys(validInstances).length}`);
    console.log(`  Skipped ${skippedCount.toLocaleString()} SKUs`);

    // Create output
    const output: EC2PricingOutput = {
        service: "ec2",
        region: targetRegion,
        currency: "USD",
        version: "v1",
        lastUpdated: getTimestamp(),
        instances: validInstances
    };

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write output
    fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(output, null, 2),
        "utf-8"
    );

    console.log(`✓ Wrote ${Object.keys(validInstances).length} instances to ${OUTPUT_FILE}`);

    // Show sample instances
    const sampleTypes = ["t3.micro", "t3.small", "t3.medium", "m5.large", "c5.xlarge"];
    console.log("\n📋 Sample pricing:");
    for (const type of sampleTypes) {
        if (validInstances[type]) {
            console.log(`  ${type}: $${validInstances[type].pricing.rate}/hour (${validInstances[type].vcpu} vCPU, ${validInstances[type].memory_gb} GB)`);
        }
    }
}
