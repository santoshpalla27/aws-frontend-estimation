/**
 * SKU Filtering
 * Filters AWS pricing data to only include supported configurations
 */

/**
 * EC2 SKU Filter
 * Only on-demand, Linux, shared tenancy, no pre-installed software
 */
export function isValidEC2SKU(attrs: any): boolean {
    return (
        attrs.operatingSystem === "Linux" &&
        attrs.tenancy === "Shared" &&
        attrs.preInstalledSw === "NA" &&
        attrs.licenseModel === "No License required" &&
        attrs.capacitystatus === "Used" && // On-demand only
        !attrs.instanceType?.includes("metal") // Exclude bare metal for now
    );
}

/**
 * VPC SKU Filter
 * NAT Gateway, Internet Gateway, VPC Endpoints
 */
export function isValidVPCSKU(attrs: any): boolean {
    const validGroups = [
        "NAT Gateway",
        "VpcEndpoint",
        "InternetGateway",
        "VPN Connection"
    ];

    return validGroups.some(group =>
        attrs.group?.includes(group) || attrs.productFamily?.includes(group)
    );
}

/**
 * S3 SKU Filter
 * Standard storage, requests, data transfer
 */
export function isValidS3SKU(attrs: any): boolean {
    // Exclude Glacier, Intelligent Tiering for initial implementation
    const excludedStorageClasses = [
        "Glacier",
        "Deep Archive",
        "Intelligent-Tiering"
    ];

    const storageClass = attrs.storageClass || "";
    const isExcluded = excludedStorageClasses.some(excluded =>
        storageClass.includes(excluded)
    );

    return !isExcluded;
}

/**
 * Generic filter for unsupported regions
 */
export function isValidRegion(region: string): boolean {
    const excludedRegions = [
        "us-gov-",      // GovCloud
        "cn-",          // China
        "ap-northeast-3" // Osaka (limited availability)
    ];

    return !excludedRegions.some(excluded => region.startsWith(excluded));
}
