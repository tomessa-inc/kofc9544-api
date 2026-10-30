import { config } from "../config";

export interface ImageEdits {
    resize: { width?: number; height?: number; fit?: string };
}


/**
 * CDN URL for an S3 image resized on the fly: the serverless image handler behind the CDN decodes the
 * base64 path into { bucket, key, edits }.
 */
export function imageUrl(key: string, edits: ImageEdits): string {
    const request = JSON.stringify({ bucket: config.imageBucket, key, edits });
    return `${config.imageCdnUrl}/${Buffer.from(request).toString("base64")}`;
}
