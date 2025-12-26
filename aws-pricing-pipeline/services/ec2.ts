import fs from 'fs';
import path from 'path';
import { Logger, Timer } from '../utils/logger.js';
import { EC2ServicePricing } from '../schema/ec2.schema.js';
import { SimpleRate } from '../schema/base.js';
import { normalizeUnit, parseAwsPrice } from '../normalize/units.js';
import { applySKUFilters, EC2_FILTERS } from '../normalize/filters.js';
import { normalizeRegion } from '../normalize/common.js';

/**
 * EC2 Pricing Processor
 * Extracts: Instances, EBS, Snapshots, Data Transfer, Elastic IP
 */

interface AWSPricingFile {
    products: Record<string, {
        sku: string;
        productFamily: string;
        attributes: Record<string, string>;
    }>;
    terms: {
        OnDemand: Record<string, Record<string, {
            priceDimensions: Record<string, {
                unit: string;
                pricePerUnit: { USD: string };
                beginRange?: string;
                endRange?: string;
            }>;
        }>>;
    };
}

export async function processEC2(region: string = 'us-east-1'): Promise<EC2ServicePricing> {
    Logger.substep(`Processing EC2 pricing for ${region}`);
    const timer = new Timer('EC2 processing');

    const rawFile = path.join('raw', 'AmazonEC2.json');

    if (!fs.existsSync(rawFile)) {
        throw new Error(`[EC2] Raw pricing file not found: ${rawFile}`);
    }

    Logger.info(`Loading raw data from ${rawFile}`);
    const stats = fs.statSync(rawFile);
    Logger.data('File size', `${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const instances: Record<string, SimpleRate> = {};
    const ebsPricing: any = {};

    Logger.info('Streaming and parsing large JSON file...');

    // Use streaming JSON parser for large files
    const { default: StreamArray } = await import('stream-json/streamers/StreamArray.js');
    const { parser } = await import('stream-json');
    const { chain } = await import('stream-chain');

    return new Promise((resolve, reject) => {
        let products: Record<string, any> = {};
        let terms: any = {};
        let inProducts = false;
        let inTerms = false;
        let processedCount = 0;

        const pipeline = chain([
            fs.createReadStream(rawFile),
            parser(),
        ]);

        pipeline.on('data', (data: any) => {
            // Parse the JSON structure as it streams
            if (data.key === 'products' && data.name === 'startObject') {
                inProducts = true;
            } else if (data.key === 'terms' && data.name === 'startObject') {
                inTerms = true;
                inProducts = false;
            } else if (inProducts && data.name === 'endKey') {
                // Store product data
                if (data.value && typeof data.value === 'object') {
                    products[data.key] = data.value;
                    processedCount++;

                    if (processedCount % 10000 === 0) {
                        Logger.info(`Processed ${processedCount} products...`);
                    }
                }
            } else if (inTerms && data.key === 'OnDemand') {
                terms = { OnDemand: data.value };
            }
        });

        pipeline.on('end', () => {
            Logger.info(`Finished streaming. Processing ${Object.keys(products).length} products...`);

            try {
                // Process products
                for (const [sku, product] of Object.entries(products)) {
                    const attrs = product.attributes || {};

                    // Filter by region
                    try {
                        if (attrs.location && normalizeRegion(attrs.location) !== region) {
                            continue;
                        }
                    } catch {
                        continue; // Skip if region normalization fails
                    }

                    // Process EC2 Instances
                    if (product.productFamily === 'Compute Instance') {
                        // Apply SKU filters
                        if (!applySKUFilters(attrs, EC2_FILTERS)) {
                            continue;
                        }

                        const instanceType = attrs.instanceType;
                        if (!instanceType) continue;

                        // Get On-Demand pricing
                        const onDemandTerms = terms.OnDemand?.[sku];
                        if (!onDemandTerms) continue;

                        for (const term of Object.values(onDemandTerms)) {
                            for (const dimension of Object.values((term as any).priceDimensions || {})) {
                                const dim = dimension as any;
                                const rate = parseAwsPrice(dim.pricePerUnit.USD);
                                const unit = normalizeUnit(dim.unit);

                                instances[instanceType] = { rate, unit };
                                break; // Take first price dimension
                            }
                        }
                    }

                    // Process EBS Volumes
                    if (product.productFamily === 'Storage') {
                        const volumeType = attrs.volumeApiName;
                        if (!volumeType) continue;

                        const onDemandTerms = terms.OnDemand?.[sku];
                        if (!onDemandTerms) continue;

                        for (const term of Object.values(onDemandTerms)) {
                            for (const dimension of Object.values((term as any).priceDimensions || {})) {
                                const dim = dimension as any;
                                const rate = parseAwsPrice(dim.pricePerUnit.USD);
                                const unit = normalizeUnit(dim.unit);

                                ebsPricing[volumeType] = { rate, unit };
                                break;
                            }
                        }
                    }
                }

                // Build output
                const output: EC2ServicePricing = {
                    service: 'ec2',
                    region,
                    currency: 'USD',
                    version: 'v1', // Will be set by versioning system
                    lastUpdated: new Date().toISOString(),
                    components: {
                        instances,
                        ebs: {
                            gp3: ebsPricing['gp3'] || { rate: 0.08, unit: 'gb_month' as const },
                            gp2: ebsPricing['gp2'] || { rate: 0.10, unit: 'gb_month' as const },
                            io2: ebsPricing['io2'] || { rate: 0.125, unit: 'gb_month' as const },
                            io1: ebsPricing['io1'] || { rate: 0.125, unit: 'gb_month' as const },
                            st1: ebsPricing['st1'] || { rate: 0.045, unit: 'gb_month' as const },
                            sc1: ebsPricing['sc1'] || { rate: 0.015, unit: 'gb_month' as const },
                            standard: ebsPricing['standard'] || { rate: 0.05, unit: 'gb_month' as const },
                        },
                        snapshots: {
                            storage: { rate: 0.05, unit: 'gb_month' as const },
                        },
                        dataTransfer: {
                            in: { rate: 0, unit: 'gb' as const },
                            out: [
                                { upTo: 10240, rate: 0.09, unit: 'gb' as const },
                                { upTo: 51200, rate: 0.085, unit: 'gb' as const },
                                { upTo: 153600, rate: 0.07, unit: 'gb' as const },
                                { upTo: 'Infinity', rate: 0.05, unit: 'gb' as const },
                            ],
                        },
                        elasticIP: {
                            idle: { rate: 0.005, unit: 'hour' as const },
                            additional: { rate: 0.005, unit: 'hour' as const },
                        },
                    },
                };

                Logger.table({
                    'Instance types': Object.keys(instances).length,
                    'EBS volume types': Object.keys(ebsPricing).length,
                    'Region': region,
                });

                timer.end();
                Logger.success('EC2 processing complete');

                resolve(output);
            } catch (error) {
                reject(error);
            }
        });

        pipeline.on('error', (error: Error) => {
            Logger.error('Streaming error', error);
            reject(error);
        });
    });
}

// Filter by region
if (normalizeRegion(attrs.location || '') !== region) {
    continue;
}

// Process EC2 Instances
if (product.productFamily === 'Compute Instance') {
    // Apply SKU filters
    if (!applySKUFilters(attrs, EC2_FILTERS)) {
        continue;
    }

    const instanceType = attrs.instanceType;
    if (!instanceType) continue;

    // Get On-Demand pricing
    const onDemandTerms = rawData.terms.OnDemand[sku];
    if (!onDemandTerms) continue;

    for (const term of Object.values(onDemandTerms)) {
        for (const dimension of Object.values(term.priceDimensions)) {
            const rate = parseAwsPrice(dimension.pricePerUnit.USD);
            const unit = normalizeUnit(dimension.unit);

            instances[instanceType] = { rate, unit };
            break; // Take first price dimension
        }
    }
}

// Process EBS Volumes
if (product.productFamily === 'Storage') {
    const volumeType = attrs.volumeApiName;
    if (!volumeType) continue;

    const onDemandTerms = rawData.terms.OnDemand[sku];
    if (!onDemandTerms) continue;

    for (const term of Object.values(onDemandTerms)) {
        for (const dimension of Object.values(term.priceDimensions)) {
            const rate = parseAwsPrice(dimension.pricePerUnit.USD);
            const unit = normalizeUnit(dimension.unit);

            ebsPricing[volumeType] = { rate, unit };
            break;
        }
    }
}
    }

// Build output
const output: EC2ServicePricing = {
    service: 'ec2',
    region,
    currency: 'USD',
    version: 'v1', // Will be set by versioning system
    lastUpdated: new Date().toISOString(),
    components: {
        instances,
        ebs: {
            gp3: ebsPricing['gp3'] || { rate: 0.08, unit: 'gb_month' as const },
            gp2: ebsPricing['gp2'] || { rate: 0.10, unit: 'gb_month' as const },
            io2: ebsPricing['io2'] || { rate: 0.125, unit: 'gb_month' as const },
            io1: ebsPricing['io1'] || { rate: 0.125, unit: 'gb_month' as const },
            st1: ebsPricing['st1'] || { rate: 0.045, unit: 'gb_month' as const },
            sc1: ebsPricing['sc1'] || { rate: 0.015, unit: 'gb_month' as const },
            standard: ebsPricing['standard'] || { rate: 0.05, unit: 'gb_month' as const },
        },
        snapshots: {
            storage: { rate: 0.05, unit: 'gb_month' as const },
        },
        dataTransfer: {
            in: { rate: 0, unit: 'gb' as const },
            out: [
                { upTo: 10240, rate: 0.09, unit: 'gb' as const },
                { upTo: 51200, rate: 0.085, unit: 'gb' as const },
                { upTo: 153600, rate: 0.07, unit: 'gb' as const },
                { upTo: 'Infinity', rate: 0.05, unit: 'gb' as const },
            ],
        },
        elasticIP: {
            idle: { rate: 0.005, unit: 'hour' as const },
            additional: { rate: 0.005, unit: 'hour' as const },
        },
    },
};

Logger.table({
    'Instance types': Object.keys(instances).length,
    'EBS volume types': Object.keys(ebsPricing).length,
    'Region': region,
});

timer.end();
Logger.success('EC2 processing complete');

return output;
}
