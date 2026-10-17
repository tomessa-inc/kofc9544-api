import { expect } from "chai";
import { CdnMapper } from "../../../mapper/cdn.mapper";
import { GalleryMapper } from "../../../mapper/gallery.mapper";
import { ImageMapper } from "../../../mapper/image.mapper";
import { TagMapper } from "../../../mapper/tag.mapper";
import { fakeExecutor } from "../helpers/fake-executor";

describe("media mappers", () => {
    describe("GalleryMapper", () => {
        it("findPage pages galleries with their tags as a correlated subquery", async () => {
            const db = fakeExecutor([]);

            await new GalleryMapper(db).findPage({ offset: 8, limit: 4 });

            expect(db.last.sql).to.include("WHERE gallery_tag.GalleryId = gallery.id");
            expect(db.last.sql).to.include("(SELECT count(*) FROM gallery)");
            expect(db.last.params).to.deep.equal([4, 8]);
        });

        it("findById returns the first row or undefined", async () => {
            expect(await new GalleryMapper(fakeExecutor([{ id: "g1" }])).findById("g1")).to.deep.equal({ id: "g1" });
            expect(await new GalleryMapper(fakeExecutor([])).findById("g1")).to.equal(undefined);
        });

        it("replaceTags deletes the gallery's tags then inserts the new set in one statement", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new GalleryMapper(db).replaceTags("g1", ["t1", "t2"]);

            expect(db.calls[0].sql).to.equal("delete from `gallery_tag` where `gallery_tag`.`GalleryId` = ?");
            expect(db.calls[1].sql).to.equal("insert into `gallery_tag` (`GalleryId`, `TagId`) values (?, ?), (?, ?)");
            expect(db.calls[1].params).to.deep.equal(["g1", "t1", "g1", "t2"]);
        });

        it("replaceTags with no tags only deletes", async () => {
            const db = fakeExecutor({ affectedRows: 0 });

            await new GalleryMapper(db).replaceTags("g1", []);

            expect(db.calls).to.have.length(1);
        });

        it("setDescription updates the gallery", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new GalleryMapper(db).setDescription("g1", "Summer");

            expect(db.last.sql).to.equal("update `gallery` set `description` = ? where `gallery`.`id` = ?");
        });
    });

    describe("ImageMapper", () => {
        it("setOrder scopes the update to the gallery", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new ImageMapper(db).setOrder("g1", "img1", 3);

            expect(db.last.sql).to.equal("update `image` set `order` = ? where (`image`.`id` = ? and `image`.`GalleryId` = ?)");
            expect(db.last.params).to.deep.equal([3, "img1", "g1"]);
        });

        it("findActiveInGallery orders by position then id", async () => {
            const db = fakeExecutor([]);

            await new ImageMapper(db).findActiveInGallery("g1");

            expect(db.last.sql).to.include("where (`image`.`GalleryId` = ? and `image`.`active` = ?) order by `image`.`order` asc, `image`.`id` asc");
        });

        it("deactivate soft-deletes", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new ImageMapper(db).deactivate("img1");

            expect(db.last.sql).to.equal("update `image` set `active` = ? where `image`.`id` = ?");
            expect(db.last.params).to.deep.equal([0, "img1"]);
        });

        it("findPage counts only active images in its total", async () => {
            const db = fakeExecutor([]);

            await new ImageMapper(db).findPage({ offset: 50, limit: 50 });

            expect(db.last.sql).to.include("(SELECT count(*) FROM image WHERE image.active = ?)");
            expect(db.last.params).to.deep.equal([1, 1, 50, 50]);
        });

        it("findPrimary restricts anonymous visitors to public galleries", async () => {
            const db = fakeExecutor([]);
            const images = new ImageMapper(db);

            await images.findPrimary({ includePrivate: true });
            await images.findPrimary({ includePrivate: false });

            expect(db.calls[0].sql).to.not.include("`gallery`.`viewing`");
            expect(db.calls[1].sql).to.include("(`image`.`primaryImage` = ? and `gallery`.`viewing` = ?)");
        });

        it("findByGallery counts that gallery's active images", async () => {
            const db = fakeExecutor([]);

            await new ImageMapper(db).findByGallery("g1", { offset: 20, limit: 10 });

            expect(db.last.sql).to.include("(SELECT count(*) FROM image AS i WHERE i.GalleryId = ? AND i.active = ?)");
            expect(db.last.params).to.deep.equal(["g1", 1, "g1", 1, 10, 20]);
        });

        it("findById and update", async () => {
            const db = fakeExecutor([{ id: "img1" }]);
            const images = new ImageMapper(db);

            expect(await images.findById("img1")).to.deep.equal({ id: "img1" });
            await images.update("img1", { description: "Tee off" });

            expect(db.last.sql).to.equal("update `image` set `description` = ? where `image`.`id` = ?");
        });
    });

    describe("TagMapper", () => {
        it("insert stamps createdAt/updatedAt", async () => {
            const db = fakeExecutor({ affectedRows: 1 });

            await new TagMapper(db).insert({ id: "golf", name: "Golf", description: "" });

            expect(db.last.sql).to.equal("insert into `tag` (`id`, `name`, `description`, `createdAt`, `updatedAt`) values (?, ?, ?, NOW(), NOW())");
        });

        it("findAll orders by name; findPage pages with total; findByName filters", async () => {
            const db = fakeExecutor([]);
            const tags = new TagMapper(db);

            await tags.findAll();
            await tags.findPage({ offset: 10, limit: 10 });
            await tags.findByName("Golf");

            expect(db.calls[0].sql).to.match(/order by `tag`\.`name` asc$/);
            expect(db.calls[1].sql).to.include("(SELECT count(*) FROM tag)");
            expect(db.calls[2].params).to.deep.equal(["Golf"]);
        });
    });

    describe("CdnMapper", () => {
        it("finds the distribution tagged with the environment and invalidates one path", async () => {
            const sent: any[] = [];
            const cloudFront = { send: async (c: any) => (sent.push(c), { Invalidation: { Status: "InProgress" } }) };
            const tagging = { send: async (c: any) => (sent.push(c), { ResourceTagMappingList: [{ ResourceARN: "arn:aws:cloudfront::1:distribution/EDIST" }] }) };
            const cdn = new CdnMapper(cloudFront, tagging);

            expect(await cdn.findDistributionId("stage")).to.equal("EDIST");
            expect(await cdn.invalidate("EDIST", "/media/*")).to.equal("InProgress");

            expect(sent[0].input).to.deep.equal({ TagFilters: [{ Key: "Environment", Values: ["stage"] }], ResourceTypeFilters: ["cloudfront"] });
            expect(sent[1].input.DistributionId).to.equal("EDIST");
            expect(sent[1].input.InvalidationBatch.Paths).to.deep.equal({ Quantity: 1, Items: ["/media/*"] });
        });

        it("returns undefined when no distribution is tagged", async () => {
            const cdn = new CdnMapper({ send: async () => ({}) }, { send: async () => ({ ResourceTagMappingList: [] }) });

            expect(await cdn.findDistributionId("stage")).to.equal(undefined);
        });
    });
});
