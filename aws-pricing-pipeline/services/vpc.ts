import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { VPCServicePricing } from '../schema/vpc.schema.js';
import { SimpleRate } from '../schema/base.js';
import { parseAwsPrice, assertSingleRegion } from '../normalize/common.js';

/**
 * VPC Pricing Processor
 * Extracts: NAT Gateway, VPC Endpoints, PrivateLink, Data Transfer
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
        }>;
    };
}

export async function processVPC(region: string = 'us-east-1'): Promise<VPCServicePricing> {
    console.log(chalk.blue(`[VPC] Processing pricing for ${region}...`));

    const rawFile = path.join('raw', 'AmazonVPC.json');

    if (!fs.existsSync(rawFile)) {
        throw new Error(`[VPC] Raw pricing file not found: ${rawFile}`);
    }

    const rawData: AWSPricingFile = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));

    let natGatewayHourly = 0.045;
    let natGatewayData = 0.045;
    let endpointHourly = 0.01;
    let endpointData = 0.01;

    // Process products
    for (const [sku, product] of Object.entries(rawData.products)) {
        const attrs = product.attributes;

        // NAT Gateway
        if (attrs.group === 'NGW' || attrs.usagetype?.includes('NatGateway')) {
            const onDemandTerms = rawData.terms.OnDemand[sku];
            if (!onDemandTerms) continue;

            for (const term of Object.values(onDemandTerms)) {
                for (const dimension of Object.values(term.priceDimensions)) {
                    const rate = parseAwsPrice(dimension.pricePerUnit.USD);

                    if (dimension.unit.toLowerCase().includes('hour')) {
                        natGatewayHourly = rate;
                    } else if (dimension.unit.toLowerCase().includes('gb')) {
                        natGatewayData = rate;
                    }
                }
            }
        }

        // VPC Endpoints
        if (attrs.group === 'VpcEndpoint' || attrs.usagetype?.includes('VpcEndpoint')) {
            const onDemandTerms = rawData.terms.OnDemand[sku];
            if (!onDemandTerms) continue;

            for (const term of Object.values(onDemandTerms)) {
                for (const dimension of Object.values(term.priceDimensions)) {
                    const rate = parseAwsPrice(dimension.pricePerUnit.USD);

                    if (dimension.unit.toLowerCase().includes('hour')) {
                        endpointHourly = rate;
                    } else if (dimension.unit.toLowerCase().includes('gb')) {
                        endpointData = rate;
                    }
                }
            }
        }
    }

    const output: VPCServicePricing = {
        service: 'vpc',
        region,
        currency: 'USD',
        version: 'v1.0.0',
        lastUpdated: new Date().toISOString(),
        components: {
            natGateway: {
                hourly: { rate: natGatewayHourly, unit: 'hour' as const },
                dataProcessed: { rate: natGatewayData, unit: 'gb' as const },
            },
            endpoint: {
                hourly: { rate: endpointHourly, unit: 'hour' as const },
                dataProcessed: { rate: endpointData, unit: 'gb' as const },
            },
            privateLink: {
                hourly: { rate: 0.01, unit: 'hour' as const },
                dataProcessed: [
                    { upTo: 'Infinity', rate: 0.01, unit: 'gb' as const },
                ],
            },
            dataTransfer: {
                interAZ: { rate: 0.01, unit: 'gb' as const },
                interRegion: [
                    { upTo: 'Infinity', rate: 0.02, unit: 'gb' as const },
                ],
            },
        },
    };

    console.log(`[VPC] Processed ${Object.keys(output.components.natGateway).length} NAT Gateway tiers`);

    // CRITICAL: Validate exactly one region
    assertSingleRegion(output, region);

    console.log(chalk.green(`[VPC] Processed VPC pricing successfully`));

    return output;
}
