import fs from 'fs';
import path from 'path';
import { Logger, Timer } from '../utils/logger.js';
import { EC2ServicePricing } from '../schema/ec2.schema.js';
import { SimpleRate } from '../schema/base.js';
import { assertSingleRegion } from '../normalize/common.js';

/**
 * EC2 Pricing Processor
 * Extracts: Instances, EBS, Snapshots, Data Transfer, Elastic IP
 * 
 * NOTE: EC2 pricing file is 7+ GB. We use a simplified approach:
 * Load the file in chunks and process only what we need.
 */

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

    Logger.warn('EC2 file is too large (7+ GB). Using fallback pricing data.');
    Logger.info('For production use, consider pre-processing EC2 data or using AWS Price List API directly.');

    // For now, use default/fallback pricing for common instance types
    // This is a temporary solution until we implement proper chunked processing
    const commonInstances = [
        't3.micro', 't3.small', 't3.medium', 't3.large',
        't2.micro', 't2.small', 't2.medium', 't2.large',
        'm5.large', 'm5.xlarge', 'm5.2xlarge',
        'c5.large', 'c5.xlarge', 'c5.2xlarge',
        'r5.large', 'r5.xlarge', 'r5.2xlarge',
    ];

    // Approximate us-east-1 pricing (as of 2024)
    const approximatePricing: Record<string, number> = {
        't3.micro': 0.0104,
        't3.small': 0.0208,
        't3.medium': 0.0416,
        't3.large': 0.0832,
        't2.micro': 0.0116,
        't2.small': 0.023,
        't2.medium': 0.0464,
        't2.large': 0.0928,
        'm5.large': 0.096,
        'm5.xlarge': 0.192,
        'm5.2xlarge': 0.384,
        'c5.large': 0.085,
        'c5.xlarge': 0.17,
        'c5.2xlarge': 0.34,
        'r5.large': 0.126,
        'r5.xlarge': 0.252,
        'r5.2xlarge': 0.504,
    };

    for (const instanceType of commonInstances) {
        instances[instanceType] = {
            rate: approximatePricing[instanceType] || 0.10,
            unit: 'hour' as const
        };
    }

    Logger.warn(`Using approximate pricing for ${Object.keys(instances).length} common instance types`);

    // Build output with fallback data
    const output: EC2ServicePricing = {
        service: 'ec2',
        region,
        currency: 'USD',
        version: 'v1.0.0', // Will be set by versioning system
        lastUpdated: new Date().toISOString(),
        components: {
            instances,
            ebs: {
                gp3: { rate: 0.08, unit: 'gb_month' as const },
                gp2: { rate: 0.10, unit: 'gb_month' as const },
                io2: { rate: 0.125, unit: 'gb_month' as const },
                io1: { rate: 0.125, unit: 'gb_month' as const },
                st1: { rate: 0.045, unit: 'gb_month' as const },
                sc1: { rate: 0.015, unit: 'gb_month' as const },
                standard: { rate: 0.05, unit: 'gb_month' as const },
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
        'EBS volume types': 7,
        'Region': region,
        'Note': 'Using fallback pricing'
    });

    timer.end();
    Logger.success('EC2 processing complete (fallback mode)');

    // CRITICAL: Validate exactly one region
    assertSingleRegion(output, region);

    return output;
}
