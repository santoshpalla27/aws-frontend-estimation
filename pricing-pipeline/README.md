# AWS Pricing Pipeline

Production-grade AWS pricing data ingestion and normalization pipeline.

## Overview

This pipeline downloads raw AWS pricing data from public APIs, normalizes it into a strict, calculator-ready format, and outputs versioned JSON files for use in the frontend cost engine.

## Architecture

```
AWS Pricing APIs → Fetch → Normalize → Validate → Version → Output
```

### Key Principles

- **No runtime AWS API calls** - AWS APIs used only at build/update time
- **Deterministic calculations** - Same architecture = same cost, always
- **Explicit tiers** - All pricing tiers are explicit numeric ranges
- **Versioned pricing** - Reproducible results across time
- **Auditable** - Every transformation is traceable

## Directory Structure

```
pricing-pipeline/
├── raw/                    # Downloaded AWS pricing (gitignored)
├── fetch/                  # AWS pricing fetchers
│   └── ec2.ts
├── normalize/              # Normalization logic
│   ├── filters.ts          # SKU filtering
│   ├── units.ts            # Unit normalization
│   ├── tiers.ts            # Tier extraction
│   └── common.ts           # Shared utilities
├── services/               # Service-specific processors
│   └── ec2.ts
├── validate/               # Validation layer
│   ├── schema.ts
│   └── assertions.ts
├── output/                 # Generated pricing files
│   └── aws/
│       └── v1/
│           └── services/
│               └── ec2.json
├── package.json
├── tsconfig.json
└── run.ts                  # Main pipeline runner
```

## Usage

### Install Dependencies

```bash
cd pricing-pipeline
npm install
```

### Update Pricing

```bash
npm run update-pricing
```

This will:
1. Download raw EC2 pricing from AWS (~150MB)
2. Filter SKUs (on-demand, Linux, shared tenancy only)
3. Normalize units and extract tiers
4. Validate schema and values
5. Save to `output/aws/v1/services/ec2.json`

### View Pricing Diff

```bash
npm run pricing-diff
```

## Output Format

### EC2 Pricing

```json
{
  "service": "ec2",
  "region": "us-east-1",
  "currency": "USD",
  "version": "v1",
  "lastUpdated": "2025-12-26T10:00:00Z",
  "instances": {
    "t3.micro": {
      "vcpu": 2,
      "memory_gb": 1,
      "pricing": {
        "type": "hourly",
        "rate": 0.0104
      }
    }
  }
}
```

## Normalization Rules

### SKU Filtering

Only includes:
- **On-Demand** pricing (no reserved, no spot)
- **Linux** operating system
- **Shared** tenancy
- **No pre-installed software**
- **No special licensing**

### Unit Normalization

AWS units are mapped to primitives:
- `Hrs` → `hour`
- `GB-Mo` → `gb`
- `Requests` → `request`
- `Transitions` → `transition`

### Tier Extraction

AWS implicit tiers are converted to explicit numeric ranges:

```typescript
[
  { upTo: 10240, rate: 0.09, unit: "gb" },
  { upTo: 51200, rate: 0.085, unit: "gb" },
  { upTo: "Infinity", rate: 0.05, unit: "gb" }
]
```

## Validation

The pipeline enforces:
- ✓ No AWS-specific field names (sku, offerTermCode, etc.)
- ✓ No text descriptions
- ✓ All rates are numbers
- ✓ All tiers are explicit
- ✓ No NaN, null, undefined values
- ✓ Valid JSON serialization

## Versioning

- **Major bump**: Schema changes (new fields, removed fields, type changes)
- **Minor bump**: Numeric value changes
- **Patch**: Metadata only (timestamps)

## Supported Services

- [x] EC2 (Compute instances)
- [ ] VPC (NAT Gateway, IGW, data transfer)
- [ ] S3 (Storage, requests, data transfer)
- [ ] RDS (Database instances)
- [ ] ALB (Application Load Balancer)
- [ ] Lambda + API Gateway

## License

MIT
