#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fetchAll } from './fetch/index.js';
import { processEC2 } from './services/ec2.js';
import { processS3 } from './services/s3.js';
import { processLambda } from './services/lambda.js';
import { processVPC } from './services/vpc.js';
import { validatePricingData } from './validate/validate.js';
import { EC2ServicePricing } from './schema/ec2.schema.js';
import { S3ServicePricing } from './schema/s3.schema.js';
import { LambdaServicePricing } from './schema/lambda.schema.js';
import { VPCServicePricing } from './schema/vpc.schema.js';
import { diffPricing, loadPreviousVersion, generateDiffReport, DiffResult } from './versioning/diff.js';
import { getCurrentVersion, bumpVersion, createVersionDirectory, updateLatestPointer, writeVersionMetadata } from './versioning/bump.js';

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
        // Step 1: Fetch raw pricing data
        console.log(chalk.bold.yellow('\n[STEP 1/6] Fetching AWS pricing data...\n'));
        await fetchAll();

        // Step 2: Process services
        console.log(chalk.bold.yellow('\n[STEP 2/6] Processing services...\n'));

        const region = 'us-east-1';

        const ec2Data = await processEC2(region);
        const s3Data = await processS3(region);
        const lambdaData = await processLambda(region);
        const vpcData = await processVPC(region);

        // Step 3: Validate
        console.log(chalk.bold.yellow('\n[STEP 3/6] Validating pricing data...\n'));

        validatePricingData(ec2Data, EC2ServicePricing, 'EC2');
        validatePricingData(s3Data, S3ServicePricing, 'S3');
        validatePricingData(lambdaData, LambdaServicePricing, 'Lambda');
        validatePricingData(vpcData, VPCServicePricing, 'VPC');

        // Step 4: Diff against previous version
        console.log(chalk.bold.yellow('\n[STEP 4/6] Computing diffs...\n'));

        const diffs: DiffResult[] = [];

        const services = [
            { name: 'ec2', data: ec2Data },
            { name: 's3', data: s3Data },
            { name: 'lambda', data: lambdaData },
            { name: 'vpc', data: vpcData },
        ];

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
        let maxBumpType: 'major' | 'minor' | 'patch' = 'patch';

        if (diffs.length > 0) {
            const priority: Record<'major' | 'minor' | 'patch', number> = { major: 3, minor: 2, patch: 1 };

            for (const diff of diffs) {
                if (priority[diff.bumpType] > priority[maxBumpType]) {
                    maxBumpType = diff.bumpType;
                }
            }
        } else {
            // Default to minor for new services
            maxBumpType = 'minor';
        }

        const newVersion = bumpVersion(currentVersion, maxBumpType);

        // Step 6: Write output
        console.log(chalk.bold.yellow('\n[STEP 6/6] Writing versioned output...\n'));

        const versionDir = createVersionDirectory(newVersion);
        const servicesDir = path.join(versionDir, 'services');

        // Write service files
        for (const service of services) {
            const filePath = path.join(servicesDir, `${service.name}.json`);

            // Update version in data
            const dataWithVersion = {
                ...service.data,
                version: newVersion.next,
            };

            fs.writeFileSync(filePath, JSON.stringify(dataWithVersion, null, 2));
            console.log(chalk.green(`[WRITE] ${filePath}`));
        }

        // Write metadata
        writeVersionMetadata(newVersion, versionDir);

        // Write diff report
        const diffReport = generateDiffReport(diffs);
        const diffReportPath = path.join(versionDir, 'DIFF_REPORT.md');
        fs.writeFileSync(diffReportPath, diffReport);
        console.log(chalk.green(`[WRITE] ${diffReportPath}`));

        // Update latest pointer
        updateLatestPointer(newVersion);

        // Success!
        console.log(chalk.bold.green('\n✓ Pipeline completed successfully!\n'));
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
