import { expect } from "chai";
import axios from "axios";
import { BaseMapper } from "../../../mapper";
import { stubMethod } from "../helpers/sql-stub";

class TestMapper extends BaseMapper {
    public DEFAULT_SORT = "name";
}

describe("BaseMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);
    let mapper: TestMapper;

    beforeEach(() => {
        mapper = new TestMapper();
    });

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("generateId", () => {
        it("lowercases and hyphenates whitespace", () => {
            expect(mapper.generateId("The  Big Hitters")).to.equal("the-big-hitters");
        });
    });

    describe("prepareResults", () => {
        it("wraps data in the standard success envelope", () => {
            expect(mapper.prepareResults([{ id: 1 }] as any)).to.deep.equal({ code: 0, error: null, message: "ok", data: [{ id: 1 }] });
        });
    });

    describe("generatePagination", () => {
        const rows = () => [
            { name: "charlie", total: 3 },
            { name: "alpha", total: 3 },
            { name: "Bravo", total: 3 },
        ];

        it("sorts strings case-insensitively ascending by default and reports totals", () => {
            const result: any = mapper.generatePagination(rows() as any, { sort: "name", pageIndex: 1, pageSize: 10, listLength: 3 });

            expect(result.data.items.map((r) => r.name)).to.deep.equal(["alpha", "Bravo", "charlie"]);
            expect(result.data.total).to.equal(3);
            expect(result).to.include({ code: 0, message: "ok", total: "3", pageSize: "10", pageIndex: "1", lastpage: "1" });
        });

        it("sorts descending when order is desc", () => {
            const result: any = mapper.generatePagination(rows() as any, { sort: "name", order: "desc", listLength: 3 });

            expect(result.data.items.map((r) => r.name)).to.deep.equal(["charlie", "Bravo", "alpha"]);
        });

        it("sorts numerically on the default sort when no sort is requested", () => {
            const numeric = new (class extends BaseMapper { DEFAULT_SORT = "score"; })();
            const list = [{ score: 3, total: 3 }, { score: 1, total: 3 }, { score: 2, total: 3 }];

            const result: any = numeric.generatePagination(list as any, { listLength: 3 });

            expect(result.data.items.map((r) => r.score)).to.deep.equal([1, 2, 3]);
        });

        it("computes the last page from listLength and pageSize", () => {
            const result: any = mapper.generatePagination(rows() as any, { sort: "name", pageIndex: 1, pageSize: 2, listLength: 5 });

            expect(result.lastpage).to.equal("3");
        });

        it("reports a total of 0 for an empty list", () => {
            const result: any = mapper.generatePagination([] as any, { sort: "name", listLength: 0 });

            expect(result.data.total).to.equal(0);
        });

        it("prepareListResults delegates to generatePagination", () => {
            const result: any = mapper.prepareListResults(rows() as any, { sort: "name", listLength: 3 });

            expect(result.data.items).to.have.length(3);
        });
    });

    describe("processArray", () => {
        it("unwraps Sequelize instances and skips empty entries", async () => {
            const rows = [{ get: () => ({ id: 1 }) }, null, { get: () => ({ id: 2 }) }];

            expect(await mapper.processArray(rows)).to.deep.equal([{ id: 1 }, { id: 2 }]);
        });

        it("returns an empty array for an empty list", async () => {
            expect(await mapper.processArray([])).to.deep.equal([]);
        });
    });

    describe("getSQLData", () => {
        it("posts the SQL to the RDS proxy and returns the first result set", async () => {
            const post = track(stubMethod(axios, "post", async () => ({ data: { data: [[{ id: 1 }]] } })));

            const result = await mapper.getSQLData({ sql: "select 1", params: [] });

            expect(result).to.deep.equal([{ id: 1 }]);
            expect(post.calls[0][0]).to.equal(`${process.env.RDS_HOST}/${process.env.RDS_DB}`);
            expect(post.calls[0][1].sql).to.include("select 1");
        });

        it("resolves undefined when the request fails", async () => {
            track(stubMethod(axios, "post", async () => { throw new Error("ECONNREFUSED"); }));

            expect(await mapper.getSQLData({ sql: "select 1", params: [] })).to.equal(undefined);
        });
    });

    describe("sleep", () => {
        it("resolves after the delay", async () => {
            const start = Date.now();
            await mapper.sleep(20);
            expect(Date.now() - start).to.be.at.least(15);
        });

        it("returns a native Promise", () => {
            expect(mapper.sleep(0)).to.be.instanceOf(Promise);
        });
    });

    describe("initializeDrizzle", () => {
        it("sets up a Drizzle instance", async () => {
            await mapper.initializeDrizzle();

            expect(mapper.DRIZZLE).to.have.property("select").that.is.a("function");
        });
    });

    describe("getters", () => {
        it("exposes defaults", () => {
            expect(mapper.DEFAULT_ORDER).to.equal("ASC");
            expect(mapper.SEQUELIZE).to.equal(undefined);
        });
    });
});
