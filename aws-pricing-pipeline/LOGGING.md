## Logging Enhancements

The pipeline now includes comprehensive logging with:

### Features

- **Progress Tracking**: Real-time progress bars for downloads and processing
- **Timers**: Execution time for each phase
- **File Size Tracking**: Monitor download and output sizes
- **Error Context**: Detailed error information showing exactly where failures occur
- **Summary Tables**: Statistics at each pipeline stage
- **Color-Coded Output**: Visual distinction between info, success, warnings, and errors

### Logger API

```typescript
import { Logger, Timer, PipelineError } from './utils/logger.js';

// Steps and substeps
Logger.step('Processing Services', 4, 1); // Step 1 of 4
Logger.substep('Loading data');

// Status messages
Logger.success('Operation completed');
Logger.info('Additional information');
Logger.warn('Warning message');
Logger.error('Error occurred', optionalError);

// Data display
Logger.data('Key', 'value');
Logger.table({ 'Key 1': 'Value 1', 'Key 2': 'Value 2' });

// Progress bars
Logger.progress(50, 100, 'Processing files');

// Timers
const timer = new Timer('Operation name');
// ... do work ...
timer.end(); // Logs duration

// Structured errors
throw new PipelineError(
  'Validation failed',
  'Validation Step',
  { service: 'ec2', errors: [...] },
  originalError
);
```

### Example Output

```
╔════════════════════════════════════════╗
║  AWS Pricing Pipeline                  ║
║  Deterministic • Auditable • Versioned ║
╚════════════════════════════════════════╝

Start time        : 2025-12-26T16:05:01Z
Node version      : v20.10.0
Working directory : /path/to/aws-pricing-pipeline

────────────────────────────────────────────────────────────
STEP 1/6: Fetch AWS Pricing Data
────────────────────────────────────────────────────────────

▶ Fetching AWS Pricing Data
  Total services : 50
  Concurrency    : 5

  → Batch 1/10 (AmazonEC2, AmazonS3, AWSLambda, AmazonVPC, AmazonRDS)
      Downloading AmazonEC2: 45% (123.4 MB)
  ✓ AmazonEC2: 274.2 MB in 12.3s
  ✓ AmazonS3: 89.1 MB in 8.7s
  
  Total Services : 50
  Successful     : 50
  Failed         : 0
  Total Size     : 4.2 GB
  Avg Duration   : 8.7s
  
  ℹ Fetch phase completed in 87.3s
  ✓ All 50 services downloaded successfully

────────────────────────────────────────────────────────────
STEP 2/6: Process Services
────────────────────────────────────────────────────────────

  Target region : us-east-1

▶ Processing EC2 [1/4]
  → Processing EC2 pricing for us-east-1
  ℹ Loading raw data from raw/AmazonEC2.json
  File size      : 274.2 MB
  Total products : 125847
  
  Instance types     : 487
  EBS volume types   : 7
  Region            : us-east-1
  
  ℹ EC2 processing completed in 3.45s
  ✓ EC2 processing complete
```

### Error Output

When the pipeline fails:

```
────────────────────────────────────────────────────────────
Pipeline Failed
────────────────────────────────────────────────────────────

Pipeline Error
Step: Validation
Message: EC2 failed schema validation

Context:
  service: "ec2"
  errorCount: 2
  errors: [
    {
      "path": "components.instances.t3.micro.rate",
      "message": "Expected number, received string"
    }
  ]

Original Error:
  ZodError: [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["components", "instances", "t3.micro", "rate"],
      "message": "Expected number, received string"
    }
  ]

  Failed at step : Validation
  Timestamp      : 2025-12-26T16:08:23Z

✗ Pipeline aborted
```

This makes it easy to:
1. **Monitor progress** during long-running operations
2. **Debug failures** with precise error context
3. **Audit execution** with detailed logs
4. **Optimize performance** with timing data
