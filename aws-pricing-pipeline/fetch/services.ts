/**
 * AWS Service Registry
 * Maps service codes to AWS Pricing API URLs
 * 
 * ALL 50+ services from requirements
 */

export interface ServiceDefinition {
    code: string;
    name: string;
    url: string;
    enabled: boolean;
}

const AWS_PRICING_BASE = 'https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws';

export const SERVICES: ServiceDefinition[] = [
    // Compute
    {
        code: 'AmazonEC2',
        name: 'EC2',
        url: `${AWS_PRICING_BASE}/AmazonEC2/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSLambda',
        name: 'Lambda',
        url: `${AWS_PRICING_BASE}/AWSLambda/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonECS',
        name: 'ECS',
        url: `${AWS_PRICING_BASE}/AmazonECS/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonEKS',
        name: 'EKS',
        url: `${AWS_PRICING_BASE}/AmazonEKS/current/index.json`,
        enabled: true,
    },

    // Storage
    {
        code: 'AmazonS3',
        name: 'S3',
        url: `${AWS_PRICING_BASE}/AmazonS3/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonEFS',
        name: 'EFS',
        url: `${AWS_PRICING_BASE}/AmazonEFS/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonFSx',
        name: 'FSx',
        url: `${AWS_PRICING_BASE}/AmazonFSx/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonS3GlacierDeepArchive',
        name: 'S3 Glacier Deep Archive',
        url: `${AWS_PRICING_BASE}/AmazonS3GlacierDeepArchive/current/index.json`,
        enabled: true,
    },

    // Database
    {
        code: 'AmazonRDS',
        name: 'RDS',
        url: `${AWS_PRICING_BASE}/AmazonRDS/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonDynamoDB',
        name: 'DynamoDB',
        url: `${AWS_PRICING_BASE}/AmazonDynamoDB/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonElastiCache',
        name: 'ElastiCache',
        url: `${AWS_PRICING_BASE}/AmazonElastiCache/current/index.json`,
        enabled: true,
    },

    // Networking
    {
        code: 'AmazonVPC',
        name: 'VPC',
        url: `${AWS_PRICING_BASE}/AmazonVPC/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonCloudFront',
        name: 'CloudFront',
        url: `${AWS_PRICING_BASE}/AmazonCloudFront/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonRoute53',
        name: 'Route53',
        url: `${AWS_PRICING_BASE}/AmazonRoute53/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSELB',
        name: 'Elastic Load Balancing',
        url: `${AWS_PRICING_BASE}/AWSELB/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSGlobalAccelerator',
        name: 'Global Accelerator',
        url: `${AWS_PRICING_BASE}/AWSGlobalAccelerator/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSDataTransfer',
        name: 'Data Transfer',
        url: `${AWS_PRICING_BASE}/AWSDataTransfer/current/index.json`,
        enabled: true,
    },

    // Containers & Registry
    {
        code: 'AmazonECR',
        name: 'ECR',
        url: `${AWS_PRICING_BASE}/AmazonECR/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonECRPublic',
        name: 'ECR Public',
        url: `${AWS_PRICING_BASE}/AmazonECRPublic/current/index.json`,
        enabled: true,
    },

    // Messaging & Queues
    {
        code: 'AmazonSNS',
        name: 'SNS',
        url: `${AWS_PRICING_BASE}/AmazonSNS/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSQueueService',
        name: 'SQS',
        url: `${AWS_PRICING_BASE}/AWSQueueService/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonMQ',
        name: 'Amazon MQ',
        url: `${AWS_PRICING_BASE}/AmazonMQ/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonMSK',
        name: 'MSK (Kafka)',
        url: `${AWS_PRICING_BASE}/AmazonMSK/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonKinesis',
        name: 'Kinesis',
        url: `${AWS_PRICING_BASE}/AmazonKinesis/current/index.json`,
        enabled: true,
    },

    // Monitoring & Observability
    {
        code: 'AmazonCloudWatch',
        name: 'CloudWatch',
        url: `${AWS_PRICING_BASE}/AmazonCloudWatch/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSCloudTrail',
        name: 'CloudTrail',
        url: `${AWS_PRICING_BASE}/AWSCloudTrail/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSXRay',
        name: 'X-Ray',
        url: `${AWS_PRICING_BASE}/AWSXRay/current/index.json`,
        enabled: true,
    },

    // Security & Identity
    {
        code: 'awskms',
        name: 'KMS',
        url: `${AWS_PRICING_BASE}/awskms/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSSecretsManager',
        name: 'Secrets Manager',
        url: `${AWS_PRICING_BASE}/AWSSecretsManager/current/index.json`,
        enabled: true,
    },
    {
        code: 'ACM',
        name: 'Certificate Manager',
        url: `${AWS_PRICING_BASE}/ACM/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSShield',
        name: 'Shield',
        url: `${AWS_PRICING_BASE}/AWSShield/current/index.json`,
        enabled: true,
    },
    {
        code: 'awswaf',
        name: 'WAF',
        url: `${AWS_PRICING_BASE}/awswaf/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSFMS',
        name: 'Firewall Manager',
        url: `${AWS_PRICING_BASE}/AWSFMS/current/index.json`,
        enabled: true,
    },

    // Developer Tools
    {
        code: 'CodeBuild',
        name: 'CodeBuild',
        url: `${AWS_PRICING_BASE}/CodeBuild/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSCodeCommit',
        name: 'CodeCommit',
        url: `${AWS_PRICING_BASE}/AWSCodeCommit/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSCodeDeploy',
        name: 'CodeDeploy',
        url: `${AWS_PRICING_BASE}/AWSCodeDeploy/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSCodePipeline',
        name: 'CodePipeline',
        url: `${AWS_PRICING_BASE}/AWSCodePipeline/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSCodeArtifact',
        name: 'CodeArtifact',
        url: `${AWS_PRICING_BASE}/AWSCodeArtifact/current/index.json`,
        enabled: true,
    },

    // Management & Governance
    {
        code: 'AWSConfig',
        name: 'Config',
        url: `${AWS_PRICING_BASE}/AWSConfig/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSSystemsManager',
        name: 'Systems Manager',
        url: `${AWS_PRICING_BASE}/AWSSystemsManager/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSCloudFormation',
        name: 'CloudFormation',
        url: `${AWS_PRICING_BASE}/AWSCloudFormation/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSServiceCatalog',
        name: 'Service Catalog',
        url: `${AWS_PRICING_BASE}/AWSServiceCatalog/current/index.json`,
        enabled: true,
    },

    // Application Integration
    {
        code: 'AmazonApiGateway',
        name: 'API Gateway',
        url: `${AWS_PRICING_BASE}/AmazonApiGateway/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonStates',
        name: 'Step Functions',
        url: `${AWS_PRICING_BASE}/AmazonStates/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSEvents',
        name: 'EventBridge',
        url: `${AWS_PRICING_BASE}/AWSEvents/current/index.json`,
        enabled: true,
    },

    // Analytics
    {
        code: 'AmazonOpenSearchService',
        name: 'OpenSearch',
        url: `${AWS_PRICING_BASE}/AmazonOpenSearchService/current/index.json`,
        enabled: true,
    },

    // Backup & Disaster Recovery
    {
        code: 'AWSBackup',
        name: 'Backup',
        url: `${AWS_PRICING_BASE}/AWSBackup/current/index.json`,
        enabled: true,
    },
    {
        code: 'AWSElasticDisasterRecovery',
        name: 'Elastic Disaster Recovery',
        url: `${AWS_PRICING_BASE}/AWSElasticDisasterRecovery/current/index.json`,
        enabled: true,
    },

    // Customer Engagement
    {
        code: 'AmazonSES',
        name: 'SES',
        url: `${AWS_PRICING_BASE}/AmazonSES/current/index.json`,
        enabled: true,
    },
    {
        code: 'AmazonPinpoint',
        name: 'Pinpoint',
        url: `${AWS_PRICING_BASE}/AmazonPinpoint/current/index.json`,
        enabled: true,
    },
];

/**
 * Get all enabled services
 */
export function getEnabledServices(): ServiceDefinition[] {
    return SERVICES.filter(s => s.enabled);
}

/**
 * Get service by code
 */
export function getServiceByCode(code: string): ServiceDefinition | undefined {
    return SERVICES.find(s => s.code === code);
}
