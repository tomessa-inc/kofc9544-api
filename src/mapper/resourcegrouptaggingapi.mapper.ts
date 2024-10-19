import {ResourceGroupsTaggingAPIClient, GetResourcesCommand} from "@aws-sdk/client-resource-groups-tagging-api";
import {CloudFrontMapper} from "./cloudfront.mapper";
import {CreateInvalidationCommand} from "@aws-sdk/client-cloudfront";
import * as process from "process";

export interface Tag {
    key: string
    value:string
}

export class ResourceGroupTaggingApiMapper {
    private _client;

    constructor() {
        const options = {
            version: "2020-05-31",
            region: "us-east-1"
        }

        this._client = new ResourceGroupsTaggingAPIClient(options);
    }

    async getResourceByTag(tag:Tag) {
        let params = { // CreateInvalidationRequest
            TagFilters: [ // TagFilterList
                { // TagFilter
                    Key: tag.key,
                    Value: [ // TagValueList
                        tag.value,
                    ],
                },
            ],
            ResourceTypeFilters: [ // ResourceTypeFilterList
                "cloudfront",
            ],
        };

        return await this._client.send(new GetResourcesCommand(params));
    }
}

export const resourceGroupTaggingApiMapper = new ResourceGroupTaggingApiMapper();
