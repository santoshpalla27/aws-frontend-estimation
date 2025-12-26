/**
 * Example usage of the cost engine
 * Demonstrates how to create an architecture and calculate costs
 */

import { ArchitectureGraph } from "./engine/architecture/graph.ts";
import { CostCalculator } from "./engine/calculator/engine.ts";
import { DEFAULT_CONTEXT, CostLineItem } from "./core/types.ts";
import { EC2Plugin } from "./services/aws/ec2/plugin.ts";
import { VPCPlugin } from "./services/aws/vpc/plugin.ts";
import { pricingLoader } from "./engine/pricing/loader.ts";

/**
 * Example: Private subnet with NAT Gateway and EC2 instance
 */
export async function examplePrivateSubnetArchitecture() {
    // Create architecture graph
    const graph = new ArchitectureGraph();

    // Create plugins
    const ec2Plugin = new EC2Plugin();
    const vpcPlugin = new VPCPlugin();

    // Create VPC with NAT Gateway
    const vpcNodes = vpcPlugin.createNodes({
        cidr: "10.0.0.0/16",
        name: "main-vpc",
        natGateways: 1,
        hasInternetGateway: true,
        dataTransferGB: 100, // 100 GB/month
    });

    // Add VPC nodes to graph
    for (const node of vpcNodes) {
        graph.addNode(node);
    }

    // Create EC2 instances
    const ec2Nodes = ec2Plugin.createNodes({
        instanceType: "t3.micro",
        instanceCount: 2,
        name: "web-servers",
    });

    // Add EC2 nodes to graph
    for (const node of ec2Nodes) {
        graph.addNode(node);
    }

    // Create cost calculator
    const calculator = new CostCalculator(
        [ec2Plugin, vpcPlugin],
        DEFAULT_CONTEXT
    );

    // Calculate costs
    const breakdown = await calculator.getBreakdown(graph);

    // Display results
    console.log("=".repeat(60));
    console.log("AWS Cost Estimation - Private Subnet Architecture");
    console.log("=".repeat(60));
    console.log();

    // Group by service
    for (const [service, items] of breakdown.byService.entries()) {
        const serviceTotal = items.reduce((sum: number, item: CostLineItem) => sum + item.cost, 0);
        console.log(`${service.toUpperCase()}: $${serviceTotal.toFixed(2)}/month`);

        for (const item of items) {
            console.log(
                `  ${item.component}: ${item.quantity} ${item.unit} × $${item.rate.toFixed(4)} = $${item.cost.toFixed(2)}`
            );
            console.log(`    Triggered by: ${item.triggeredBy.join(", ")}`);
        }
        console.log();
    }

    console.log("=".repeat(60));
    console.log(`TOTAL: $${breakdown.total.toFixed(2)}/month`);
    console.log("=".repeat(60));

    return breakdown;
}

// Export for use in other modules
export { ArchitectureGraph, CostCalculator, EC2Plugin, VPCPlugin };

