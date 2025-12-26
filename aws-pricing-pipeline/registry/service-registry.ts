import { processEC2 } from '../services/ec2.js';
import { processS3 } from '../services/s3.js';
import { processLambda } from '../services/lambda.js';
import { processVPC } from '../services/vpc.js';
import { processRDS } from '../services/rds.js';

/**
 * Service Registry
 * Single source of truth for all AWS services in the pipeline
 * 
 * CRITICAL: Every enabled service MUST have both a fetcher and processor
 */

export interface ServiceDefinition {
    /** Service code (matches AWS pricing API) */
    code: string;

    /** Human-readable service name */
    name: string;

    /** AWS Pricing API URL */
    fetchUrl: string;

    /** Processor function */
    processor: (region: string) => Promise<any>;

    /** Whether this service is enabled in the pipeline */
    enabled: boolean;
}

const AWS_PRICING_BASE = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws';

/**
 * Service Registry
 * Add new services here - they will automatically be fetched and processed
 */
export const SERVICE_REGISTRY: ServiceDefinition[] = [
    {
        code: 'AmazonEC2',
        name: 'EC2',
        fetchUrl: `${AWS_PRICING_BASE}/AmazonEC2/current/index.json`,
        processor: processEC2,
        enabled: true,
    },
    {
        code: 'AmazonS3',
        name: 'S3',
        fetchUrl: `${AWS_PRICING_BASE}/AmazonS3/current/index.json`,
        processor: processS3,
        enabled: true,
    },
    {
        code: 'AWSLambda',
        name: 'Lambda',
        fetchUrl: `${AWS_PRICING_BASE}/AWSLambda/current/index.json`,
        processor: processLambda,
        enabled: true,
    },
    {
        code: 'AmazonVPC',
        name: 'VPC',
        fetchUrl: `${AWS_PRICING_BASE}/AmazonVPC/current/index.json`,
        processor: processVPC,
        enabled: true,
    },
    {
        code: 'AmazonRDS',
        name: 'RDS',
        fetchUrl: `${AWS_PRICING_BASE}/AmazonRDS/current/index.json`,
        processor: processRDS,
        enabled: true,
    },
];

/**
 * Get all enabled services
 */
export function getEnabledServices(): ServiceDefinition[] {
    return SERVICE_REGISTRY.filter(s => s.enabled);
}

/**
 * Get all services (enabled and disabled)
 */
export function getAllServices(): ServiceDefinition[] {
    return SERVICE_REGISTRY;
}

/**
 * Get service by code
 */
export function getServiceByCode(code: string): ServiceDefinition | undefined {
    return SERVICE_REGISTRY.find(s => s.code === code);
}

/**
 * Get service codes for enabled services
 */
export function getEnabledServiceCodes(): string[] {
    return getEnabledServices().map(s => s.code);
}
