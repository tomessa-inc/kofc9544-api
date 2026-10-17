import { expect } from "chai";
import { imageMapper } from "../../../mapper";
import { Image2 } from "../../../models/Image2";
import { stubMethod, stubSQL } from "../helpers/sql-stub";

describe("ImageMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("updateImageById", () => {
        it("updates description and primaryImage", async () => {
            const db = track(stubSQL(imageMapper, { affectedRows: 1 }));

            await imageMapper.updateImageById("img1", { description: "Tee off", primaryImage: 1 });

            expect(db.last.sql).to.match(/^update `image` set/);
            expect(db.last.params).to.have.members(["Tee off", 1, "img1"]);
            expect(db.last.params.at(-1)).to.equal("img1");
        });
    });

    describe("getImageById", () => {
        it("left joins the gallery and filters on image id", async () => {
            const db = track(stubSQL(imageMapper, [{ id: "img1" }]));

            await imageMapper.getImageById("img1");

            expect(db.last.sql).to.include("from `image` left join `gallery`");
            expect(db.last.params).to.deep.equal(["img1"]);
        });
    });

    describe("legacy Sequelize ordering helpers", () => {
        it("updateOrder sets the order for the image id", async () => {
            const update = track(stubMethod(Image2 as any, "update", async () => [1]));

            await imageMapper.updateOrder("g1", "img1", 3);

            expect(update.calls[0]).to.deep.equal([{ order: 3 }, { where: { id: "img1" } }]);
        });

        it("reOrder lists active images in the gallery", async () => {
            const findAll = track(stubMethod(Image2 as any, "findAll", async () => [{ get: () => ({ id: "img1" }) }]));

            expect(await imageMapper.reOrder("g1")).to.deep.equal([{ id: "img1" }]);
            expect(findAll.calls[0][0]).to.deep.equal({ offset: 0, limit: 300, where: { active: 1, GalleryId: "g1" } });
        });

        it("reNum sets and saves the new order", async () => {
            const row = { set: (k: string, v: number) => Object.assign(row, { [k]: v }), save: () => undefined } as any;
            track(stubMethod(Image2 as any, "findOne", async () => row));

            await imageMapper.reNum("img1", 7);

            expect(row.order).to.equal(7);
        });

        it("deleteImageById soft-deletes by setting active to 0", async () => {
            let saved = false;
            const row = { active: 1, save: () => { saved = true; } } as any;
            track(stubMethod(Image2 as any, "findOrCreate", async () => [row, false]));

            expect(await imageMapper.deleteImageById("img1")).to.equal(true);
            expect(row.active).to.equal(0);
            expect(saved).to.equal(true);
        });
    });

    describe("getAllImages", () => {
        it("paginates active images", async () => {
            const db = track(stubSQL(imageMapper, []));

            await imageMapper.getAllImages({ pageIndex: 2, pageSize: 50 });

            expect(db.last.sql).to.include("where `image`.`active` = ?");
            expect(db.last.params).to.deep.equal([1, 50, 50]);
        });
    });

    describe("getListLength", () => {
        it("counts all active images when no options are given", async () => {
            const db = track(stubSQL(imageMapper, [{ count: 3 }]));

            await imageMapper.getListLength();

            expect(db.last.sql).to.include("count(*)");
            expect(db.last.params).to.deep.equal([1]);
        });

        it("counts active images in a gallery", async () => {
            const db = track(stubSQL(imageMapper, [{ count: 3 }]));

            await imageMapper.getListLength({ imagesByGalleryId: "g1" });

            expect(db.last.params).to.deep.equal([1, "g1"]);
        });
    });

    describe("getAllPrimaryImages", () => {
        it("shows all primary images to logged-in users", async () => {
            const db = track(stubSQL(imageMapper, []));

            await imageMapper.getAllPrimaryImages({ logged: true });

            expect(db.last.sql).to.include("where `image`.`primaryImage` = ?");
            expect(db.last.sql).to.not.include("`gallery`.`viewing`");
        });

        it("restricts anonymous users to public galleries", async () => {
            const db = track(stubSQL(imageMapper, []));

            await imageMapper.getAllPrimaryImages({ logged: false });

            expect(db.last.sql).to.include("`gallery`.`viewing` = ?");
        });
    });

    describe("getImagesByGallery", () => {
        it("paginates active images in the gallery", async () => {
            const db = track(stubSQL(imageMapper, []));

            await imageMapper.getImagesByGallery({ imagesByGalleryId: "g1", pageIndex: 3, pageSize: 10 });

            expect(db.last.sql).to.include("`image`.`GalleryId` = ? and `image`.`active` = ?");
            expect(db.last.params.slice(-2)).to.deep.equal([10, 20]);
        });
    });

    describe("getters", () => {
        it("exposes param names", () => {
            expect(imageMapper.DEFAULT_SORT).to.equal("name");
            expect(imageMapper.PARAMS_NAME).to.equal("name");
        });
    });
});
