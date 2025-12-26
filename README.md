# AWS Cost Estimator

A production-grade, frontend-only AWS cost estimation engine powered by periodically regenerated, normalized pricing data.

## Overview

This system provides **deterministic**, **architecture-driven** cost calculations without runtime AWS API calls. Costs emerge from infrastructure topology, not forms.

### Core Principles

- ✅ **No runtime AWS API calls** - AWS APIs used only at build/update time
- ✅ **Deterministic calculations** - Same architecture = same cost, always
- ✅ **Architecture-driven** - Costs emerge from topology, not forms
- ✅ **Auditable** - Every cost line has provenance
- ✅ **Versioned pricing** - Reproducible results across time
- ✅ **Centralized temporal logic** - All time assumptions in GlobalContext

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ PRICING PIPELINE (Offline / Re-runnable)                │
│                                                         │
│ AWS Pricing APIs → Normalize → Validate → Version      │
│                                                         │
│ Output: pricing/aws/vX/services/*.json                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ FRONTEND COST ENGINE                                    │
│                                                         │
│ UI → Architecture Graph → Composer → Primitives → Cost │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
aws-frontend/
├── pricing-pipeline/          # Offline pricing data pipeline
│   ├── fetch/                 # AWS pricing fetchers
│   ├── normalize/             # Normalization logic
│   ├── services/              # Service processors
│   ├── validate/              # Validation layer
│   ├── versioning/            # Version management
│   ├── tools/                 # Pricing diff tool
│   ├── output/                # Generated pricing files
│   └── run.ts                 # Pipeline runner
│
├── src/                       # Frontend cost engine
│   ├── core/                  # Core types and primitives
│   │   ├── types.ts           # GlobalContext, CostLineItem, etc.
│   │   └── primitives.ts      # Pricing primitives
│   ├── engine/                # Calculation engine
│   │   ├── architecture/      # Architecture graph
│   │   ├── calculator/        # Cost calculator
│   │   └── pricing/           # Pricing loader
│   ├── services/              # Service plugins
│   │   ├── plugin.ts          # Plugin interface
│   │   └── aws/               # AWS services
│   │       ├── ec2/
│   │       └── vpc/
│   └── example.ts             # Usage examples
│
└── README.md
```

## Quick Start

### 1. Update Pricing Data

```bash
cd pricing-pipeline
npm install
npm run update-pricing
```

This downloads and normalizes AWS EC2 pricing (~150MB download).

### 2. Run Example

```bash
cd ..
npm install
npm run dev
```

## Usage Example

```typescript
import { ArchitectureGraph } from "./engine/architecture/graph";
import { CostCalculator } from "./engine/calculator/engine";
import { DEFAULT_CONTEXT } from "./core/types";
import { EC2Plugin } from "./services/aws/ec2/plugin";
import { VPCPlugin } from "./services/aws/vpc/plugin";

// Create architecture graph
const graph = new ArchitectureGraph();

// Create VPC with NAT Gateway
const vpcPlugin = new VPCPlugin();
const vpcNodes = vpcPlugin.createNodes({
  cidr: "10.0.0.0/16",
  natGateways: 1,
  hasInternetGateway: true,
  dataTransferGB: 100,
});

vpcNodes.forEach(node => graph.addNode(node));

// Create EC2 instances
const ec2Plugin = new EC2Plugin();
const ec2Nodes = ec2Plugin.createNodes({
  instanceType: "t3.micro",
  instanceCount: 2,
});

ec2Nodes.forEach(node => graph.addNode(node));

// Calculate costs
const calculator = new CostCalculator(
  [ec2Plugin, vpcPlugin],
  DEFAULT_CONTEXT
);

const breakdown = calculator.getBreakdown(graph);

console.log(`Total: $${breakdown.total.toFixed(2)}/month`);
```

## Key Features

### 1. Centralized Temporal Logic

All time assumptions are in `GlobalContext`:

```typescript
const context: GlobalContext = {
  cloud: "aws",
  region: "us-east-1",
  currency: "USD",
  pricingVersion: "v1",
  hoursPerMonth: 730, // Centralized!
};
```

### 2. Architecture Graph

Dependencies and conflicts are validated before mutation:

```typescript
const graph = new ArchitectureGraph();

// This will throw if dependencies don't exist
graph.addNode({
  id: "ec2-1",
  type: "ec2_instance",
  service: "ec2",
  config: { instanceType: "t3.micro" },
  dependencies: ["vpc-main"], // Must exist!
  conflicts: [],
});
```

### 3. Multi-Node Provenance

Every cost traces back to architecture nodes:

```typescript
{
  service: "vpc",
  component: "NAT Gateway",
  cost: 32.85,
  triggeredBy: ["vpc-main-nat-0"] // Full provenance
}
```

### 4. Pricing Primitives

All calculations use primitives:

```typescript
// Hourly (uses GlobalContext.hoursPerMonth)
PricingPrimitives.hourly(quantity, rate, context);

// Per GB
PricingPrimitives.perGB(gb, rate);

// Tiered
PricingPrimitives.tiered(quantity, tiers);
```

## Pricing Pipeline

### Normalization Rules

1. **SKU Filtering**: Only on-demand, Linux, shared tenancy
2. **Unit Normalization**: AWS units → primitives (hour, gb, request)
3. **Tier Extraction**: Implicit tiers → explicit numeric ranges
4. **Validation**: No AWS field names, all rates are numbers

### Versioning

- **Major bump**: Schema changes
- **Minor bump**: Numeric value changes
- **Patch**: Metadata only

### Pricing Diff

```bash
npm run pricing-diff v1 v2 ec2
```

## Supported Services

- [x] **EC2** - Compute instances
- [x] **VPC** - NAT Gateway, Internet Gateway, data transfer
- [ ] **S3** - Storage, requests, data transfer
- [ ] **RDS** - Database instances
- [ ] **ALB** - Application Load Balancer
- [ ] **Lambda + API Gateway**

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

## Design Decisions

### Why No Runtime AWS API Calls?

- **Deterministic**: Same architecture always produces same cost
- **Fast**: No network latency
- **Offline**: Works without internet
- **Versioned**: Reproducible across time

### Why Architecture Graph?

- **Prevents double-counting**: Shared resources (VPC, NAT) counted once
- **Validates dependencies**: Can't create EC2 without VPC
- **Enables composition**: Cross-service cost calculation
- **Provides provenance**: Know why each cost exists

### Why Centralized Temporal Logic?

- **Prevents drift**: No plugin-specific time assumptions
- **Auditable**: Single source of truth for hours/month
- **Consistent**: All hourly calculations use same value

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Roadmap

- [ ] Complete Phase C: First Real Architecture validation
- [ ] Add S3, RDS, ALB services
- [ ] Build UI for architecture builder
- [ ] Add cost breakdown visualization
- [ ] Implement multi-cloud support (Azure, GCP)
- [ ] Add CI/CD for pricing updates
