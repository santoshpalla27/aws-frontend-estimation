import { z } from 'zod';
import { BaseServicePricing, SimpleRate, PricingTier } from './base.js';

/**
 * S3 Storage Class Pricing
 */
export const S3StoragePricing = z.object({
    standard: z.array(PricingTier),
    intelligentTiering: z.array(PricingTier),
    standardIA: SimpleRate,
    oneZoneIA: SimpleRate,
    glacier: SimpleRate,
    glacierDeepArchive: SimpleRate,
});

/**
 * S3 Request Pricing
 */
export const S3RequestPricing = z.object({
    put: SimpleRate,
    copy: SimpleRate,
    post: SimpleRate,
    list: SimpleRate,
    get: SimpleRate,
    select: SimpleRate,
    lifecycle: SimpleRate,
});

/**
 * S3 Data Transfer Pricing
 */
export const S3DataTransferPricing = z.object({
    in: SimpleRate, // Usually free
    out: z.array(PricingTier),
    interRegion: SimpleRate.optional(),
});

/**
 * S3 Retrieval Pricing (for Glacier, etc.)
 */
export const S3RetrievalPricing = z.object({
    glacier: z.object({
        expedited: SimpleRate,
        standard: SimpleRate,
        bulk: SimpleRate,
    }),
    glacierDeepArchive: z.object({
        standard: SimpleRate,
        bulk: SimpleRate,
    }),
});

/**
 * Complete S3 Service Pricing
 */
export const S3ServicePricing = BaseServicePricing.extend({
    service: z.literal('s3'),
    components: z.object({
        storage: S3StoragePricing,
        requests: S3RequestPricing,
        dataTransfer: S3DataTransferPricing,
        retrieval: S3RetrievalPricing,
    }),
});

export type S3ServicePricing = z.infer<typeof S3ServicePricing>;
