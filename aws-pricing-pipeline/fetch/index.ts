import { getEnabledServices } from '../registry/service-registry.js';
import { fetchAllServices } from './fetcher.js';

/**
 * Fetch all enabled services from ServiceRegistry
 * Returns array of successfully fetched service codes
 */
export async function fetchAll(): Promise<string[]> {
    const enabledServices = getEnabledServices();

    const servicesToFetch = enabledServices.map(s => ({
        code: s.code,
        name: s.name,
        url: s.fetchUrl,
        enabled: true,
    }));

    await fetchAllServices(servicesToFetch);

    // Return codes of all enabled services (fetcher throws on failure)
    return enabledServices.map(s => s.code);
}
