import { ZodSchema } from 'zod';
import chalk from 'chalk';
import { assertTierContinuity, PricingTier } from '../schema/base.js';

/**
 * Hard validation gate
 * Validates pricing output against schema
 * CRASHES on any validation failure
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validate pricing data against Zod schema
 */
export function validateSchema<T>(
    data: unknown,
    schema: ZodSchema<T>,
    serviceName: string
): T {
    console.log(chalk.blue(`[VALIDATE] ${serviceName}...`));

    const result = schema.safeParse(data);

    if (!result.success) {
        console.error(chalk.red(`[VALIDATION FAILED] ${serviceName}:`));
        console.error(result.error.errors);

        throw new Error(
            `[VALIDATION FAILED] ${serviceName} failed schema validation:\n` +
            result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n')
        );
    }

    console.log(chalk.green(`[VALIDATE SUCCESS] ${serviceName}`));

    return result.data;
}

/**
 * Validate all numeric values in object
 * Ensures no NaN, null, undefined, or negative values
 */
export function validateNumericValues(
    obj: any,
    path: string = 'root'
): void {
    if (obj === null || obj === undefined) {
        throw new Error(`[VALIDATION FAILED] ${path} is null or undefined`);
    }

    if (typeof obj === 'number') {
        if (!Number.isFinite(obj)) {
            throw new Error(`[VALIDATION FAILED] ${path} is not a finite number: ${obj}`);
        }
        if (obj < 0) {
            throw new Error(`[VALIDATION FAILED] ${path} is negative: ${obj}`);
        }
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            validateNumericValues(item, `${path}[${index}]`);
        });
        return;
    }

    if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
            validateNumericValues(value, `${path}.${key}`);
        }
    }
}

/**
 * Validate tier arrays in pricing data
 */
export function validateTiers(
    obj: any,
    path: string = 'root'
): void {
    if (Array.isArray(obj)) {
        // Check if this looks like a tier array
        if (obj.length > 0 && obj[0] && typeof obj[0] === 'object' && 'upTo' in obj[0]) {
            assertTierContinuity(obj as PricingTier[]);
        } else {
            obj.forEach((item, index) => {
                validateTiers(item, `${path}[${index}]`);
            });
        }
        return;
    }

    if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
            validateTiers(value, `${path}.${key}`);
        }
    }
}

/**
 * Full validation pipeline
 */
export function validatePricingData<T>(
    data: unknown,
    schema: ZodSchema<T>,
    serviceName: string
): T {
    // 1. Schema validation
    const validated = validateSchema(data, schema, serviceName);

    // 2. Numeric validation
    console.log(chalk.blue(`[VALIDATE] ${serviceName} - Checking numeric values...`));
    validateNumericValues(validated);

    // 3. Tier validation
    console.log(chalk.blue(`[VALIDATE] ${serviceName} - Checking tier continuity...`));
    validateTiers(validated);

    console.log(chalk.green.bold(`[VALIDATE SUCCESS] ${serviceName} passed all validation checks`));

    return validated;
}
