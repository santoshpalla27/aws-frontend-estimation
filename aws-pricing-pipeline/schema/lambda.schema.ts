import { z } from 'zod';
import { BaseServicePricing, SimpleRate } from './base.js';

/**
 * Lambda Compute Pricing (by architecture)
 */
export const LambdaComputePricing = z.object({
    x86: SimpleRate, // per GB-second
    arm: SimpleRate,  // per GB-second (Graviton2)
});

/**
 * Lambda Request Pricing
 */
export const LambdaRequestPricing = z.object({
    requests: SimpleRate, // per million requests
});

/**
 * Lambda Duration Pricing (ephemeral storage)
 */
export const LambdaDurationPricing = z.object({
    ephemeralStorage: SimpleRate.optional(), // per GB-second for storage > 512MB
});

/**
 * Complete Lambda Service Pricing
 */
export const LambdaServicePricing = BaseServicePricing.extend({
    service: z.literal('lambda'),
    components: z.object({
        compute: LambdaComputePricing,
        requests: LambdaRequestPricing,
        duration: LambdaDurationPricing,
    }),
});

export type LambdaServicePricing = z.infer<typeof LambdaServicePricing>;
