import { config } from "../config";
import { CdnMapper, cdnMapper } from "../mapper/cdn.mapper";

type Cdn = Pick<CdnMapper, "findDistributionId" | "invalidate">;

/** Publishes content changes by clearing the CDN's cached copies of a path. */
export class CdnService {
    constructor(
        private readonly cdn: Cdn,
        private readonly environment: () => string | undefined = () => config.nodeEnv,
    ) {}

    /** Invalidate `path` on this environment's distribution; true when the invalidation started. */
    public async invalidate(path: string): Promise<boolean> {
        const distributionId = await this.cdn.findDistributionId(this.environment());
        if (!distributionId) {
            throw new Error(`No CloudFront distribution is tagged Environment=${this.environment()}`);
        }
        return (await this.cdn.invalidate(distributionId, path)) === "InProgress";
    }
}

export const cdnService = new CdnService(cdnMapper);
