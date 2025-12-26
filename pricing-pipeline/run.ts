/**
 * Main pipeline runner
 * Orchestrates the entire pricing update process
 */

import { fetchEC2Pricing } from "./fetch/ec2.js";
import { fetchVPCPricing } from "./fetch/vpc.js";
import { processEC2Pricing, saveEC2Pricing } from "./services/ec2.js";
import { processVPCPricing, saveVPCPricing } from "./services/vpc.js";
import { validatePricingSchema, validatePricingValues } from "./validate/schema.js";
import { runAllAssertions } from "./validate/assertions.js";

async function processService(
    serviceName: string,
    fetchFn: () => Promise<void>,
    processFn: (region: string) => any,
    saveFn: (pricing: any) => string
) {
    console.log("=".repeat(60));
    console.log(`AWS Pricing Pipeline - ${serviceName.toUpperCase()}`);
    console.log("=".repeat(60));
    console.log();

    try {
        // Step 1: Fetch raw pricing
        console.log(`Step 1: Fetching raw ${serviceName} pricing...`);
        await fetchFn();
        console.log();

        // Step 2: Process and normalize
        console.log(`Step 2: Processing ${serviceName} pricing...`);
        const pricing = processFn("us-east-1");
        console.log();

        // Step 3: Validate schema
        console.log("Step 3: Validating pricing schema...");
        validatePricingSchema(pricing);
        console.log("  ✓ Schema validation passed");
        console.log();

        // Step 4: Validate values
        console.log("Step 4: Validating pricing values...");
        validatePricingValues(pricing);
        console.log("  ✓ Value validation passed");
        console.log();

        // Step 5: Run assertions
        console.log("Step 5: Running assertions...");
        runAllAssertions(pricing);
        console.log();

        // Step 6: Save output
        console.log("Step 6: Saving pricing data...");
        const outputFile = saveFn(pricing);
        console.log();

        // Summary
        console.log("=".repeat(60));
        console.log(`✓ ${serviceName.toUpperCase()} pipeline completed successfully`);
        console.log(`  Output: ${outputFile}`);
        console.log("=".repeat(60));
        console.log();

        return pricing;
    } catch (error) {
        console.error();
        console.error("=".repeat(60));
        console.error(`✗ ${serviceName.toUpperCase()} pipeline failed`);
        console.error("=".repeat(60));

        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error(error);
        }

        throw error;
    }
}

async function main() {
    console.log("\n");
    console.log("╔" + "═".repeat(58) + "╗");
    console.log("║" + " ".repeat(10) + "AWS PRICING PIPELINE" + " ".repeat(28) + "║");
    console.log("╚" + "═".repeat(58) + "╝");
    console.log("\n");

    try {
        // Process EC2
        const ec2Pricing = await processService(
            "EC2",
            fetchEC2Pricing,
            processEC2Pricing,
            saveEC2Pricing
        );

        // Process VPC
        const vpcPricing = await processService(
            "VPC",
            fetchVPCPricing,
            processVPCPricing,
            saveVPCPricing
        );

        // Final summary
        console.log("\n");
        console.log("╔" + "═".repeat(58) + "╗");
        console.log("║" + " ".repeat(15) + "PIPELINE COMPLETE" + " ".repeat(26) + "║");
        console.log("╠" + "═".repeat(58) + "╣");
        console.log(`║  EC2 Instances: ${Object.keys(ec2Pricing.instances).length.toString().padEnd(43)} ║`);
        console.log(`║  VPC Components: NAT Gateway, IGW${" ".repeat(24)} ║`);
        console.log("╚" + "═".repeat(58) + "╝");
        console.log("\n");

    } catch (error) {
        process.exit(1);
    }
}

main();
