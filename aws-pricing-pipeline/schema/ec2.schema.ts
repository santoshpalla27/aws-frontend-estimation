import { z } from 'zod';
import { BaseServicePricing, SimpleRate, PricingTier } from './base.js';

/**
 * EC2 Instance Pricing
 */
export const EC2InstancePricing = z.record(
    z.string(), // instance type (e.g., "t3.micro")
    SimpleRate
);

/**
 * EBS Volume Pricing
 */
export const EBSVolumePricing = z.object({
    gp3: SimpleRate,
    gp2: SimpleRate,
    io2: SimpleRate,
    io1: SimpleRate,
    st1: SimpleRate,
    sc1: SimpleRate,
    standard: SimpleRate,
    // IOPS pricing for io1/io2
    io1_iops: SimpleRate.optional(),
    io2_iops: SimpleRate.optional(),
    // Throughput pricing for gp3
    gp3_throughput: SimpleRate.optional(),
});

/**
 * EBS Snapshot Pricing
 */
export const EBSSnapshotPricing = z.object({
    storage: SimpleRate,
});

/**
 * Data Transfer Pricing (tiered)
 */
export const DataTransferPricing = z.object({
    in: SimpleRate, // Usually free
    out: z.array(PricingTier),
    interRegion: z.array(PricingTier).optional(),
    interAZ: SimpleRate.optional(),
});

/**
 * Elastic IP Pricing
 */
export const ElasticIPPricing = z.object({
    idle: SimpleRate,
    additional: SimpleRate,
});

/**
 * Complete EC2 Service Pricing
 */
export const EC2ServicePricing = BaseServicePricing.extend({
    service: z.literal('ec2'),
    components: z.object({
        instances: EC2InstancePricing,
        ebs: EBSVolumePricing,
        snapshots: EBSSnapshotPricing,
        dataTransfer: DataTransferPricing,
        elasticIP: ElasticIPPricing,
    }),
});

export type EC2ServicePricing = z.infer<typeof EC2ServicePricing>;
