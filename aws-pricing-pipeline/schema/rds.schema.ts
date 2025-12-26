import { z } from 'zod';
import { BaseServicePricing, SimpleRate } from './base.js';

/**
 * RDS Service Pricing Schema
 * Covers on-demand instance pricing and storage pricing
 */

export const RDSServicePricing = BaseServicePricing.extend({
    service: z.literal('rds'),
    components: z.object({
        // Instance pricing by instance type (e.g., db.t3.micro, db.m5.large)
        instances: z.record(z.string(), SimpleRate),

        // Storage pricing
        storage: z.object({
            gp3: SimpleRate,  // General Purpose SSD (gp3) per GB-month
        }),
    }),
});

export type RDSServicePricing = z.infer<typeof RDSServicePricing>;
