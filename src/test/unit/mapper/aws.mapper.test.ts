import { expect } from "chai";
import fs from "fs";
import os from "os";
import path from "path";
import { cloudFrontMapper, resourceGroupTaggingApiMapper, s3Mapper } from "../../../mapper";
import { stubMethod } from "../helpers/sql-stub";

// 1x1 and 1x2 PNGs.
const PNG_LANDSCAPE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PNG_PORTRAIT = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEUlEQVR42mNk+M9QzwAEjDAGACCDAv8cI7IoAAAAAElFTkSuQmCC";

describe("AWS mappers", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);
    const sendOf = (mapper: object, impl: (...args: any[]) => any = async () => ({})) =>
        track(stubMethod((mapper as any)._client, "send", async (command) => {
            // S3 uploads pass a file ReadStream as Body. The real client consumes it; here we must close it
            // before afterEach deletes the temp file, or its late open() throws ENOENT into an unrelated test.
            const body = command?.input?.Body;
            if (body instanceof fs.ReadStream) {
                await new Promise<void>((resolve) => {
                    body.once("close", resolve);
                    body.destroy();
                });
            }
            return impl(command);
        }));

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("CloudFrontMapper", () => {
        it("createInvalidation invalidates a single path on the distribution", async () => {
            const send = sendOf(cloudFrontMapper, async () => ({ Invalidation: { Status: "InProgress" } }));

            await cloudFrontMapper.createInvalidation("/media/*", "EDIST");

            const input = send.calls[0][0].input;
            expect(input.DistributionId).to.equal("EDIST");
            expect(input.InvalidationBatch.Paths).to.deep.equal({ Quantity: 1, Items: ["/media/*"] });
            expect(input.InvalidationBatch.CallerReference).to.match(/^\d+$/);
        });

        it("createInvalidation returns the error string when AWS fails", async () => {
            sendOf(cloudFrontMapper, async () => { throw new Error("AccessDenied"); });

            expect(await cloudFrontMapper.createInvalidation("/x", "E")).to.equal("Error: AccessDenied");
        });

        it("checkInvalidation looks up the invalidation by id", async () => {
            const send = sendOf(cloudFrontMapper, async () => ({ Invalidation: { Status: "Completed" } }));

            await cloudFrontMapper.checkInvalidation("EDIST", "I123");

            expect(send.calls[0][0].input).to.deep.equal({ DistributionId: "EDIST", Id: "I123" });
        });

        it("checkInvalidation returns the error string when AWS fails", async () => {
            sendOf(cloudFrontMapper, async () => { throw new Error("NoSuchInvalidation"); });

            expect(await cloudFrontMapper.checkInvalidation("E", "I")).to.equal("Error: NoSuchInvalidation");
        });

        it("placeholder methods resolve to undefined", async () => {
            expect(await cloudFrontMapper.setupInvalidationForCalender("stage")).to.equal(undefined);
            expect(await cloudFrontMapper.getDistributionId()).to.equal(undefined);
        });
    });

    describe("ResourceGroupTaggingApiMapper", () => {
        it("getResourceByTag filters CloudFront resources by tag", async () => {
            const send = sendOf(resourceGroupTaggingApiMapper, async () => ({ ResourceTagMappingList: [] }));

            await resourceGroupTaggingApiMapper.getResourceByTag({ key: "Environment", value: "stage" });

            expect(send.calls[0][0].input).to.deep.equal({
                TagFilters: [{ Key: "Environment", Value: ["stage"] }],
                ResourceTypeFilters: ["cloudfront"],
            });
        });
    });

    describe("S3Mapper", () => {
        const key = `unit-test-${process.pid}`;
        const tmpFile = (ext: string) => `/tmp/${key}.${ext}`;

        afterEach(() => {
            for (const ext of ["png", "jpeg"]) fs.rmSync(tmpFile(ext), { force: true });
        });

        it("resizeWithInS3 base64-encodes the image-handler request", () => {
            const edits = { resize: { width: 200, height: 200, fit: "cover" } };

            const encoded = s3Mapper.resizeWithInS3("a/b.png", edits);

            expect(JSON.parse(Buffer.from(encoded, "base64").toString())).to.deep.equal({
                bucket: "images.kofc9544.ca",
                key: "a/b.png",
                edits,
            });
        });

        it("writeToDisk writes a landscape png and reports its properties", async () => {
            const result = await s3Mapper.writeToDisk(key, PNG_LANDSCAPE);

            expect(result).to.deep.equal({ content_type: "image/png", extension: "png", image_type: "landscape" });
            expect(fs.existsSync(tmpFile("png"))).to.equal(true);
        });

        it("writeToDisk detects portrait images", async () => {
            const result = await s3Mapper.writeToDisk(key, PNG_PORTRAIT);

            expect(result.image_type).to.equal("portrait");
        });

        it("writeToDisk returns an error for unsupported formats", async () => {
            const result = await s3Mapper.writeToDisk(key, "data:image/gif;base64,R0lGOD");

            expect(result).to.have.property("error");
        });

        it("checkSize returns the error string for a missing file", async () => {
            expect(await s3Mapper.checkSize("/tmp/does-not-exist.png")).to.be.a("string");
        });

        it("generatePrePath creates nested directories", async () => {
            const dir = path.join(os.tmpdir(), `s3-mapper-${process.pid}`, "a", "b");

            await s3Mapper.generatePrePath(dir);

            expect(fs.existsSync(dir)).to.equal(true);
            fs.rmSync(path.join(os.tmpdir(), `s3-mapper-${process.pid}`), { recursive: true, force: true });
        });

        it("uploadToS3 puts the temp file in the upload bucket", async () => {
            fs.writeFileSync(tmpFile("png"), "x");
            const send = sendOf(s3Mapper, async () => ({ ETag: "1" }));

            expect(await s3Mapper.uploadToS3(`${key}.png`, "image/png")).to.deep.equal({ ETag: "1" });
            expect(send.calls[0][0].input).to.include({ Bucket: "images-kofc-golf", Key: `${key}.png`, ContentType: "image/png" });
        });

        it("getImageReadyForUpload writes then uploads", async () => {
            const send = sendOf(s3Mapper);

            const props = await s3Mapper.getImageReadyForUpload(key, PNG_LANDSCAPE);

            expect(props.extension).to.equal("png");
            expect(send.calls[0][0].input.Key).to.equal(`${key}.png`);
        });

        it("upload returns the S3 key of the uploaded file", async () => {
            sendOf(s3Mapper);

            expect(await s3Mapper.upload(PNG_LANDSCAPE, "", key)).to.equal(`${key}.png`);
        });
    });
});
