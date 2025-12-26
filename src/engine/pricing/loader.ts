/**
 * Pricing loader
 * Loads pricing JSON from versioned output
 */

export interface PricingData {
    service: string;
    region: string;
    currency: string;
    version: string;
    lastUpdated: string;
    [key: string]: any;
}

/**
 * Load pricing data for a service
 * In production, this would fetch from the pricing/ directory
 * For now, we'll use a simple in-memory cache
 */
export class PricingLoader {
    private cache: Map<string, PricingData> = new Map();

    /**
     * Load pricing for a service
     * 
     * @param service - Service name
     * @param region - AWS region
     * @param version - Pricing version
     * @returns Pricing data
     */
    async load(
        service: string,
        region: string,
        version: string = "v1"
    ): Promise<PricingData> {
        const cacheKey = `${service}-${region}-${version}`;

        // Check cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // In production, fetch from /pricing/aws/{version}/services/{service}.json
        // For now, we'll throw an error
        throw new Error(
            `Pricing data not loaded for ${service} in ${region} (${version}). ` +
            `Run pricing pipeline first.`
        );
    }

    /**
     * Preload pricing data
     * Useful for testing or when pricing is bundled with the app
     * 
     * @param data - Pricing data
     */
    preload(data: PricingData): void {
        const cacheKey = `${data.service}-${data.region}-${data.version}`;
        this.cache.set(cacheKey, data);
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}

/**
 * Global pricing loader instance
 */
export const pricingLoader = new PricingLoader();

