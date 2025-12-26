/**
 * SKU filtering for AWS pricing
 * Only include on-demand, Linux, shared tenancy instances
 */

/**
 * Filter EC2 SKUs to only include relevant configurations
 */
export function isValidEC2SKU(attributes: any): boolean {
    // Must be on-demand (filter out reserved, spot)
    // Must be Linux
    // Must be shared tenancy
    // Must not have pre-installed software
    // Must not require special licensing

    return (
        attributes.operatingSystem === "Linux" &&
        attributes.tenancy === "Shared" &&
        attributes.preInstalledSw === "NA" &&
        attributes.licenseModel === "No License required" &&
        attributes.capacitystatus === "Used" // Actual capacity, not AllocatedHost
    );
}

/**
 * Filter VPC SKUs
 */
export function isValidVPCSKU(attributes: any): boolean {
    // Include NAT Gateway, VPC endpoints, etc.
    // Exclude reserved capacity

    const validGroups = [
        "VpcEndpoint",
        "NatGateway",
        "VPN Connection",
        "PrivateLink",
    ];

    return (
        attributes.group &&
        validGroups.some(group => attributes.group.includes(group))
    );
}

/**
 * Filter S3 SKUs
 */
export function isValidS3SKU(attributes: any): boolean {
    // Include standard storage classes
    // Exclude Glacier, Intelligent-Tiering for now

    const validStorageClasses = [
        "General Purpose",
        "Infrequent Access",
    ];

    return (
        attributes.storageClass &&
        validStorageClasses.some(sc => attributes.storageClass.includes(sc))
    );
}

/**
 * Check if region is supported
 */
export function isSupportedRegion(location: string): boolean {
    const supportedRegions = [
        "US East (N. Virginia)",
        "US East (Ohio)",
        "US West (N. California)",
        "US West (Oregon)",
        "Europe (Ireland)",
        "Europe (London)",
        "Europe (Frankfurt)",
        "Asia Pacific (Tokyo)",
        "Asia Pacific (Singapore)",
        "Asia Pacific (Sydney)",
    ];

    return supportedRegions.includes(location);
}
