import fs from 'fs';
import path from 'path';
import { RDSServicePricing } from '../schema/rds.schema.js';
import { normalizeRegion, parseAwsPrice, assertSingleRegion } from '../normalize/common.js';

/**
 * RDS Pricing Processor
 * Processes Amazon RDS pricing for on-demand instances and storage
 */

interface RDSProduct {
    attributes?: {
        instanceType?: string;
        databaseEngine?: string;
        deploymentOption?: string;
        location?: string;
        usagetype?: string;
        operation?: string;
        storageMedia?: string;
    };
}

interface RDSTerms {
    OnDemand?: Record<string, Record<string, {
        priceDimensions?: Record<string, {
            unit?: string;
            pricePerUnit?: { USD?: string };
        }>;
    }>>;
}

interface RDSPricingData {
    products?: Record<string, RDSProduct>;
    terms?: RDSTerms;
}

export async function processRDS(region: string = 'us-east-1'): Promise<RDSServicePricing> {
    console.log(`[RDS] Processing RDS pricing for ${region}`);

    const rawFile = path.join('raw', 'AmazonRDS.json');

    if (!fs.existsSync(rawFile)) {
        throw new Error(`[RDS] Raw pricing file not found: ${rawFile}`);
    }

    const rawData: RDSPricingData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
    const products = rawData.products || {};
    const terms = rawData.terms?.OnDemand || {};

    const instances: Record<string, { rate: number; unit: 'hour' }> = {};
    let gp3StorageRate: { rate: number; unit: 'gb_month' } | null = null;

    // Process products
    for (const [sku, product] of Object.entries(products)) {
        if (!product.attributes) continue;

        const attrs = product.attributes;

        // Filter by region
        if (attrs.location) {
            try {
                if (normalizeRegion(attrs.location) !== region) {
                    continue;
                }
            } catch {
                continue;
            }
        }

        // Get pricing terms
        const skuTerms = terms[sku];
        if (!skuTerms) continue;

        const offerTerm = Object.values(skuTerms)[0];
        if (!offerTerm?.priceDimensions) continue;

        const priceDim = Object.values(offerTerm.priceDimensions)[0];
        if (!priceDim?.pricePerUnit?.USD) continue;

        const priceUSD = priceDim.pricePerUnit.USD;
        const rate = parseAwsPrice(priceUSD);

        // Skip zero-price items
        if (rate === 0) continue;

        // Process instance pricing
        if (attrs.instanceType && attrs.databaseEngine) {
            // Filter: On-Demand, MySQL/PostgreSQL, Single-AZ
            if (
                attrs.deploymentOption === 'Single-AZ' &&
                (attrs.databaseEngine === 'MySQL' || attrs.databaseEngine === 'PostgreSQL') &&
                priceDim.unit === 'Hrs'
            ) {
                const instanceType = attrs.instanceType;
                instances[instanceType] = {
                    rate,
                    unit: 'hour',
                };
            }
        }

        // Process storage pricing (gp3)
        if (attrs.storageMedia === 'SSD-backed' && attrs.usagetype?.includes('GP3-Storage')) {
            if (priceDim.unit === 'GB-Mo') {
                gp3StorageRate = {
                    rate,
                    unit: 'gb_month',
                };
            }
        }
    }

    // Validate we have data
    if (Object.keys(instances).length === 0) {
        throw new Error(`[RDS] No instance pricing found for region ${region}`);
    }

    if (!gp3StorageRate) {
        throw new Error(`[RDS] No gp3 storage pricing found for region ${region}`);
    }

    const output: RDSServicePricing = {
        service: 'rds',
        region,
        currency: 'USD',
        version: 'v1.0.0',
        lastUpdated: new Date().toISOString(),
        components: {
            instances,
            storage: {
                gp3: gp3StorageRate,
            },
        },
    };

    console.log(`[RDS] Processed ${Object.keys(instances).length} instance types`);
    console.log(`[RDS] Processed storage pricing`);

    // CRITICAL: Validate exactly one region
    assertSingleRegion(output, region);

    return output;
}
