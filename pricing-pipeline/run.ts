/**
 * Main Pipeline Runner
 * Orchestrates the entire pricing pipeline
 */

import { fetchEC2Pricing } from "./fetch/ec2.js";
import { processEC2Pricing } from "./services/ec2.js";
import { validateEC2Pricing } from "./validate/schema.js";
import * as fs from "fs";
import * as path from "path";

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
}

async function main() {
    console.log("╔════════════════════════════════════════╗");
    console.log("║   AWS Pricing Pipeline - EC2 v1.0      ║");
    console.log("╚════════════════════════════════════════╝\n");

    const pipelineStart = Date.now();

    try {
        // Step 1: Fetch raw pricing data
        console.log("📥 Step 1: Fetching raw pricing data");
        console.log("─".repeat(50));
        const fetchStart = Date.now();
        await fetchEC2Pricing();
        const fetchDuration = Date.now() - fetchStart;
        console.log(`⏱️  Fetch completed in ${formatDuration(fetchDuration)}\n`);

        // Step 2: Process and normalize
        console.log("⚙️  Step 2: Processing and normalizing");
        console.log("─".repeat(50));
        const processStart = Date.now();
        processEC2Pricing("us-east-1");
        const processDuration = Date.now() - processStart;
        console.log(`⏱️  Processing completed in ${formatDuration(processDuration)}\n`);

        // Step 3: Validate output
        console.log("✅ Step 3: Validating output");
        console.log("─".repeat(50));
        const validateStart = Date.now();
        const outputPath = path.join(
            process.cwd(),
            "output",
            "aws",
            "v1",
            "services",
            "ec2.json"
        );
        const output = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
        validateEC2Pricing(output);
        const validateDuration = Date.now() - validateStart;
        console.log(`⏱️  Validation completed in ${formatDuration(validateDuration)}\n`);

        // Summary
        const totalDuration = Date.now() - pipelineStart;
        console.log("═".repeat(50));
        console.log("🎉 Pipeline completed successfully!");
        console.log(`⏱️  Total time: ${formatDuration(totalDuration)}`);
        console.log("═".repeat(50));
        console.log(`\n📄 Output: ${outputPath}`);
        console.log("\n📋 Next steps:");
        console.log("  1. Review the output file");
        console.log("  2. Compare against AWS calculator");
        console.log("  3. Commit to version control");

    } catch (error) {
        console.error("\n❌ Pipeline failed:");
        console.error(error);
        process.exit(1);
    }
}

main();
