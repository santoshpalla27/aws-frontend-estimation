# AWS Pricing Pipeline

**Deterministic • Auditable • Versioned • Frontend-Agnostic**

A production-grade pricing infrastructure that downloads, normalizes, and versions AWS pricing data for 50+ services.

## Philosophy

This is **NOT** a calculator. This is **pricing infrastructure**.

### Core Principles

1. **Deterministic**: Same input → Same output, forever
2. **Auditable**: Every price change is tracked and versioned
3. **Schema-Validated**: Zod schemas enforce correctness
4. **Frontend-Agnostic**: Pure JSON output, no UI assumptions
5. **Fail-Fast**: Silent failure is forbidden

### Design Constraints

- ✅ AWS pricing is **source material**, not output
- ✅ No runtime AWS dependencies
- ✅ Streaming JSON parsing (handles multi-GB files)
- ✅ Explicit units only (`hour`, `gb`, `request`, etc.)
- ✅ Explicit tiers only (no implicit ranges)
- ✅ **Crashes on any error** (no fallbacks, no defaults)

## Supported Services

Currently implemented (4 core services):
- ✅ **EC2** - Instances, EBS, Snapshots, Data Transfer, Elastic IP
- ✅ **S3** - Storage, Requests, Data Transfer, Retrieval
- ✅ **Lambda** - Compute (x86/ARM), Requests, Duration
- ✅ **VPC** - NAT Gateway, Endpoints, PrivateLink, Data Transfer

Full registry (50+ services defined):
- Compute: EC2, Lambda, ECS, EKS
- Storage: S3, EFS, FSx, Glacier
- Database: RDS, DynamoDB, ElastiCache
- Networking: VPC, CloudFront, Route53, ELB, Global Accelerator
- Containers: ECR, ECR Public
- Messaging: SNS, SQS, MQ, MSK, Kinesis
- Monitoring: CloudWatch, CloudTrail, X-Ray
- Security: KMS, Secrets Manager, ACM, Shield, WAF
- Developer Tools: CodeBuild, CodeCommit, CodeDeploy, CodePipeline, CodeArtifact
- Management: Config, Systems Manager, CloudFormation, Service Catalog
- Application Integration: API Gateway, Step Functions, EventBridge
- Analytics: OpenSearch
- Backup: Backup, Elastic Disaster Recovery
- Customer Engagement: SES, Pinpoint

## Installation

```bash
npm install
```

## Usage

### Update Pricing

Download latest AWS pricing and generate versioned output:

```bash
npm run update-pricing
```

This will:
1. Fetch raw pricing from AWS (saved to `raw/`)
2. Normalize pricing data
3. Validate against schemas
4. Diff against previous version
5. Determine version bump (major/minor/patch)
6. Write to `output/aws/vX.Y.Z/`
7. Update `output/aws/latest/`

### Pipeline Logging

The pipeline provides comprehensive logging with:

- **Progress bars** for downloads and batch processing
- **Timers** for each phase (fetch, process, validate, diff, write)
- **File size tracking** for downloads and outputs
- **Detailed error context** showing exactly where failures occur
- **Summary tables** with statistics at each stage
- **Color-coded output** (blue=info, green=success, yellow=warning, red=error)

Example output:
```
╔════════════════════════════════════════╗
║  AWS Pricing Pipeline                  ║
║  Deterministic • Auditable • Versioned ║
╚════════════════════════════════════════╝

▶ Fetching AWS Pricing Data
  → Batch 1/10 (AmazonEC2, AmazonS3, AWSLambda, AmazonVPC, AmazonRDS)
      Downloading AmazonEC2: 45% (123.4 MB)
  ✓ AmazonEC2: 274.2 MB in 12.3s
  
  Total Services : 50
  Successful     : 50
  Failed         : 0
  Total Size     : 4.2 GB
  Avg Duration   : 8.7s

▶ Processing EC2 [1/4]
  → Processing EC2 pricing for us-east-1
  ℹ Loading raw data from raw/AmazonEC2.json
  File size : 274.2 MB
  
  Instance types     : 487
  EBS volume types   : 7
  Region            : us-east-1
  
  ℹ EC2 processing completed in 3.45s
  ✓ EC2 processing complete
```

If the pipeline fails, you'll see:
```
Pipeline Error
Step: Validation
Message: EC2 failed schema validation

Context:
  service: "ec2"
  errorCount: 2
  errors: [
    { path: "components.instances.t3.micro.rate", message: "Expected number, received string" }
  ]

✗ Pipeline aborted
```

For complete logging API documentation, see [LOGGING.md](./LOGGING.md).

### Pipeline Output

```
output/aws/
├── v1.0.0/
│   ├── metadata.json
│   ├── DIFF_REPORT.md
│   └── services/
│       ├── ec2.json
│       ├── s3.json
│       ├── lambda.json
│       └── vpc.json
├── v1.1.0/
│   └── ...
└── latest/  (copy of latest version)
```

### Output Schema

Each service JSON follows this structure:

```json
{
  "service": "ec2",
  "region": "us-east-1",
  "currency": "USD",
  "version": "v1.0.0",
  "lastUpdated": "2025-12-26T16:05:01Z",
  "components": {
    "instances": {
      "t3.micro": { "rate": 0.0104, "unit": "hour" },
      "t3.small": { "rate": 0.0208, "unit": "hour" }
    },
    "ebs": {
      "gp3": { "rate": 0.08, "unit": "gb_month" }
    },
    "dataTransfer": {
      "in": { "rate": 0, "unit": "gb" },
      "out": [
        { "upTo": 10240, "rate": 0.09, "unit": "gb" },
        { "upTo": 51200, "rate": 0.085, "unit": "gb" },
        { "upTo": "Infinity", "rate": 0.07, "unit": "gb" }
      ]
    }
  }
}
```

