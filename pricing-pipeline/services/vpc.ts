/**
 * VPC Service Processor
 * Transforms raw AWS VPC pricing into normalized format
 */

import * as fs from "fs";
import * as path from "path";
import { loadRawVPCPricing } from "../fetch/vpc.js";
import { isValidVPCSKU, isSupportedRegion } from "../normalize/filters.js";
import { normalizeRegion, parsePrice, getCurrentTimestamp } from "../normalize/common.js";
import { PricingTier, extractTiers } from "../normalize/tiers.js";

interface VPCPricing {
    service: "vpc";
    region: string;
    currency: "USD";
    version: string;
    lastUpdated: string;
    components: {
        nat_gateway: {
            hourly: number;
            data_processing_per_gb: number;
        };
        igw: {
            data_transfer: {
                tiers: PricingTier[];
            };
        };
    };
}

/**
 * Process VPC pricing for a specific region
 */
export function processVPCPricing(targetRegion: string = "us-east-1"): VPCPricing {
    console.log(`Processing VPC pricing for region: ${targetRegion}`);

    const rawPricing = loadRawVPCPricing();
    const products = rawPricing.products || {};
    const onDemandTerms = rawPricing.terms?.OnDemand || {};

    let natGatewayHourly = 0;
    let natGatewayDataProcessing = 0;
    const igwTiers: PricingTier[] = [];

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

        // Get pricing from OnDemand terms
        const skuTerms = onDemandTerms[sku];
        if (!skuTerms) {
            skippedCount++;
            continue;
        }

        const offerTermCode = Object.keys(skuTerms)[0];
        const priceDimensions = skuTerms[offerTermCode]?.priceDimensions;

        if (!priceDimensions) {
            skippedCount++;
            continue;
        }

        // NAT Gateway
        if (attributes.group === "NAT Gateway") {
            const rateCode = Object.keys(priceDimensions)[0];
            const dimension = priceDimensions[rateCode];
            const usageType = dimension?.usageType || "";

            if (usageType.includes("NatGateway-Hours")) {
                natGatewayHourly = parsePrice(dimension.pricePerUnit?.USD || 0);
                processedCount++;
            } else if (usageType.includes("NatGateway-Bytes")) {
                // Convert from per-byte to per-GB
                const pricePerByte = parsePrice(dimension.pricePerUnit?.USD || 0);
                natGatewayDataProcessing = pricePerByte * 1024 * 1024 * 1024;
                processedCount++;
            }
        }

        // Internet Gateway data transfer (from EC2 pricing, not VPC)
        // We'll use standard AWS data transfer tiers
        skippedCount++;
    }

    // Standard AWS data transfer tiers (out to internet)
    const standardDataTransferTiers: PricingTier[] = [
        { upTo: 10240, rate: 0.09, unit: "gb" },      // First 10 TB
        { upTo: 51200, rate: 0.085, unit: "gb" },     // Next 40 TB
        { upTo: 153600, rate: 0.07, unit: "gb" },     // Next 100 TB
        { upTo: "Infinity", rate: 0.05, unit: "gb" }, // Over 150 TB
    ];

    console.log(`✓ Processed ${processedCount} VPC components`);
    console.log(`  Skipped ${skippedCount} SKUs`);

    return {
        service: "vpc",
        region: targetRegion,
        currency: "USD",
        version: "v1",
        lastUpdated: getCurrentTimestamp(),
        components: {
            nat_gateway: {
                hourly: natGatewayHourly || 0.045, // Default if not found
                data_processing_per_gb: natGatewayDataProcessing || 0.045,
            },
            igw: {
                data_transfer: {
                    tiers: standardDataTransferTiers,
                },
            },
        },
    };
}

/**
 * Save VPC pricing to output directory
 */
export function saveVPCPricing(pricing: VPCPricing): string {
    const outputDir = path.join(
        process.cwd(),
        "output",
        "aws",
        pricing.version,
        "services"
    );

    fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, "vpc.json");
    fs.writeFileSync(outputFile, JSON.stringify(pricing, null, 2), "utf-8");

    console.log(`✓ VPC pricing saved to: ${outputFile}`);
    return outputFile;
}
