import { expect } from "chai";
import { NotFoundError } from "../../../errors";
import { CdnService } from "../../../service/cdn.service";
import { GalleryService } from "../../../service/gallery.service";
import { ImageService } from "../../../service/image.service";
import { TagService } from "../../../service/tag.service";
import { parseListParams } from "../../../validators/list.validator";

function fake<T extends Record<string, (...args: any[]) => any>>(impl: T) {
    const calls: Record<string, any[][]> = {};
    const proxy = {} as T;
    for (const [name, fn] of Object.entries(impl)) {
        calls[name] = [];
        (proxy as any)[name] = async (...args: any[]) => (calls[name].push(args), fn(...args));
    }
    return { proxy, calls };
}

async function rejects(promise: Promise<unknown>): Promise<Error> {
    try {
        await promise;
    } catch (error) {
        return error as Error;
    }
    throw new Error("expected rejection");
}

const decode = (url: string) => JSON.parse(Buffer.from(url.split("/").pop()!, "base64").toString());

describe("media services", () => {
    describe("CdnService", () => {
        it("invalidates the path on the environment's distribution", async () => {
            const cdn = fake({ findDistributionId: async () => "EDIST", invalidate: async () => "InProgress" });

            expect(await new CdnService(cdn.proxy, () => "stage").invalidate("/media/*")).to.equal(true);
            expect(cdn.calls.findDistributionId[0]).to.deep.equal(["stage"]);
            expect(cdn.calls.invalidate[0]).to.deep.equal(["EDIST", "/media/*"]);
        });

        it("reports false when the invalidation did not start, and throws without a distribution", async () => {
            expect(await new CdnService(fake({ findDistributionId: async () => "E", invalidate: async () => "Completed" }).proxy, () => "stage").invalidate("/x")).to.equal(false);

            const error = await rejects(new CdnService(fake({ findDistributionId: async () => undefined, invalidate: async () => "" }).proxy, () => "stage").invalidate("/x"));
            expect(error.message).to.equal("No CloudFront distribution is tagged Environment=stage");
        });
    });

    describe("GalleryService", () => {
        function setup(found: any = { id: "g1", name: "Golf", viewing: true, Tags: [{ id: "t1", name: "Golf" }] }) {
            const store = fake({ findPage: async () => [], findById: async () => found, setDescription: async () => ({}), replaceTags: async () => undefined });
            const cdn = fake({ invalidate: async () => true });
            return { service: new GalleryService(store.proxy as any, cdn.proxy), store, cdn };
        }

        it("get maps tags to label/value options", async () => {
            expect(await setup().service.get("g1")).to.deep.equal({ id: "g1", name: "Golf", viewing: true, Tags: [{ label: "Golf", value: "t1" }] });
        });

        it("get handles a gallery without tags, and 404s an unknown gallery", async () => {
            expect((await setup({ id: "g1", Tags: null }).service.get("g1")).Tags).to.deep.equal([]);
            expect(await rejects(setup(null).service.get("nope"))).to.be.instanceOf(NotFoundError);
        });

        it("update sets the description only when given, and always replaces the tags", async () => {
            const { service, store } = setup();

            await service.update("g1", { description: "Summer", tags: ["t1"] });
            await service.update("g1", { tags: [] });

            expect(store.calls.setDescription).to.deep.equal([["g1", "Summer"]]);
            expect(store.calls.replaceTags).to.deep.equal([["g1", ["t1"]], ["g1", []]]);
        });

        it("publish invalidates the media pages", async () => {
            const { service, cdn } = setup();

            await service.publish();

            expect(cdn.calls.invalidate[0]).to.deep.equal(["/media/*"]);
        });
    });

    describe("ImageService", () => {
        function setup(found: any = { id: "img1" }) {
            const store = fake({
                findById: async () => found,
                update: async () => ({ affectedRows: 1 }),
                setOrder: async () => ({ affectedRows: 1 }),
                findActiveInGallery: async () => [{ id: "b", order: 5 }, { id: "a", order: 9 }],
                deactivate: async () => ({ affectedRows: 1 }),
                findPage: async () => [],
                findPrimary: async () => [{ id: "img1", key: "g1/a.png" }],
                findByGallery: async () => [],
            });
            return { service: new ImageService(store.proxy), store };
        }

        it("listPrimary returns thumbnail CDN URLs and passes the signed-in flag", async () => {
            const { service, store } = setup();

            const [img] = await service.listPrimary(false);

            expect(store.calls.findPrimary[0]).to.deep.equal([{ includePrivate: false }]);
            expect(decode(img.key)).to.include({ key: "g1/a.png" });
        });

        it("renumber assigns 0..n-1 in current order", async () => {
            const { service, store } = setup();

            expect(await service.renumber("g1")).to.deep.equal([{ id: "b", order: 0 }, { id: "a", order: 1 }]);
            expect(store.calls.setOrder).to.deep.equal([["g1", "b", 0], ["g1", "a", 1]]);
        });

        it("get 404s an unknown image; list, listByGallery, update, setOrder and delete delegate", async () => {
            expect(await rejects(setup(null).service.get("nope"))).to.be.instanceOf(NotFoundError);

            const { service, store } = setup();
            await service.list(parseListParams({ pageIndex: "2", pageSize: "50" }));
            await service.listByGallery("g1", parseListParams({ pageIndex: "1", pageSize: "20" }));
            await service.update("img1", { primaryImage: 1 });
            await service.setOrder("g1", "img1", 2);
            await service.delete("img1");

            expect(store.calls.findPage[0][0]).to.deep.equal({ offset: 50, limit: 50 });
            expect(store.calls.findByGallery[0]).to.deep.equal(["g1", { offset: 0, limit: 20 }]);
            expect(store.calls.deactivate[0]).to.deep.equal(["img1"]);
        });
    });

    describe("TagService", () => {
        function setup(existing: any[] = []) {
            const store = fake({ findPage: async () => [], findAll: async () => [{ id: "golf", name: "Golf", description: "" }], findByName: async () => existing, insert: async () => ({}) });
            return { service: new TagService(store.proxy as any), store };
        }

        it("create inserts a new tag with an id derived from its name", async () => {
            const { service, store } = setup();

            expect(await service.create({ name: "Hole In One", description: "" })).to.deep.equal({ id: "hole-in-one", name: "Hole In One", description: "", created: true });
            expect(store.calls.insert[0][0]).to.deep.equal({ id: "hole-in-one", name: "Hole In One", description: "" });
        });

        it("create returns an existing tag with the same name instead of duplicating it", async () => {
            const { service, store } = setup([{ id: "golf", name: "Golf", description: "x" }]);

            expect(await service.create({ name: "Golf", description: "" })).to.deep.equal({ id: "golf", name: "Golf", description: "x", created: false });
            expect(store.calls.insert).to.have.length(0);
        });

        it("listAsOptions maps every tag", async () => {
            expect(await setup().service.listAsOptions()).to.deep.equal([{ label: "Golf", value: "golf" }]);
        });
    });
});
