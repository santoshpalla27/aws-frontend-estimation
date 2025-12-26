import { getEnabledServices } from './services.js';
import { fetchAllServices } from './fetcher.js';

/**
 * Main fetch orchestrator
 * Downloads all enabled services
 */
export async function fetchAll(): Promise<void> {
    const services = getEnabledServices();

    await fetchAllServices(
        services.map(s => ({ code: s.code, url: s.url })),
        5 // Concurrency
    );
}
