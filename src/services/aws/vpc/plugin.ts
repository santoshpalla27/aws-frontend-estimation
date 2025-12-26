/**
 * VPC Service Plugin
 * Handles VPC, NAT Gateway, and Internet Gateway costs
 */

import { ArchitectureNode, GlobalContext, CostLineItem } from "../../core/types.ts";
import { PricingPrimitives } from "../../core/primitives.ts";
import { ArchitectureGraph } from "../../engine/architecture/graph.ts";
import { BaseServicePlugin } from "../plugin.ts";
import { pricingLoader } from "../../engine/pricing/loader.ts";

export interface VPCConfig {
    cidr: string;
    name?: string;
    natGateways?: number;
    hasInternetGateway?: boolean;
    dataTransferGB?: number; // Monthly data transfer through IGW
}

export interface VPCPricingData {
    service: "vpc";
    region: string;
    currency: string;
    version: string;
    lastUpdated: string;
    components: {
        nat_gateway: {
            hourly: number;
            data_processing_per_gb: number;
        };
        igw: {
            data_transfer: {
                tiers: Array<{
                    upTo: number | "Infinity";
                    rate: number;
                    unit: "gb";
                }>;
            };
        };
    };
}

export class VPCPlugin extends BaseServicePlugin {
    service = "vpc";

    createNodes(config: VPCConfig): ArchitectureNode[] {
        this.validateConfig(config);

        const nodes: ArchitectureNode[] = [];
        const vpcId = config.name || "vpc-main";

        // VPC node
        nodes.push({
            id: vpcId,
            type: "vpc",
            service: "vpc",
            config,
            dependencies: [],
            conflicts: ["vpc"], // Only one VPC allowed
        });

        // NAT Gateway nodes
        const natCount = config.natGateways || 0;
        for (let i = 0; i < natCount; i++) {
            nodes.push({
                id: `${vpcId}-nat-${i}`,
                type: "nat_gateway",
                service: "vpc",
                config: {
                    vpcId,
                    dataProcessingGB: config.dataTransferGB || 0,
                },
                dependencies: [vpcId],
                conflicts: [],
            });
        }

        // Internet Gateway node
        if (config.hasInternetGateway) {
            nodes.push({
                id: `${vpcId}-igw`,
                type: "internet_gateway",
                service: "vpc",
                config: {
                    vpcId,
                    dataTransferGB: config.dataTransferGB || 0,
                },
                dependencies: [vpcId],
                conflicts: [],
            });
        }

        return nodes;
    }

    validateConfig(config: VPCConfig): void {
        this.validateRequired(config, ["cidr"]);

        // Validate CIDR format (basic check)
        if (!config.cidr.match(/^\d+\.\d+\.\d+\.\d+\/\d+$/)) {
            throw new Error(`Invalid CIDR format: ${config.cidr}`);
        }

        if (config.natGateways !== undefined && config.natGateways < 0) {
            throw new Error("natGateways must be >= 0");
        }

        if (config.dataTransferGB !== undefined && config.dataTransferGB < 0) {
            throw new Error("dataTransferGB must be >= 0");
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
            "vpc",
            context.region,
            context.pricingVersion
        )) as VPCPricingData;

        for (const node of nodes) {
            if (node.type === "vpc") {
                // VPC itself has no cost
                continue;
            }

            if (node.type === "nat_gateway") {
                // NAT Gateway hourly cost
                const hourlyRate = pricingData.components.nat_gateway.hourly;
                const hourlyCost = PricingPrimitives.hourly(1, hourlyRate, context);

                costs.push(
                    this.createCostItem(
                        "NAT Gateway",
                        "NAT Gateway hourly charge",
                        1,
                        "hour",
                        hourlyRate,
                        hourlyCost,
                        [node.id]
                    )
                );

                // NAT Gateway data processing
                const dataGB = node.config.dataProcessingGB || 0;
                if (dataGB > 0) {
                    const dataRate = pricingData.components.nat_gateway.data_processing_per_gb;
                    const dataCost = PricingPrimitives.perGB(dataGB, dataRate);

                    costs.push(
                        this.createCostItem(
                            "NAT Gateway Data Processing",
                            "NAT Gateway data processing",
                            dataGB,
                            "gb",
                            dataRate,
                            dataCost,
                            [node.id]
                        )
                    );
                }
            }

            if (node.type === "internet_gateway") {
                // Internet Gateway data transfer (tiered)
                const dataGB = node.config.dataTransferGB || 0;
                if (dataGB > 0) {
                    const tiers = pricingData.components.igw.data_transfer.tiers;
                    const cost = PricingPrimitives.tiered(dataGB, tiers);

                    // Calculate average rate for display
                    const avgRate = cost / dataGB;

                    costs.push(
                        this.createCostItem(
                            "Internet Gateway Data Transfer",
                            "Internet Gateway data transfer (tiered)",
                            dataGB,
                            "gb",
                            avgRate,
                            cost,
                            [node.id]
                        )
                    );
                }
            }
        }

        return costs;
    }
}

