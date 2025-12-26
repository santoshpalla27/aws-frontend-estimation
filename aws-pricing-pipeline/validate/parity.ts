/**
 * Service Parity Validation
 * Ensures strict 1:1 parity between fetched and processed services
 */

export interface ParityValidationResult {
    isValid: boolean;
    fetchedOnly: string[];
    processedOnly: string[];
    errorMessage?: string;
}

/**
 * Validate that fetched and processed services match exactly
 */
export function validateServiceParity(
    fetchedServices: string[],
    processedServices: string[]
): ParityValidationResult {
    const fetchedSet = new Set(fetchedServices);
    const processedSet = new Set(processedServices);

    const fetchedOnly = fetchedServices.filter(s => !processedSet.has(s));
    const processedOnly = processedServices.filter(s => !fetchedSet.has(s));

    const isValid = fetchedOnly.length === 0 && processedOnly.length === 0;

    if (!isValid) {
        const errorMessage = generateMismatchReport(fetchedOnly, processedOnly, fetchedServices, processedServices);
        return { isValid, fetchedOnly, processedOnly, errorMessage };
    }

    return { isValid, fetchedOnly, processedOnly };
}

/**
 * Generate detailed mismatch report
 */
function generateMismatchReport(
    fetchedOnly: string[],
    processedOnly: string[],
    allFetched: string[],
    allProcessed: string[]
): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔════════════════════════════════════════════════════════════════╗');
    lines.push('║  FATAL ERROR: SERVICE PARITY MISMATCH                          ║');
    lines.push('╚════════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push('The pipeline detected a mismatch between fetched and processed services.');
    lines.push('This is a CRITICAL safety violation that prevents silent data loss.');
    lines.push('');

    if (fetchedOnly.length > 0) {
        lines.push('❌ FETCHED BUT NOT PROCESSED:');
        lines.push('   These services were downloaded but have no processor:');
        fetchedOnly.forEach(service => {
            lines.push(`   - ${service}`);
        });
        lines.push('');
        lines.push('   ACTION REQUIRED: Add a processor for each service in ServiceRegistry');
        lines.push('');
    }

    if (processedOnly.length > 0) {
        lines.push('❌ PROCESSED BUT NOT FETCHED:');
        lines.push('   These services have processors but were not downloaded:');
        processedOnly.forEach(service => {
            lines.push(`   - ${service}`);
        });
        lines.push('');
        lines.push('   ACTION REQUIRED: Ensure these services are enabled in ServiceRegistry');
        lines.push('');
    }

    lines.push('📊 SUMMARY:');
    lines.push(`   Fetched:   ${allFetched.length} services [${allFetched.join(', ')}]`);
    lines.push(`   Processed: ${allProcessed.length} services [${allProcessed.join(', ')}]`);
    lines.push('');
    lines.push('The pipeline will NOT continue until this mismatch is resolved.');
    lines.push('');

    return lines.join('\n');
}

/**
 * Throw fatal error on parity mismatch
 */
export function assertServiceParity(
    fetchedServices: string[],
    processedServices: string[]
): void {
    const result = validateServiceParity(fetchedServices, processedServices);

    if (!result.isValid) {
        throw new Error(result.errorMessage);
    }
}
