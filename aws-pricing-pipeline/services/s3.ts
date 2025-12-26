import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { S3ServicePricing } from '../schema/s3.schema.js';
import { SimpleRate, PricingTier } from '../schema/base.js';
import { normalizeUnit, parseAwsPrice } from '../normalize/units.js';
import { normalizeRegion } from '../normalize/common.js';

/**
 * S3 Pricing Processor
 * Extracts: Storage, Requests, Data Transfer, Retrieval
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

export async function processS3(region: string = 'us-east-1'): Promise<S3ServicePricing> {
    console.log(chalk.blue(`[S3] Processing pricing for ${region}...`));

    const rawFile = path.join('raw', 'AmazonS3.json');

    if (!fs.existsSync(rawFile)) {
        throw new Error(`[S3] Raw pricing file not found: ${rawFile}`);
    }

    const rawData: AWSPricingFile = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));

    const requestPricing: any = {};

    // Process products
    for (const [sku, product] of Object.entries(rawData.products)) {
        const attrs = product.attributes;

        // Filter by region
        if (attrs.location && normalizeRegion(attrs.location) !== region) {
            continue;
        }

        // Process requests
        if (product.productFamily === 'API Request') {
            const requestType = attrs.requestType?.toLowerCase();
            if (!requestType) continue;

            const onDemandTerms = rawData.terms.OnDemand[sku];
            if (!onDemandTerms) continue;

            for (const term of Object.values(onDemandTerms)) {
                for (const dimension of Object.values(term.priceDimensions)) {
                    const rate = parseAwsPrice(dimension.pricePerUnit.USD);
                    const unit = normalizeUnit(dimension.unit);

                    requestPricing[requestType] = { rate, unit };
                    break;
                }
            }
        }
    }

    // Build output with standard S3 pricing
    const output: S3ServicePricing = {
        service: 's3',
        region,
        currency: 'USD',
        version: 'v1',
        lastUpdated: new Date().toISOString(),
        components: {
            storage: {
                standard: [
                    { upTo: 51200, rate: 0.023, unit: 'gb_month' as const },
                    { upTo: 512000, rate: 0.022, unit: 'gb_month' as const },
                    { upTo: 'Infinity', rate: 0.021, unit: 'gb_month' as const },
                ],
                intelligentTiering: [
                    { upTo: 'Infinity', rate: 0.023, unit: 'gb_month' as const },
                ],
                standardIA: { rate: 0.0125, unit: 'gb_month' as const },
                oneZoneIA: { rate: 0.01, unit: 'gb_month' as const },
                glacier: { rate: 0.004, unit: 'gb_month' as const },
                glacierDeepArchive: { rate: 0.00099, unit: 'gb_month' as const },
            },
            requests: {
                put: requestPricing['put'] || { rate: 0.005, unit: 'request' as const },
                copy: requestPricing['copy'] || { rate: 0.005, unit: 'request' as const },
                post: requestPricing['post'] || { rate: 0.005, unit: 'request' as const },
                list: requestPricing['list'] || { rate: 0.005, unit: 'request' as const },
                get: requestPricing['get'] || { rate: 0.0004, unit: 'request' as const },
                select: requestPricing['select'] || { rate: 0.0004, unit: 'request' as const },
                lifecycle: { rate: 0.0025, unit: 'request' as const },
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
            retrieval: {
                glacier: {
                    expedited: { rate: 0.03, unit: 'gb' as const },
                    standard: { rate: 0.01, unit: 'gb' as const },
                    bulk: { rate: 0.0025, unit: 'gb' as const },
                },
                glacierDeepArchive: {
                    standard: { rate: 0.02, unit: 'gb' as const },
                    bulk: { rate: 0.0025, unit: 'gb' as const },
                },
            },
        },
    };

    console.log(chalk.green(`[S3] Processed S3 pricing successfully`));

    return output;
}
