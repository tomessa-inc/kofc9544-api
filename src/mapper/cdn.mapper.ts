import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { GetResourcesCommand, ResourceGroupsTaggingAPIClient } from "@aws-sdk/client-resource-groups-tagging-api";
import { config } from "../config";

interface Sender {
    send(command: unknown): Promise<any>;
}

/** AWS adapter for the CloudFront distribution that serves the site. */
export class CdnMapper {
    constructor(
        private readonly cloudFront: Sender = new CloudFrontClient({ region: config.awsRegion }),
        private readonly tagging: Sender = new ResourceGroupsTaggingAPIClient({ region: config.awsRegion }),
    ) {}

    /** Id of the CloudFront distribution tagged Environment=<environment>, if there is one. */
    public async findDistributionId(environment: string | undefined): Promise<string | undefined> {
        const result = await this.tagging.send(new GetResourcesCommand({
            TagFilters: [{ Key: "Environment", Values: environment ? [environment] : [] }],
            ResourceTypeFilters: ["cloudfront"],
        }));
        const arn: string | undefined = result?.ResourceTagMappingList?.[0]?.ResourceARN;
        return arn?.split("/").pop();
    }

    /** Start invalidating one path; returns the invalidation status (e.g. "InProgress"). */
    public async invalidate(distributionId: string, path: string): Promise<string | undefined> {
        const result = await this.cloudFront.send(new CreateInvalidationCommand({
            DistributionId: distributionId,
            InvalidationBatch: {
                Paths: { Quantity: 1, Items: [path] },
                CallerReference: `${Date.now()}`,
            },
        }));
        return result?.Invalidation?.Status;
    }
}

export const cdnMapper = new CdnMapper();
