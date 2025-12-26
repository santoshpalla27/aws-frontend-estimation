#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fetchAll } from './fetch/index.js';
import { getEnabledServices } from './registry/service-registry.js';
import { assertServiceParity } from './validate/parity.js';
import { validatePricingData } from './validate/validate.js';
import { deepSortObject } from './utils/deterministic.js';
import { readManifest } from './fetch/manifest.js';
import { ServiceStateTracker } from './utils/service-state.js';
import { EC2ServicePricing } from './schema/ec2.schema.js';
import { S3ServicePricing } from './schema/s3.schema.js';
import { LambdaServicePricing } from './schema/lambda.schema.js';
import { VPCServicePricing } from './schema/vpc.schema.js';
import { RDSServicePricing } from './schema/rds.schema.js';
import { diffPricing, loadPreviousVersion, generateDiffReport, DiffResult } from './versioning/diff.js';
import { getCurrentVersion, bumpVersion, createVersionDirectory, updateLatestPointer, writeVersionMetadata } from './versioning/bump.js';

type BumpType = 'major' | 'minor' | 'patch';

/**
 * AWS Pricing Pipeline
 * Main orchestrator
 */

async function main() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║  AWS Pricing Pipeline                  ║'));
    console.log(chalk.bold.cyan('║  Deterministic • Auditable • Versioned ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════╝\n'));

    try {
        // Initialize service state tracker
        const stateTracker = new ServiceStateTracker();

        // Step 1: Fetch raw pricing data
        console.log(chalk.bold.yellow('\n[STEP 1/6] Fetching AWS pricing data...\n'));
        const fetchedServices = await fetchAll();
        console.log(chalk.green(`✓ Fetched ${fetchedServices.length} services: ${fetchedServices.join(', ')}\n`));

        // Validate download manifest
        const manifest = readManifest();
        console.log(chalk.blue(`[MANIFEST] Downloaded: ${manifest.downloaded.length} services`));
        console.log(chalk.blue(`[MANIFEST] Failed: ${manifest.failed.length} services`));

        if (manifest.failed.length > 0) {
            throw new Error(`Download validation failed. See manifest for details.`);
        }

        // Mark all downloaded services
        fetchedServices.forEach(service => stateTracker.markDownloaded(service));

        // Step 2: Process services from registry
        console.log(chalk.bold.yellow('\n[STEP 2/6] Processing services...\n'));

        const region = 'us-east-1';
        const enabledServices = getEnabledServices();
        const serviceDataMap = new Map<string, any>();
        const processedServices: string[] = [];

        for (const service of enabledServices) {
            const data = await service.processor(region);
            serviceDataMap.set(service.code, data);
            processedServices.push(service.code);

            // Mark as normalized
            stateTracker.markNormalized(service.code);
        }

        // Step 2.5: CRITICAL - Validate service parity
        console.log(chalk.bold.yellow('\n[STEP 2.5/6] Validating service parity...\n'));
        assertServiceParity(fetchedServices, processedServices);
        console.log(chalk.green(`✓ Service parity validated: ${processedServices.length} services fetched and processed\n`));

        // Step 3: Validate pricing data
        console.log(chalk.bold.yellow('\n[STEP 3/6] Validating pricing data...\n'));

        const schemaMap: Record<string, any> = {
            'AmazonEC2': EC2ServicePricing,
            'AmazonS3': S3ServicePricing,
            'AWSLambda': LambdaServicePricing,
            'AmazonVPC': VPCServicePricing,
            'AmazonRDS': RDSServicePricing,
        };

        for (const [code, data] of serviceDataMap.entries()) {
            const schema = schemaMap[code];
            if (schema) {
                const serviceName = enabledServices.find(s => s.code === code)?.name || code;
                validatePricingData(data, schema, serviceName);
                console.log(chalk.green(`✓ ${serviceName} validated`));

                // Mark as validated
                stateTracker.markValidated(code);
            }
        }
        // Step 4: Diff against previous version
        console.log(chalk.bold.yellow('\n[STEP 4/6] Computing diffs...\n'));

        const diffs: DiffResult[] = [];

        const services = Array.from(serviceDataMap.entries()).map(([code, data]) => ({
            name: enabledServices.find(s => s.code === code)?.name.toLowerCase() || code.toLowerCase(),
            data,
        }));

        for (const service of services) {
            const previous = loadPreviousVersion(service.name);
            if (previous) {
                const diff = diffPricing(previous, service.data, service.name);
                diffs.push(diff);
                console.log(chalk.blue(`[DIFF] ${diff.summary}`));
            } else {
                console.log(chalk.yellow(`[DIFF] ${service.name}: No previous version (new service)`));
            }
        }

        // Step 5: Determine version bump
        console.log(chalk.bold.yellow('\n[STEP 5/6] Determining version bump...\n'));

        const currentVersion = getCurrentVersion();

        // Determine the highest priority bump type from all diffs
        const maxBumpType: BumpType = diffs.length > 0
            ? diffs.reduce((max: BumpType, d) => {
                const priority: Record<BumpType, number> = { major: 3, minor: 2, patch: 1 };
                return priority[d.bumpType] > priority[max] ? d.bumpType : max;
            }, 'patch' as BumpType)
            : 'minor'; // Default to minor for new services

        // Find the service that caused the highest bump
        const causingDiff = diffs.find(d => d.bumpType === maxBumpType) || diffs[0];

        const bumpReason = causingDiff ? {
            service: causingDiff.service,
            type: causingDiff.bumpType,
            reason: causingDiff.reason
        } : undefined;

        const newVersion = bumpVersion(currentVersion, maxBumpType);

        // Step 6: Write output
        console.log(chalk.bold.yellow('\n[STEP 6/6] Writing versioned output...\n'));

        const versionDir = createVersionDirectory(newVersion);
        const servicesDir = path.join(versionDir, 'services');

        // Write service files with deterministic output
        for (const service of services) {
            const filePath = path.join(servicesDir, `${service.name}.json`);

            // Update version in data
            const dataWithVersion = {
                ...service.data,
                version: newVersion.next,
            };

            // Sort keys recursively for deterministic output
            const sorted = deepSortObject(dataWithVersion);

            fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2));
            console.log(chalk.green(`[WRITE] ${filePath}`));

            // Mark as output
            const serviceCode = enabledServices.find(s => s.name.toLowerCase() === service.name)?.code;
            if (serviceCode) {
                stateTracker.markOutput(serviceCode);
            }
        }

        // Write metadata with bump reason
        writeVersionMetadata(newVersion, versionDir, bumpReason);

        // Write diff report
        const diffReport = generateDiffReport(diffs);
        const diffReportPath = path.join(versionDir, 'DIFF_REPORT.md');
        fs.writeFileSync(diffReportPath, diffReport);
        console.log(chalk.green(`[WRITE] ${diffReportPath}`));

        // Update latest pointer
        updateLatestPointer(newVersion);

        // Mark all services as versioned
        for (const service of services) {
            const serviceCode = enabledServices.find(s => s.name.toLowerCase() === service.name)?.code;
            if (serviceCode) {
                stateTracker.markVersioned(serviceCode);
            }
        }

        // Validate all services reached VERSIONED state
        stateTracker.validateAllVersioned();

        const summary = stateTracker.getSummary();
        console.log(chalk.bold.green(`\n✓ Pipeline completed successfully!`));
        console.log(chalk.green(`✓ ${summary.versioned}/${summary.total} services fully supported\n`));
        console.log(chalk.green(`Version: ${newVersion.next}`));
        console.log(chalk.green(`Output: output/aws/${newVersion.next}/`));
        console.log(chalk.green(`Services: ${services.length}`));

        process.exit(0);
    } catch (error) {
        console.error(chalk.bold.red('\n✗ Pipeline failed!\n'));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));

        if (error instanceof Error && error.stack) {
            console.error(chalk.gray(error.stack));
        }

        process.exit(1);
    }
}

main();
