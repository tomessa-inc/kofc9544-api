import {CloudFrontClient, ListDistributionsCommand, CreateInvalidationCommand, GetInvalidationCommand, GetDistributionCommand} from "@aws-sdk/client-cloudfront";
import {PutObjectCommand, ListObjectsCommand} from "@aws-sdk/client-s3";
import fs, {existsSync} from "fs";
import {User} from "../models";
const sizeOf = require('image-size');
import * as uuid from 'uuid';
const { exec } = require("child_process");
import dotenv from "dotenv";
dotenv.config();
/*
export interface FileProperties {
    content_type?: string;
    extension?: string;
    error?: string;
    image_type?: string;
}
*//*
export interface EditProperties {
    "resize": {
        width?: number,
        height?: number,
        fit?: string
    }
} */
//aws  resourcegroupstaggingapi get-resources --tag-filters Key=ApplicationID,Values=APP1111 --resource-type-filters 'cloudfront' --tags-per-page 100 | jq -r ".ResourceTagMappingList[].ResourceARN" | sed 's:.*/::'
export class CloudFrontMapper {
    private _client;

    constructor() {
        const options = {
            version: "2020-05-31",
            region: "us-east-1"
        }

        this._client = new CloudFrontClient(options);
    }

    async setupInvalidationForCalender(environment:string) {

    }

    async getDistributionId() {

    }

    async checkInvalidation(distributionId, invalidationId) {
        try {
            let params = { // CreateInvalidationRequest
                DistributionId: distributionId, // required
                Id: invalidationId
            };

            return await this._client.send(new GetInvalidationCommand(params));
        } catch (error) {
            console.log('the error that showed up');
            console.log(error);

            return error.toString();
        }
    }
    /**
     * The path to use invalidate on
     * @param path
     */
    async createInvalidation(path, distributionId) {
        try {
            let params = { // CreateInvalidationRequest
                DistributionId: distributionId, // required
                InvalidationBatch: { // InvalidationBatch
                    Paths: { // Paths
                        Quantity: Number("1"), // required
                        Items: [ // PathList
                            path,
                        ],
                    },
                    CallerReference: `${Date.now()}`, // required
                },
            };

            return await this._client.send(new CreateInvalidationCommand(params));
        } catch (error) {
            console.log('the error that showed up');
            console.log(error);

            return error.toString();
        }
    }


}

export const cloudFrontMapper = new CloudFrontMapper();
