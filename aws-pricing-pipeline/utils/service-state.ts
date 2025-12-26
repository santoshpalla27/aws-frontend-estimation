/**
 * Service State Machine
 * Tracks each service through the complete pipeline
 * Ensures no service is falsely marked as supported
 */

export enum ServiceState {
    DOWNLOADED = 'DOWNLOADED',
    NORMALIZED = 'NORMALIZED',
    VALIDATED = 'VALIDATED',
    OUTPUT = 'OUTPUT',
    VERSIONED = 'VERSIONED',
}

export interface ServiceStatus {
    service: string;
    state: ServiceState;
    error?: string;
}

export class ServiceStateTracker {
    private states: Map<string, ServiceStatus> = new Map();

    /**
     * Initialize service in DOWNLOADED state
     */
    markDownloaded(service: string): void {
        this.states.set(service, {
            service,
            state: ServiceState.DOWNLOADED,
        });
    }

    /**
     * Advance service to NORMALIZED state
     */
    markNormalized(service: string): void {
        this.validateTransition(service, ServiceState.DOWNLOADED, ServiceState.NORMALIZED);
        this.states.set(service, {
            service,
            state: ServiceState.NORMALIZED,
        });
    }

    /**
     * Advance service to VALIDATED state
     */
    markValidated(service: string): void {
        this.validateTransition(service, ServiceState.NORMALIZED, ServiceState.VALIDATED);
        this.states.set(service, {
            service,
            state: ServiceState.VALIDATED,
        });
    }

    /**
     * Advance service to OUTPUT state
     */
    markOutput(service: string): void {
        this.validateTransition(service, ServiceState.VALIDATED, ServiceState.OUTPUT);
        this.states.set(service, {
            service,
            state: ServiceState.OUTPUT,
        });
    }

    /**
     * Advance service to VERSIONED state (final)
     */
    markVersioned(service: string): void {
        this.validateTransition(service, ServiceState.OUTPUT, ServiceState.VERSIONED);
        this.states.set(service, {
            service,
            state: ServiceState.VERSIONED,
        });
    }

    /**
     * Mark service as failed
     */
    markFailed(service: string, error: string): void {
        const current = this.states.get(service);
        if (current) {
            current.error = error;
        }
    }

    /**
     * Validate state transition
     */
    private validateTransition(service: string, expectedState: ServiceState, newState: ServiceState): void {
        const current = this.states.get(service);

        if (!current) {
            throw new Error(
                `[STATE MACHINE] Cannot transition ${service} to ${newState}: ` +
                `Service not initialized. Must start with DOWNLOADED.`
            );
        }

        if (current.state !== expectedState) {
            throw new Error(
                `[STATE MACHINE] Invalid transition for ${service}: ` +
                `Expected ${expectedState}, but current state is ${current.state}. ` +
                `Cannot advance to ${newState}.`
            );
        }
    }

    /**
     * Get all services that reached VERSIONED state
     */
    getVersionedServices(): string[] {
        return Array.from(this.states.values())
            .filter(s => s.state === ServiceState.VERSIONED)
            .map(s => s.service);
    }

    /**
     * Get all services that did NOT reach VERSIONED state
     */
    getUnsupportedServices(): ServiceStatus[] {
        return Array.from(this.states.values())
            .filter(s => s.state !== ServiceState.VERSIONED);
    }

    /**
     * Validate all services reached VERSIONED state
     * Throws if any service is incomplete
     */
    validateAllVersioned(): void {
        const unsupported = this.getUnsupportedServices();

        if (unsupported.length > 0) {
            const errorLines: string[] = [];
            errorLines.push('');
            errorLines.push('╔════════════════════════════════════════════════════════════════╗');
            errorLines.push('║  FATAL ERROR: INCOMPLETE SERVICE SUPPORT                       ║');
            errorLines.push('╚════════════════════════════════════════════════════════════════╝');
            errorLines.push('');
            errorLines.push(`${unsupported.length} service(s) did not complete the full pipeline:`);
            errorLines.push('');

            unsupported.forEach(s => {
                errorLines.push(`  ❌ ${s.service}: Stopped at ${s.state}`);
                if (s.error) {
                    errorLines.push(`     Error: ${s.error}`);
                }
            });

            errorLines.push('');
            errorLines.push('A service is only supported if it reaches VERSIONED state.');
            errorLines.push('Pipeline: DOWNLOADED → NORMALIZED → VALIDATED → OUTPUT → VERSIONED');
            errorLines.push('');
            errorLines.push('Partial implementations are rejected.');
            errorLines.push('');

            throw new Error(errorLines.join('\n'));
        }
    }

    /**
     * Get summary report
     */
    getSummary(): { versioned: number; unsupported: number; total: number } {
        const versioned = this.getVersionedServices().length;
        const unsupported = this.getUnsupportedServices().length;

        return {
            versioned,
            unsupported,
            total: this.states.size,
        };
    }
}
