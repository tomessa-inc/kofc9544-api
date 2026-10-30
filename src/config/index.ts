import dotenv from "dotenv";

dotenv.config();

/**
 * Single source of runtime configuration. Values are read from the environment at access time
 * (not import time) so tests and Lambda cold starts see the current environment.
 */
export const config = {
    get stage(): string {
        return process.env.STAGE ?? "dev";
    },

    get nodeEnv(): string | undefined {
        return process.env.NODE_ENV;
    },

    /** Secret for signing and verifying member JWTs. Required: refusing to sign with a default is the point. */
    get tokenSecret(): string {
        const secret = process.env.TOKEN_SECRET;
        if (!secret) {
            throw new Error("TOKEN_SECRET is not set");
        }
        return secret;
    },

    /** HTTP endpoint of the RDS SQL proxy that executes queries. */
    get sqlProxyUrl(): string {
        return `${process.env.RDS_HOST}/${process.env.RDS_DB}`;
    },

    /** Base URL of the member site, used in links sent by email. */
    get memberSiteUrl(): string {
        switch (this.stage) {
            case "dev":
                return "http://localhost:5555";
            case "stage":
                return "https://member-stage.kofc9544.ca";
            default:
                return "https://member.kofc9544.ca";
        }
    },

    awsRegion: "us-east-1",
    imageCdnUrl: "https://images.kofc9544.ca",
    imageBucket: "images.kofc9544.ca",
} as const;
