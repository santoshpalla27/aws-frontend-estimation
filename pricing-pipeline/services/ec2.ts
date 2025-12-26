/**
 * EC2 Service Processor
 * Transforms raw AWS EC2 pricing into normalized format
 */

import * as fs from "fs";
import * as path from "path";
import { loadRawEC2Pricing } from "../fetch/ec2.js";
import { isValidEC2SKU, isSupportedRegion } from "../normalize/filters.js";
import { normalizeRegion, parsePrice, getCurrentTimestamp } from "../normalize/common.js";

interface EC2Instance {
    vcpu: number;
    memory_gb: number;
    pricing: {
        type: "hourly";
        rate: number;
    };
}

interface EC2Pricing {
    service: "ec2";
    region: string;
    currency: "USD";
    version: string;
    lastUpdated: string;
    instances: Record<string, EC2Instance>;
}

/**
 * Process EC2 pricing for a specific region
 */
export function processEC2Pricing(targetRegion: string = "us-east-1"): EC2Pricing {
    console.log(`Processing EC2 pricing for region: ${targetRegion}`);

    const rawPricing = loadRawEC2Pricing();
    const instances: Record<string, EC2Instance> = {};

    // Extract products
    const products = rawPricing.products || {};
    const onDemandTerms = rawPricing.terms?.OnDemand || {};

    let processedCount = 0;
    let skippedCount = 0;

    for (const [sku, product] of Object.entries(products)) {
        const attributes = (product as any).attributes;

        if (!attributes) {
            skippedCount++;
            continue;
        }

        // Filter by region
        const location = attributes.location;
        if (!location || !isSupportedRegion(location)) {
            skippedCount++;
            continue;
        }

        const region = normalizeRegion(location);
        if (region !== targetRegion) {
            skippedCount++;
            continue;
        }

        // Apply SKU filters
        if (!isValidEC2SKU(attributes)) {
            skippedCount++;
            continue;
        }

        // Extract instance type
        const instanceType = attributes.instanceType;
        if (!instanceType) {
            skippedCount++;
            continue;
        }

        // Extract specs
        const vcpu = parseInt(attributes.vcpu || "0");
        const memory = attributes.memory;
        const memoryGB = memory ? parseFloat(memory.replace(" GiB", "")) : 0;

        // Get pricing from OnDemand terms
        const skuTerms = onDemandTerms[sku];
        if (!skuTerms) {
            skippedCount++;
            continue;
        }

        // AWS pricing structure: terms.OnDemand[sku][offerTermCode].priceDimensions[rateCode].pricePerUnit.USD
        const offerTermCode = Object.keys(skuTerms)[0];
        const priceDimensions = skuTerms[offerTermCode]?.priceDimensions;

        if (!priceDimensions) {
            skippedCount++;
            continue;
        }

        const rateCode = Object.keys(priceDimensions)[0];
        const dimension = priceDimensions[rateCode];

        const pricePerUnit = dimension?.pricePerUnit?.USD;
        if (!pricePerUnit) {
            skippedCount++;
            continue;
        }

        const rate = parsePrice(pricePerUnit);

        // Add to instances
        instances[instanceType] = {
            vcpu,
            memory_gb: memoryGB,
            pricing: {
                type: "hourly",
                rate,
            },
        };

        processedCount++;
    }

    console.log(`✓ Processed ${processedCount} EC2 instances`);
    console.log(`  Skipped ${skippedCount} SKUs`);

    return {
        service: "ec2",
        region: targetRegion,
        currency: "USD",
        version: "v1",
        lastUpdated: getCurrentTimestamp(),
        instances,
    };
}

/**
 * Save EC2 pricing to output directory
 */
export function saveEC2Pricing(pricing: EC2Pricing): string {
    const outputDir = path.join(
        process.cwd(),
        "output",
        "aws",
        pricing.version,
        "services"
    );

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, "ec2.json");
    fs.writeFileSync(outputFile, JSON.stringify(pricing, null, 2), "utf-8");

    console.log(`✓ EC2 pricing saved to: ${outputFile}`);
    return outputFile;
}
