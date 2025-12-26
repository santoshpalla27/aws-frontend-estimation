# AWS Pricing Pipeline

Offline AWS pricing data pipeline - fetch, normalize, validate, version.

## Architecture

```
AWS Pricing APIs → Fetch → Normalize → Validate → Version
                     ↓         ↓          ↓          ↓
                   raw/    services/  validate/  output/
```

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
│   └── schema.ts
├── output/                 # Generated pricing files
│   └── aws/
│       └── v1/
│           └── services/
│               └── ec2.json
└── run.ts                  # Main pipeline runner
```

## Usage

### Install Dependencies

```bash
npm install
```

### Run Pipeline

```bash
npm run update-pricing
```

This will:
1. Fetch raw EC2 pricing from AWS public API (~200MB)
2. Filter for on-demand, Linux, shared tenancy only
3. Normalize units and extract pricing
4. Validate output schema
5. Write to `output/aws/v1/services/ec2.json`

### Output Format

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
      "network_performance": "Up to 5 Gigabit",
      "pricing": {
        "type": "hourly",
        "rate": 0.0104
      }
    }
  }
}
```

## Design Principles

### 1. No Runtime AWS Dependency
- AWS APIs used only at build/update time
- Frontend loads static JSON files
- Deterministic calculations

### 2. Strict Filtering
- **Included**: On-demand, Linux, shared tenancy
- **Excluded**: Spot, reserved, GovCloud, marketplace, Windows, dedicated

### 3. Fail Loudly
- Unmappable units → error
- Invalid SKUs → skip with count
- Missing data → error
- No silent assumptions

### 4. No AWS Field Names
- Output uses normalized field names only
- No `sku`, `offerTermCode`, `rateCode`, etc.
- Validation enforces this

### 5. Versioned Output
- Never mutate existing versions
- New pricing run → new version if values change
- Frontend displays pricing version

## Validation

The pipeline validates:
- ✓ Schema compliance (Zod)
- ✓ No NaN/null/undefined in pricing
- ✓ No negative rates
- ✓ No AWS field names in output
- ✓ All rates are numbers

## Next Steps

1. **VPC Pricing**: Add `fetch/vpc.ts` and `services/vpc.ts`
2. **S3 Pricing**: Add `fetch/s3.ts` and `services/s3.ts`
3. **Pricing Diff Tool**: Implement `tools/pricing-diff.ts`
4. **Multi-Region**: Support additional regions
5. **CI/CD**: Automate monthly pricing updates

## Troubleshooting

### Pipeline fails to fetch
- Check internet connection
- Verify AWS pricing API is accessible
- Check `raw/` directory permissions

### Validation fails
- Review `output/aws/v1/services/ec2.json`
- Check for NaN or null values
- Verify schema compliance

### No instances in output
- Check SKU filtering logic
- Verify region normalization
- Review raw data structure
