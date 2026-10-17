import { expect } from "chai";
import { cloudFrontMapper, galleryMapper, resourceGroupTaggingApiMapper, tagMapper } from "../../../mapper";
import { Tag2 } from "../../../models/Tag2";
import { stubMethod, stubSQL } from "../helpers/sql-stub";

describe("GalleryMapper / TagMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("GalleryMapper.publishGallery", () => {
        it("invalidates /media/* and reports whether it started", async () => {
            track(stubMethod(resourceGroupTaggingApiMapper, "getResourceByTag", async () => ({
                ResourceTagMappingList: [{ ResourceARN: "arn:aws:cloudfront::1:distribution/EDIST" }],
            })));
            const invalidate = track(stubMethod(cloudFrontMapper, "createInvalidation", async () => ({ Invalidation: { Status: "InProgress" } })));

            expect(await galleryMapper.publishGallery()).to.equal(true);
            expect(invalidate.calls[0]).to.deep.equal(["/media/*", "EDIST"]);
        });
    });

    describe("GalleryMapper.getAllGalleries", () => {
        it("paginates galleries", async () => {
            const db = track(stubSQL(galleryMapper, []));

            await galleryMapper.getAllGalleries({ pageIndex: 3, pageSize: 4 });

            expect(db.last.sql).to.include("from `gallery`");
            expect(db.last.params).to.deep.equal([4, 8]);
        });
    });

    describe("GalleryMapper.updateGallery", () => {
        it("updates the description, replaces the tags and resolves true", async () => {
            const db = track(stubSQL(galleryMapper, { affectedRows: 1 }));

            const result = await galleryMapper.updateGallery({ id: "g1" }, { description: "Summer", tags: ["t1", "t2"] });
            await new Promise((r) => setImmediate(r));

            expect(result).to.equal(true);
            expect(db.calls[0].sql).to.match(/^update `gallery` set `description` = \?/);
            expect(db.calls[0].params).to.deep.equal(["Summer", "g1"]);
            expect(db.calls[1].sql).to.equal("delete from `gallery_tag` where `gallery_tag`.`GalleryId` = ?");
            expect(db.calls.slice(2).map((c) => c.params)).to.deep.equal([["g1", "t1"], ["g1", "t2"]]);
        });

        it("skips the description update when none is given", async () => {
            const db = track(stubSQL(galleryMapper, { affectedRows: 1 }));

            await galleryMapper.updateGallery({ id: "g1" }, { tags: [] });

            expect(db.calls).to.have.length(1);
            expect(db.calls[0].sql).to.match(/^delete from `gallery_tag`/);
        });
    });

    describe("GalleryMapper.getGalleryById", () => {
        it("filters on the gallery id", async () => {
            const db = track(stubSQL(galleryMapper, [{ id: "g1" }]));

            await galleryMapper.getGalleryById({ id: "g1" });

            expect(db.last.sql).to.include("where `gallery`.`id` = ?");
            expect(db.last.params).to.deep.equal(["g1"]);
        });
    });

    describe("GalleryMapper getters", () => {
        it("exposes param names", () => {
            expect(galleryMapper.DEFAULT_SORT).to.equal("name");
            expect(galleryMapper.PARAMS_ID).to.equal("id");
            expect(galleryMapper.PARAMS_NAME).to.equal("name");
            expect(galleryMapper.LIST_NAME).to.equal("galleries");
        });
    });

    for (const [label, mapper] of [["TagMapper", tagMapper]] as const) {
        describe(`${label}.createTag`, () => {
            it("finds or creates the tag by name", async () => {
                const findOrCreate = track(stubMethod(Tag2 as any, "findOrCreate", async () => [{ id: "t1" }, true]));

                await mapper.createTag({ id: "t1", name: "golf", description: "Golf" });

                expect(findOrCreate.calls[0][0].where).to.deep.equal({ name: "golf" });
                expect(findOrCreate.calls[0][0].defaults).to.include({ id: "t1", name: "golf", description: "Golf" });
            });
        });

        describe(`${label}.getAllTagsForGallery`, () => {
            it("returns the first matching tag for the gallery", async () => {
                const findAll = track(stubMethod(Tag2 as any, "findAll", async () => [{ id: "t1" }, { id: "t2" }]));

                expect(await mapper.getAllTagsForGallery({ gallery_id: "g1" })).to.deep.equal({ id: "t1" });
                expect(findAll.calls[0][0].where).to.deep.equal({ "$gallery_tag.gallery_id$": "g1" });
            });
        });

        describe(`${label} getters`, () => {
            it("exposes param names", () => {
                expect(mapper.DEFAULT_SORT).to.equal("name");
                expect(mapper.PARAMS_NAME).to.equal("name");
            });
        });
    }

    describe("TagMapper.getAllTags", () => {
        it("paginates the tag table", async () => {
            const db = track(stubSQL(tagMapper, []));

            await tagMapper.getAllTags({ pageIndex: 2, pageSize: 20 });

            expect(db.last.sql).to.include("from `tag`");
            expect(db.last.params).to.deep.equal([20, 20]);
        });
    });


});
