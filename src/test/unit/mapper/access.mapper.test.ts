import { expect } from "chai";
import { accessMapper } from "../../../mapper";
import { Access2 } from "../../../models/Access2";
import { UserAccess2 } from "../../../models/UserAccess2";
import { stubMethod, stubSQL } from "../helpers/sql-stub";

describe("AccessMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    describe("apiUpdateUser", () => {
        it("updates the access row and resolves true", async () => {
            const update = track(stubMethod(Access2 as any, "update", async () => [1]));

            const result = await accessMapper.apiUpdateUser({ id: 5, user: { name: "admin", teams: [] } });

            expect(result).to.equal(true);
            expect(update.calls[0]).to.deep.equal([{ name: "admin", teams: [] }, { where: { id: 5 } }]);
        });

        it("resolves false when the update rejects", async () => {
            track(stubMethod(Access2 as any, "update", async () => { throw new Error("fail"); }));

            expect(await accessMapper.apiUpdateUser({ id: 5, user: { teams: [] } })).to.equal(false);
        });
    });

    describe("apiCreateAccess", () => {
        it("finds or creates the access by name", async () => {
            const findOrCreate = track(stubMethod(Access2 as any, "findOrCreate", async () => [{ id: "a1" }, true]));

            const result = await accessMapper.apiCreateAccess({ id: "a1", name: "admin", description: "Admins" });

            expect(result).to.deep.equal([{ id: "a1" }, true]);
            expect(findOrCreate.calls[0][0].where).to.deep.equal({ name: "admin" });
            expect(findOrCreate.calls[0][0].defaults).to.include({ id: "a1", name: "admin", description: "Admins" });
        });
    });

    describe("apiDeleteAccess", () => {
        it("removes every access row for the user", async () => {
            const destroy = track(stubMethod(UserAccess2 as any, "destroy", async () => 2));

            expect(await accessMapper.apiDeleteAccess(9)).to.equal(2);
            expect(destroy.calls[0]).to.deep.equal([{ where: { UserId: 9 } }]);
        });
    });

    describe("apiAddAccess", () => {
        it("links the user to the access", async () => {
            const findOrCreate = track(stubMethod(UserAccess2 as any, "findOrCreate", async () => [{}, true]));

            await accessMapper.apiAddAccess(9, "admin");

            expect(findOrCreate.calls[0][0].where).to.include({ UserId: 9, AccessId: "admin" });
        });
    });

    describe("getUserBasedOnPassword", () => {
        it("returns the first matching row", async () => {
            const findOrCreate = track(stubMethod(Access2 as any, "findOrCreate", async () => [{ id: 1 }, false]));

            const result = await accessMapper.getUserBasedOnPassword({ userName: "tom", password: "secret" });

            expect(result).to.deep.equal({ id: 1 });
            expect(findOrCreate.calls[0][0].where).to.deep.equal({ password: "secret", userName: "tom" });
        });
    });

    describe("getAllAccess", () => {
        it("paginates the access table", async () => {
            const db = track(stubSQL(accessMapper, [{ id: "admin" }]));

            const result = await accessMapper.getAllAccess({ pageIndex: 2, pageSize: 5 });

            expect(result).to.deep.equal([{ id: "admin" }]);
            expect(db.last.sql).to.include("from `access`");
            expect(db.last.params).to.deep.equal([5, 5]);
        });
    });

    describe("getters", () => {
        it("exposes param names", () => {
            expect(accessMapper.PARAMS_ID).to.equal("id");
            expect(accessMapper.PARAMS_EMAIL).to.equal("email");
            expect(accessMapper.PARAMS_NAME).to.equal("name");
            expect(accessMapper.PARAMS_DESCRIPTION).to.equal("description");
            expect(accessMapper.LIST_NAME).to.equal("users");
            expect(accessMapper.DEFAULT_SORT).to.equal("username");
        });
    });
});
