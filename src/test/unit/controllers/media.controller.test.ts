import { expect } from "chai";
import { galleryMapper, imageMapper, tagMapper } from "../../../mapper";
import { ImageController } from "../../../controllers/image.controller";
import { GalleryController } from "../../../controllers/gallery.controller";
import { api, mount } from "../helpers/http";
import { stubMethod } from "../helpers/sql-stub";

describe("Gallery / Image / Tag controllers", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("GalleryController", () => {
        it("POST /media/page-index/... lists galleries with parsed params", async () => {
            const list = stub(galleryMapper, "getAllGalleries", async () => [{ name: "a", total: 1 }]);

            const res = await api().post("/media/page-index/2/page-size/5/name/asc");

            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0][0]).to.include({ pageIndex: 2, pageSize: 5 });
        });

        it("POST /media/page-index/... returns 500 on an error string", async () => {
            stub(galleryMapper, "getAllGalleries", async () => "Error: boom");

            expect((await api().post("/media/page-index/1/page-size/5/name/asc")).status).to.equal(500);
        });

        it("POST /media/publish publishes the gallery", async () => {
            const publish = stub(galleryMapper, "publishGallery", async () => true);

            expect((await api().post("/media/publish")).body.data).to.deep.equal({ result: "success" });
            expect(publish.calls).to.have.length(1);
        });

        it("POST /media/publish returns 500 when publishing throws", async () => {
            stub(galleryMapper, "publishGallery", async () => { throw new Error("boom"); });

            expect((await api().post("/media/publish")).status).to.equal(500);
        });

        it("apiGetGalleryById maps tags to label/value pairs", async () => {
            stub(galleryMapper, "getGalleryById", async () => [{ id: "g1", Tags: [{ id: "t1", name: "Golf" }] }]);

            const res = await mount(GalleryController.apiGetGalleryById, "post", "/:id").post("/g1");

            expect(res.body.data).to.deep.equal({ id: "g1", Tags: [{ label: "Golf", value: "t1" }] });
        });

        it("apiUpdateGalleryById updates by id", async () => {
            const update = stub(galleryMapper, "updateGallery", async () => true);

            const res = await mount(GalleryController.apiUpdateGalleryById, "patch", "/:id").patch("/g1").send({ tags: [] });

            expect(res.body.data).to.equal(true);
            expect(update.calls[0]).to.deep.equal([{ id: "g1" }, { tags: [] }]);
        });

        it("apiUpdateGalleryById returns 500 on an error string", async () => {
            stub(galleryMapper, "updateGallery", async () => "Error: boom");

            expect((await mount(GalleryController.apiUpdateGalleryById, "patch", "/:id").patch("/g1").send({})).status).to.equal(500);
        });

        it("POST /media/id/:id looks the gallery up by the route id", async () => {
            const lookup = stub(galleryMapper, "getGalleryById", async () => [{ id: "g1", Tags: [] }]);

            const res = await api().post("/media/id/g1");

            expect(res.status).to.equal(200);
            expect(lookup.calls[0][0]).to.deep.equal({ id: "g1" });
        });

        it("PATCH /media/id/:id updates the gallery by the route id", async () => {
            const update = stub(galleryMapper, "updateGallery", async () => true);

            const res = await api().patch("/media/id/g1").send({ tags: ["t1"] });

            expect(res.status).to.equal(200);
            expect(update.calls[0]).to.deep.equal([{ id: "g1" }, { tags: ["t1"] }]);
        });
    });

    describe("ImageController", () => {
        it("GET /media/image/gallery/... lists a gallery's images with its count", async () => {
            const list = stub(imageMapper, "getImagesByGallery", async () => [{ name: "a", total: 1 }]);
            const count = stub(imageMapper, "getListLength", async () => 1);

            const res = await api().get("/media/image/gallery/g1/1/20/name/asc");

            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0][0]).to.include({ imagesByGalleryId: "g1", pageIndex: 1, pageSize: 20 });
            expect(count.calls[0][0].imagesByGalleryId).to.equal("g1");
        });

        it("GET /media/image/gallery/... returns 500 on an error string", async () => {
            stub(imageMapper, "getImagesByGallery", async () => "Error: boom");

            expect((await api().get("/media/image/gallery/g1/1/20/name/asc")).status).to.equal(500);
        });

        it("POST /media/id/:galleryId/update/:id/order/:order updates the order as a number", async () => {
            const update = stub(imageMapper, "updateOrder", async () => undefined);

            expect((await api().post("/media/id/g1/update/img1/order/3")).status).to.equal(200);
            expect(update.calls[0]).to.deep.equal(["g1", "img1", 3]);
        });

        it("GET /media/primary/logged/:logged parses logged as a boolean", async () => {
            const list = stub(imageMapper, "getAllPrimaryImages", async () => []);

            const res = await api().get("/media/primary/logged/true");

            expect(res.body.data).to.deep.equal({ images: [] });
            expect(list.calls[0][0]).to.deep.equal({ logged: true });
        });

        it("GET /media/tag/list/frontend lists public primary images", async () => {
            const list = stub(imageMapper, "getAllPrimaryImages", async () => []);

            await api().get("/media/tag/list/frontend");

            expect(list.calls[0][0]).to.deep.equal({ logged: false });
        });

        it("GET /media/primary/logged/:logged returns 500 on an error string", async () => {
            stub(imageMapper, "getAllPrimaryImages", async () => "Error: boom");

            expect((await api().get("/media/primary/logged/false")).status).to.equal(500);
        });

        it("POST /media/image/page-index/... lists images with the total count", async () => {
            stub(imageMapper, "getAllImages", async () => [{ name: "a", total: 1 }]);
            stub(imageMapper, "getListLength", async () => 1);

            expect((await api().post("/media/image/page-index/1/page-size/10/name/asc")).body.data.items).to.have.length(1);
        });

        it("POST /media/image/page-index/... returns 500 on an error string", async () => {
            stub(imageMapper, "getAllImages", async () => "Error: boom");

            expect((await api().post("/media/image/page-index/1/page-size/10/name/asc")).status).to.equal(500);
        });

        it("apiGetImage returns the first image", async () => {
            stub(imageMapper, "getImageById", async () => [{ id: "img1" }]);

            expect((await mount(ImageController.apiGetImage, "get", "/:id").get("/img1")).body.data).to.deep.equal({ id: "img1" });
        });

        it("apiUpdateImage updates by id", async () => {
            const update = stub(imageMapper, "updateImageById", async () => ({ affectedRows: 1 }));

            await mount(ImageController.apiUpdateImage, "put", "/:id").put("/img1").send({ description: "x" });

            expect(update.calls[0]).to.deep.equal(["img1", { description: "x" }]);
        });

        it("apiDeleteImage soft-deletes by id", async () => {
            const del = stub(imageMapper, "deleteImageById", async () => true);

            expect((await mount(ImageController.apiDeleteImage, "delete", "/:id").delete("/img1")).body.data).to.equal(true);
            expect(del.calls[0]).to.deep.equal(["img1"]);
        });

        it("apiImagesOrder renumbers images in order", async () => {
            stub(imageMapper, "reOrder", async () => [{ id: "a" }, { id: "b" }]);
            const reNum = stub(imageMapper, "reNum", async () => undefined);

            await mount(ImageController.apiImagesOrder, "post", "/:id").post("/g1");

            expect(reNum.calls).to.deep.equal([["a", 0], ["b", 1]]);
        });

        for (const [name, mapperMethod, method] of [
            ["apiGetImage", "getImageById", "get"],
            ["apiUpdateImage", "updateImageById", "put"],
            ["apiDeleteImage", "deleteImageById", "delete"],
            ["apiImagesOrder", "reOrder", "post"],
            ["apiUpdateOrderImage", "updateOrder", "post"],
        ] as const) {
            it(`${name} returns 500 on an error string`, async () => {
                stub(imageMapper, mapperMethod, async () => "Error: boom");

                const res = await (mount(ImageController[name], method, "/:id") as any)[method]("/x");

                expect(res.status).to.equal(500);
            });
        }

        it("GET /media/image/id/:id gets the image by the route id", async () => {
            const lookup = stub(imageMapper, "getImageById", async () => [{ id: "img1" }]);

            const res = await api().get("/media/image/id/img1");

            expect(res.body.data).to.deep.equal({ id: "img1" });
            expect(lookup.calls[0][0]).to.equal("img1");
        });

        it("PUT /media/image/id/:id updates the image by the route id", async () => {
            const update = stub(imageMapper, "updateImageById", async () => ({ affectedRows: 1 }));

            const res = await api().put("/media/image/id/img1").send({ description: "Tee off" });

            expect(res.status).to.equal(200);
            expect(update.calls[0]).to.deep.equal(["img1", { description: "Tee off" }]);
        });

        it("DELETE /media/image/id/:id deletes the image by the route id", async () => {
            const del = stub(imageMapper, "deleteImageById", async () => true);

            const res = await api().delete("/media/image/id/img1");

            expect(res.status).to.equal(200);
            expect(del.calls[0]).to.deep.equal(["img1"]);
        });
    });

    describe("TagController", () => {
        it("POST /media/tag/new creates the tag", async () => {
            const create = stub(tagMapper, "createTag", async () => [{ id: "t1" }, true]);

            expect((await api().post("/media/tag/new").send({ name: "golf" })).body.data).to.deep.equal([{ id: "t1" }, true]);
            expect(create.calls[0][0]).to.deep.equal({ name: "golf" });
        });

        it("POST /media/tag/new returns 500 on an error string", async () => {
            stub(tagMapper, "createTag", async () => "Error: boom");

            expect((await api().post("/media/tag/new").send({})).status).to.equal(500);
        });

        it("POST /media/tag/list returns tags as label/value pairs", async () => {
            stub(tagMapper, "getAllTags", async () => [{ id: "t1", name: "Golf" }]);

            expect((await api().post("/media/tag/list").send({})).body.data).to.deep.equal([{ label: "Golf", value: "t1" }]);
        });

        it("POST /media/tag/list returns 500 on an error string", async () => {
            stub(tagMapper, "getAllTags", async () => "Error: boom");

            expect((await api().post("/media/tag/list").send({})).status).to.equal(500);
        });

        it("POST /media/tag/page-index/... lists tags", async () => {
            const list = stub(tagMapper, "getAllTags", async () => [{ name: "a", total: 1 }]);

            const res = await api().post("/media/tag/page-index/1/page-size/5/name/q");

            expect(res.body.data.items).to.have.length(1);
            expect(list.calls[0][0]).to.include({ pageSize: 5, sort: "name" });
        });

        it("POST /media/tag/page-index/... returns 500 on an error string", async () => {
            stub(tagMapper, "getAllTags", async () => "Error: boom");

            expect((await api().post("/media/tag/page-index/1/page-size/5/name/q")).status).to.equal(500);
        });
    });
});
