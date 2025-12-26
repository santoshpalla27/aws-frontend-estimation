import { z } from 'zod';
import { BaseServicePricing, SimpleRate, PricingTier } from './base.js';

/**
 * NAT Gateway Pricing
 */
export const NATGatewayPricing = z.object({
    hourly: SimpleRate,
    dataProcessed: SimpleRate,
});

/**
 * VPC Endpoint Pricing
 */
export const VPCEndpointPricing = z.object({
    hourly: SimpleRate,
    dataProcessed: SimpleRate.optional(),
});

/**
 * PrivateLink Pricing
 */
export const PrivateLinkPricing = z.object({
    hourly: SimpleRate,
    dataProcessed: z.array(PricingTier),
});

/**
 * VPC Data Transfer
 */
export const VPCDataTransferPricing = z.object({
    interAZ: SimpleRate,
    interRegion: z.array(PricingTier),
});

/**
 * Complete VPC Service Pricing
 */
export const VPCServicePricing = BaseServicePricing.extend({
    service: z.literal('vpc'),
    components: z.object({
        natGateway: NATGatewayPricing,
        endpoint: VPCEndpointPricing,
        privateLink: PrivateLinkPricing,
        dataTransfer: VPCDataTransferPricing,
    }),
});

export type VPCServicePricing = z.infer<typeof VPCServicePricing>;
