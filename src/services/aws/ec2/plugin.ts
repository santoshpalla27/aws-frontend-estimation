/**
 * EC2 Service Plugin
 * Handles EC2 instance cost calculations
 */

import { ArchitectureNode, GlobalContext, CostLineItem } from "../../core/types.ts";
import { PricingPrimitives } from "../../core/primitives.ts";
import { ArchitectureGraph } from "../../engine/architecture/graph.ts";
import { BaseServicePlugin } from "../plugin.ts";
import { pricingLoader } from "../../engine/pricing/loader.ts";

export interface EC2Config {
    instanceType: string;
    instanceCount?: number;
    name?: string;
}

export interface EC2InstancePricing {
    vcpu: number;
    memory_gb: number;
    pricing: {
        type: "hourly";
        rate: number;
    };
}

export interface EC2PricingData {
    service: "ec2";
    region: string;
    currency: string;
    version: string;
    lastUpdated: string;
    instances: Record<string, EC2InstancePricing>;
}

export class EC2Plugin extends BaseServicePlugin {
    service = "ec2";

    createNodes(config: EC2Config): ArchitectureNode[] {
        this.validateConfig(config);

        const nodeId = config.name || `ec2-${config.instanceType}`;

        return [
            {
                id: nodeId,
                type: "ec2_instance",
                service: "ec2",
                config,
                dependencies: [], // EC2 instances don't have hard dependencies
                conflicts: [],
            },
        ];
    }

    validateConfig(config: EC2Config): void {
        this.validateRequired(config, ["instanceType"]);

        if (config.instanceCount !== undefined) {
            if (config.instanceCount < 1) {
                throw new Error("instanceCount must be at least 1");
            }
        }
    }

    async calculateCost(
        nodes: ArchitectureNode[],
        context: GlobalContext,
        graph: ArchitectureGraph
    ): Promise<CostLineItem[]> {
        const costs: CostLineItem[] = [];

        // Load pricing data
        const pricingData = (await pricingLoader.load(
            "ec2",
            context.region,
            context.pricingVersion
        )) as EC2PricingData;

        for (const node of nodes) {
            const config = node.config as EC2Config;
            const instanceType = config.instanceType;
            const quantity = config.instanceCount || 1;

            // Get pricing for instance type
            const instancePricing = pricingData.instances[instanceType];

            if (!instancePricing) {
                throw new Error(
                    `No pricing found for instance type: ${instanceType} in region ${context.region}`
                );
            }

            const rate = instancePricing.pricing.rate;
            const cost = PricingPrimitives.hourly(quantity, rate, context);

            costs.push(
                this.createCostItem(
                    instanceType,
                    `EC2 ${instanceType} instance`,
                    quantity,
                    "hour",
                    rate,
                    cost,
                    [node.id]
                )
            );
        }

        return costs;
    }
}

