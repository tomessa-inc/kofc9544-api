import { expect } from "chai";
import { sqlExecutor } from "../../../db/executor";
import { NotFoundError } from "../../../errors";
import { cdnMapper } from "../../../mapper/cdn.mapper";
import { ImageController } from "../../../controllers/image.controller";
import { galleryService } from "../../../service/gallery.service";
import { imageService } from "../../../service/image.service";
import { tagService } from "../../../service/tag.service";
import { api, mount } from "../helpers/http";
import { stubMethod } from "../helpers/sql-stub";

describe("Gallery / Image / Tag controllers (HTTP contract)", () => {
    const stubs: { restore: () => void }[] = [];
    const stub = <T extends object, K extends keyof T>(target: T, key: K, impl?: (...args: any[]) => any) => {
        const s = stubMethod(target, key, impl);
        stubs.push(s);
        return s;
    };
    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    const rows = [{ name: "b", total: 3 }, { name: "a", total: 3 }];

    describe("paged lists", () => {
        for (const [url, service, method] of [
            ["/media/page-index/1/page-size/2/name/asc", galleryService, "list"],
            ["/media/image/page-index/1/page-size/2/name/asc", imageService, "list"],
            ["/media/tag/page-index/1/page-size/2/name/q", tagService, "list"],
        ] as const) {
            it(`POST ${url} returns the sorted paged envelope with lastpage from total`, async () => {
                stub(service as any, method, async () => rows.map((r) => ({ ...r })));

                const res = await api().post(url);

                expect(res.body.data.items.map((r) => r.name)).to.deep.equal(["a", "b"]);
                expect(res.body).to.include({ total: "3", lastpage: "2" });
            });
        }

        it("GET /media/image/gallery/... passes the gallery id and paging", async () => {
            const list = stub(imageService, "listByGallery", async () => []);

            await api().get("/media/image/gallery/g1/2/20/name/asc");

            expect(list.calls[0][0]).to.equal("g1");
            expect(list.calls[0][1]).to.include({ pageIndex: 2, pageSize: 20 });
        });
    });

    describe("galleries", () => {
        it("POST /media/id/:id returns the gallery", async () => {
            const get = stub(galleryService, "get", async () => ({ id: "g1", Tags: [] }));

            expect((await api().post("/media/id/g1")).body.data).to.deep.equal({ id: "g1", Tags: [] });
            expect(get.calls[0]).to.deep.equal(["g1"]);
        });

        it("POST /media/id/:id returns 404 for an unknown gallery", async () => {
            stub(galleryService, "get", async () => {
                throw new NotFoundError("Gallery not found");
            });

            const res = await api().post("/media/id/nope");

            expect(res.status).to.equal(404);
            expect(res.body.error).to.equal("Gallery not found");
        });

        it("PATCH /media/id/:id validates and updates", async () => {
            const update = stub(galleryService, "update", async () => undefined);

            const res = await api().patch("/media/id/g1").send({ description: "Summer", tags: ["t1", 2] });

            expect(res.body.data).to.equal(true);
            expect(update.calls[0]).to.deep.equal(["g1", { description: "Summer", tags: ["t1", "2"] }]);
            expect((await api().patch("/media/id/g1").send({ tags: "t1" })).status).to.equal(400);
        });

        it("POST /media/publish publishes", async () => {
            const publish = stub(galleryService, "publish", async () => true);

            expect((await api().post("/media/publish")).body.data).to.deep.equal({ result: "success" });
            expect(publish.calls).to.have.length(1);
        });
    });

    describe("images", () => {
        it("GET /media/primary/logged/:logged reads the flag", async () => {
            const list = stub(imageService, "listPrimary", async () => []);

            await api().get("/media/primary/logged/true");
            await api().get("/media/primary/logged/false");
            await api().get("/media/tag/list/frontend");

            expect(list.calls).to.deep.equal([[true], [false], [false]]);
        });

        it("GET/PUT/DELETE /media/image/id/:id", async () => {
            stub(imageService, "get", async () => ({ id: "img1" }));
            const update = stub(imageService, "update", async () => ({ affectedRows: 1 }));
            const del = stub(imageService, "delete", async () => ({ affectedRows: 1 }));

            expect((await api().get("/media/image/id/img1")).body.data).to.deep.equal({ id: "img1" });
            expect((await api().put("/media/image/id/img1").send({ primaryImage: "1" })).body.data).to.deep.equal({ affectedRows: 1 });
            expect((await api().delete("/media/image/id/img1")).body.data).to.equal(true);
            expect(update.calls[0]).to.deep.equal(["img1", { primaryImage: 1 }]);
            expect(del.calls[0]).to.deep.equal(["img1"]);
        });

        it("PUT /media/image/id/:id rejects an empty or invalid update", async () => {
            expect((await api().put("/media/image/id/img1").send({})).status).to.equal(400);
            expect((await api().put("/media/image/id/img1").send({ primaryImage: 7 })).status).to.equal(400);
        });

        it("POST /media/id/:galleryId/update/:id/order/:order sets the order", async () => {
            const setOrder = stub(imageService, "setOrder", async () => ({ affectedRows: 1 }));

            await api().post("/media/id/g1/update/img1/order/3");

            expect(setOrder.calls[0]).to.deep.equal(["g1", "img1", 3]);
            expect((await api().post("/media/id/g1/update/img1/order/-1")).status).to.equal(400);
        });

        it("apiImagesOrder (not routed) renumbers", async () => {
            stub(imageService, "renumber", async () => [{ id: "a", order: 0 }]);

            expect((await mount(ImageController.apiImagesOrder, "post", "/:id").post("/g1")).body.data).to.deep.equal([{ id: "a", order: 0 }]);
        });
    });

    describe("tags", () => {
        it("POST /media/tag/list returns every tag as options", async () => {
            stub(tagService, "listAsOptions", async () => [{ label: "Golf", value: "golf" }]);

            expect((await api().post("/media/tag/list").send({})).body.data).to.deep.equal([{ label: "Golf", value: "golf" }]);
        });

        it("POST /media/tag/new validates and creates", async () => {
            const create = stub(tagService, "create", async () => ({ id: "golf", name: "Golf", description: "", created: true }));

            expect((await api().post("/media/tag/new").send({ name: "Golf" })).body.data).to.include({ id: "golf", created: true });
            expect(create.calls[0][0]).to.deep.equal({ name: "Golf", description: "" });
            expect((await api().post("/media/tag/new").send({})).status).to.equal(400);
        });
    });

    describe("end to end (only the SQL executor and AWS clients are faked)", () => {
        it("POST /media/publish invalidates /media/* on the tagged distribution", async () => {
            const sent: any[] = [];
            stub((cdnMapper as any).tagging, "send", async (c) => (sent.push(c), { ResourceTagMappingList: [{ ResourceARN: "arn:aws:cloudfront::1:distribution/EDIST" }] }));
            stub((cdnMapper as any).cloudFront, "send", async (c) => (sent.push(c), { Invalidation: { Status: "InProgress" } }));

            expect((await api().post("/media/publish")).status).to.equal(200);
            expect(sent[1].input).to.deep.include({ DistributionId: "EDIST" });
            expect(sent[1].input.InvalidationBatch.Paths.Items).to.deep.equal(["/media/*"]);
        });

        it("GET /media/primary/logged/false returns public primary images as thumbnail URLs", async () => {
            const queries: string[] = [];
            stub(sqlExecutor, "run", async (q) => (queries.push(q.toSQL().sql), [{ id: "img1", key: "g1/a.png" }]));

            const res = await api().get("/media/primary/logged/false");

            expect(queries[0]).to.include("`gallery`.`viewing` = ?");
            expect(res.body.data.images[0].key).to.match(/^https:\/\/images\.kofc9544\.ca\//);
        });
    });
});
