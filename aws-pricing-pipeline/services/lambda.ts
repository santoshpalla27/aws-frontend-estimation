import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { LambdaServicePricing } from '../schema/lambda.schema.js';
import { parseAwsPrice } from '../normalize/units.js';

/**
 * Lambda Pricing Processor
 * Extracts: Compute (x86/ARM), Requests, Duration
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
            }>;
        }>>;
    };
}

export async function processLambda(region: string = 'us-east-1'): Promise<LambdaServicePricing> {
    console.log(chalk.blue(`[Lambda] Processing pricing for ${region}...`));

    const rawFile = path.join('raw', 'AWSLambda.json');

    if (!fs.existsSync(rawFile)) {
        throw new Error(`[Lambda] Raw pricing file not found: ${rawFile}`);
    }

    const rawData: AWSPricingFile = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));

    let x86ComputeRate = 0.0000166667; // Default per GB-second
    let armComputeRate = 0.0000133334; // Default per GB-second (ARM is ~20% cheaper)
    let requestRate = 0.20; // Default per million requests

    // Process products
    for (const [sku, product] of Object.entries(rawData.products)) {
        const attrs = product.attributes;

        // Filter by region
        if (attrs.location && !attrs.location.includes(region)) {
            continue;
        }

        const onDemandTerms = rawData.terms.OnDemand[sku];
        if (!onDemandTerms) continue;

        for (const term of Object.values(onDemandTerms)) {
            for (const dimension of Object.values(term.priceDimensions)) {
                const rate = parseAwsPrice(dimension.pricePerUnit.USD);

                // Identify pricing type
                if (attrs.group === 'AWS-Lambda-Duration') {
                    if (attrs.usagetype?.includes('ARM')) {
                        armComputeRate = rate;
                    } else {
                        x86ComputeRate = rate;
                    }
                } else if (attrs.group === 'AWS-Lambda-Requests') {
                    requestRate = rate;
                }
            }
        }
    }

    const output: LambdaServicePricing = {
        service: 'lambda',
        region,
        currency: 'USD',
        version: 'v1',
        lastUpdated: new Date().toISOString(),
        components: {
            compute: {
                x86: { rate: x86ComputeRate, unit: 'second' as const },
                arm: { rate: armComputeRate, unit: 'second' as const },
            },
            requests: {
                requests: { rate: requestRate, unit: 'million_requests' as const },
            },
            duration: {
                ephemeralStorage: { rate: 0.0000000309, unit: 'second' as const },
            },
        },
    };

    console.log(chalk.green(`[Lambda] Processed Lambda pricing successfully`));

    return output;
}
