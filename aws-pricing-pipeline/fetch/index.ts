import fs from 'fs';
import path from 'path';
import { getEnabledServices } from '../registry/service-registry.js';
import { fetchAllServices } from './fetcher.js';
import { generateManifest, validateManifest, writeManifest, DownloadResult } from './manifest.js';

/**
 * Fetch all enabled services from ServiceRegistry
 * Returns array of successfully fetched service codes
 * Generates download manifest and validates all downloads
 */
export async function fetchAll(): Promise<string[]> {
    const enabledServices = getEnabledServices();

    const servicesToFetch = enabledServices.map(s => ({
        code: s.code,
        name: s.name,
        url: s.fetchUrl,
        enabled: true,
    }));

    // Fetch all services (throws on failure)
    const fetchResults = await fetchAllServices(
        servicesToFetch.map(s => ({ code: s.code, url: s.url }))
    );

    // Convert FetchResult[] to DownloadResult[]
    const downloadResults: DownloadResult[] = fetchResults.map(r => ({
        service: r.service,
        success: r.success,
        error: r.error,
    }));

    // Validate all files exist and are non-empty
    for (const result of downloadResults) {
        if (result.success) {
            const filePath = path.join('raw', `${result.service}.json`);

            if (!fs.existsSync(filePath)) {
                result.success = false;
                result.error = 'File not found after download';
            } else {
                const stats = fs.statSync(filePath);
                if (stats.size === 0) {
                    result.success = false;
                    result.error = 'File is empty (0 bytes)';
                }
            }
        }
    }

    // Generate manifest
    const manifest = generateManifest(downloadResults);

    // Write manifest to disk
    writeManifest(manifest);

    // Validate manifest (throws if any failures)
    validateManifest(manifest);

    // Return codes of all successfully downloaded services
    return manifest.downloaded;
}
