import { z } from 'zod';

/**
 * Canonical pricing units - ONLY these are allowed
 * Any AWS unit must map to one of these
 */
export const PricingUnit = z.enum([
    'hour',
    'gb',
    'gb_month',
    'request',
    'million_requests',
    'transition',
    'flat',
    'vcpu_hour',
    'ecpu_hour',
    'second',
    'minute',
]);

export type PricingUnit = z.infer<typeof PricingUnit>;

/**
 * Pricing tier with explicit boundaries
 * upTo: numeric boundary in base units, or "Infinity" for final tier
 */
export const PricingTier = z.object({
    upTo: z.union([z.number().positive(), z.literal('Infinity')]),
    rate: z.number().nonnegative(),
    unit: PricingUnit,
});

export type PricingTier = z.infer<typeof PricingTier>;

/**
 * Simple rate pricing (non-tiered)
 */
export const SimpleRate = z.object({
    rate: z.number().nonnegative(),
    unit: PricingUnit,
});

export type SimpleRate = z.infer<typeof SimpleRate>;

/**
 * Base service pricing metadata
 */
export const BaseServicePricing = z.object({
    service: z.string(),
    region: z.string(),
    currency: z.literal('USD'),
    version: z.string().regex(/^v\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g., v1.0.0)'),
    lastUpdated: z.string().datetime(),
});

export type BaseServicePricing = z.infer<typeof BaseServicePricing>;

/**
 * Component pricing can be either simple rate or tiered
 */
export const ComponentPricing = z.union([
    SimpleRate,
    z.array(PricingTier).min(1),
]);

export type ComponentPricing = z.infer<typeof ComponentPricing>;

/**
 * Generic service output structure
 */
export const ServicePricingOutput = BaseServicePricing.extend({
    components: z.record(z.unknown()), // Service-specific schemas will refine this
});

export type ServicePricingOutput = z.infer<typeof ServicePricingOutput>;

/**
 * Validation helpers
 */
export function assertNumeric(value: unknown, fieldName: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`[VALIDATION FAILED] ${fieldName} must be a finite number, got: ${value}`);
    }
}

export function assertPositive(value: number, fieldName: string): void {
    if (value < 0) {
        throw new Error(`[VALIDATION FAILED] ${fieldName} must be non-negative, got: ${value}`);
    }
}

export function assertUnit(unit: unknown): asserts unit is PricingUnit {
    const result = PricingUnit.safeParse(unit);
    if (!result.success) {
        throw new Error(`[VALIDATION FAILED] Invalid pricing unit: ${unit}. Must be one of: ${PricingUnit.options.join(', ')}`);
    }
}

/**
 * Validate tier continuity - no gaps, proper ordering
 */
export function assertTierContinuity(tiers: PricingTier[]): void {
    if (tiers.length === 0) {
        throw new Error('[VALIDATION FAILED] Tier array cannot be empty');
    }

    let previousBoundary = 0;

    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i]!;
        const currentBoundary = tier.upTo;

        // Last tier must be Infinity
        if (i === tiers.length - 1) {
            if (currentBoundary !== 'Infinity') {
                throw new Error(`[VALIDATION FAILED] Final tier must have upTo="Infinity", got: ${currentBoundary}`);
            }
        } else {
            // Non-final tiers must be numeric and increasing
            if (typeof currentBoundary !== 'number') {
                throw new Error(`[VALIDATION FAILED] Non-final tier ${i} must have numeric upTo, got: ${currentBoundary}`);
            }
            if (currentBoundary <= previousBoundary) {
                throw new Error(`[VALIDATION FAILED] Tier ${i} boundary ${currentBoundary} must be greater than previous ${previousBoundary}`);
            }
            previousBoundary = currentBoundary;
        }

        // Validate rate
        assertNumeric(tier.rate, `Tier ${i} rate`);
        assertPositive(tier.rate, `Tier ${i} rate`);
    }
}