### Canonical Units

All pricing is normalized to these units:

- `hour` - Per hour
- `gb` - Per gigabyte
- `gb_month` - Per GB-month (storage)
- `request` - Per request
- `million_requests` - Per million requests
- `transition` - Per transition/operation
- `flat` - One-time/flat fee
- `vcpu_hour` - Per vCPU-hour
- `ecpu_hour` - Per eCPU-hour
- `second` - Per second
- `minute` - Per minute

## Versioning

### Version Bump Rules

- **Major** (`v1.0.0` → `v2.0.0`): Schema changes
- **Minor** (`v1.0.0` → `v1.1.0`): Pricing changes
- **Patch** (`v1.0.0` → `v1.0.1`): Metadata only

### Diff Reports

Each version includes a `DIFF_REPORT.md` showing:
- What changed
- Old vs new values
- Version bump rationale

## Architecture

### Directory Structure

```
aws-pricing-pipeline/
├── fetch/              # AWS pricing downloaders
│   ├── services.ts     # Service registry (50+ services)
│   ├── fetcher.ts      # Streaming HTTP fetcher
│   └── index.ts        # Fetch orchestrator
├── normalize/          # Normalization logic
│   ├── units.ts        # Unit normalization
│   ├── tiers.ts        # Tier expansion
│   ├── filters.ts      # SKU filtering
│   └── common.ts       # Common utilities
├── services/           # Service processors
│   ├── ec2.ts
│   ├── s3.ts
│   ├── lambda.ts
│   └── vpc.ts
├── schema/             # Zod schemas
│   ├── base.ts         # Base schemas
│   ├── ec2.schema.ts
│   ├── s3.schema.ts
│   ├── lambda.schema.ts
│   └── vpc.schema.ts
├── validate/           # Validation layer
│   └── validate.ts     # Hard validation gate
├── versioning/         # Versioning system
│   ├── diff.ts         # Diff engine
│   └── bump.ts         # Version bump logic
├── run.ts              # Main pipeline orchestrator
└── package.json
```

### Execution Flow

```
1. Fetch → Download raw AWS pricing (streaming)
2. Process → Normalize per service
3. Validate → Schema + numeric + tier validation
4. Diff → Compare against previous version
5. Version → Determine bump type
6. Output → Write versioned artifacts
```

### Error Handling

**The pipeline CRASHES on any error:**

- ❌ Network failure during fetch
- ❌ Unknown AWS unit
- ❌ Invalid tier structure
- ❌ Schema validation failure
- ❌ NaN, null, undefined in pricing
- ❌ Negative pricing values

**No retries. No fallbacks. No warnings.**

## Extending to New Services

### 1. Add Service to Registry

Edit `fetch/services.ts`:

```typescript
{
  code: 'AmazonDynamoDB',
  name: 'DynamoDB',
  url: `${AWS_PRICING_BASE}/AmazonDynamoDB/current/index.json`,
  enabled: true,
}
```

### 2. Create Schema

Create `schema/dynamodb.schema.ts`:

```typescript
import { z } from 'zod';
import { BaseServicePricing, SimpleRate } from './base.js';

export const DynamoDBServicePricing = BaseServicePricing.extend({
  service: z.literal('dynamodb'),
  components: z.object({
    // Define pricing components
  }),
});
```

### 3. Create Processor

Create `services/dynamodb.ts`:

```typescript
export async function processDynamoDB(region: string): Promise<DynamoDBServicePricing> {
  // Load raw/AmazonDynamoDB.json
  // Apply filters
  // Normalize units
  // Expand tiers
  // Return validated output
}
```

### 4. Add to Pipeline

Edit `run.ts` to include new service in processing loop.

## Testing

```bash
# Type check
npm run typecheck

# Run tests (when implemented)
npm test

# Integration tests
npm run test:integration
```

## Determinism Guarantee

Given the same raw pricing files, the pipeline will **always** produce byte-for-byte identical output.

This enables:
- ✅ Reproducible builds
- ✅ Audit trails
- ✅ Regression testing
- ✅ Multi-environment consistency

## Frontend Integration

Use the versioned JSON directly:

```typescript
import ec2Pricing from './output/aws/latest/services/ec2.json';

const t3MicroHourlyRate = ec2Pricing.components.instances['t3.micro'].rate;
// 0.0104

const dataTransferTiers = ec2Pricing.components.dataTransfer.out;
// [{ upTo: 10240, rate: 0.09, unit: 'gb' }, ...]
```

## Non-Goals

This pipeline does **NOT**:

- ❌ Calculate costs
- ❌ Parse Terraform
- ❌ Provide UI
- ❌ Make runtime AWS API calls
- ❌ Store data in databases
- ❌ Provide REST APIs

**This pipeline only produces pricing truth.**

## License

MIT

## Contributing

When adding new services:

1. Follow existing patterns
2. Add comprehensive SKU filters
3. Validate all numeric values
4. Expand all implicit tiers
5. Add schema validation
6. Test determinism

**Correctness over convenience.**
