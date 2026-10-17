import { expect } from "chai";
import { PasswordMigrationService } from "../../../service/password-migration.service";
import { DEFAULT_SCRYPT, PasswordService } from "../../../service/password.service";

const fast = { N: 2 ** 10, r: 8, p: 1 };

describe("PasswordService", () => {
    const passwords = new PasswordService(fast);

    it("hashes to a self-describing scrypt string with a random salt", async () => {
        const first = await passwords.hash("correct horse");
        const second = await passwords.hash("correct horse");

        expect(first).to.match(/^scrypt\$1024\$8\$1\$[A-Za-z0-9+/]+=*\$[A-Za-z0-9+/]+=*$/);
        expect(first).to.not.equal(second);
        expect(first).to.not.include("correct horse");
    });

    it("verifies the right password and rejects the wrong one", async () => {
        const stored = await passwords.hash("correct horse");

        expect(await passwords.verify("correct horse", stored)).to.equal(true);
        expect(await passwords.verify("Correct horse", stored)).to.equal(false);
        expect(await passwords.verify("", stored)).to.equal(false);
    });

    it("verifies hashes made with other settings (the settings are read from the hash)", async () => {
        const stored = await new PasswordService({ N: 2 ** 11, r: 8, p: 2 }).hash("correct horse");

        expect(await passwords.verify("correct horse", stored)).to.equal(true);
    });

    it("accepts legacy plain-text values only when they match exactly", async () => {
        expect(await passwords.verify("legacy-pw", "legacy-pw")).to.equal(true);
        expect(await passwords.verify("legacy-p", "legacy-pw")).to.equal(false);
        expect(await passwords.verify("", "")).to.equal(true);
    });

    it("rejects malformed hashes instead of throwing", async () => {
        expect(await passwords.verify("x", "scrypt$1024$8$1$")).to.equal(false);
        expect(await passwords.verify("x", "scrypt$1024$8$1$c2FsdA==$dG9vc2hvcnQ=")).to.equal(false);
    });

    it("treats unicode compositions of the same password alike", async () => {
        const stored = await passwords.hash("café");

        expect(await passwords.verify("café", stored)).to.equal(true);
    });

    it("needsRehash is true for plain text and for weaker settings", async () => {
        expect(passwords.isHash("legacy")).to.equal(false);
        expect(passwords.needsRehash("legacy")).to.equal(true);
        expect(passwords.needsRehash(await passwords.hash("x"))).to.equal(false);
        expect(passwords.needsRehash(await new PasswordService({ N: 2 ** 9, r: 8, p: 1 }).hash("x"))).to.equal(true);
    });

    it("defaults to OWASP's recommended scrypt settings", () => {
        expect(DEFAULT_SCRYPT).to.deep.equal({ N: 131072, r: 8, p: 1 });
    });
});

describe("PasswordMigrationService", () => {
    function setup(pending = [{ id: "u1", password: "one" }, { id: "u2", password: "two" }], failFor?: string) {
        const writes: [string, string][] = [];
        const users = {
            findUnhashedPasswords: async () => pending,
            setPassword: async (id: string, hash: string) => {
                if (id === failFor) throw new Error("db down");
                writes.push([id, hash]);
                return { affectedRows: 1 };
            },
        };
        const passwords = new PasswordService(fast);
        return { service: new PasswordMigrationService(users, passwords), writes, passwords };
    }

    it("a dry run reports what would be hashed and writes nothing", async () => {
        const { service, writes } = setup();

        expect(await service.hashPlaintextPasswords({ apply: false })).to.deep.equal({ found: 2, hashed: 0, failed: [] });
        expect(writes).to.have.length(0);
    });

    it("apply replaces each plain-text password with a hash of it", async () => {
        const { service, writes, passwords } = setup();

        expect(await service.hashPlaintextPasswords({ apply: true })).to.deep.equal({ found: 2, hashed: 2, failed: [] });
        expect(writes.map(([id]) => id)).to.deep.equal(["u1", "u2"]);
        expect(await passwords.verify("one", writes[0][1])).to.equal(true);
        expect(await passwords.verify("two", writes[1][1])).to.equal(true);
    });

    it("keeps going past a failure and reports it", async () => {
        const { service, writes } = setup(undefined, "u1");

        expect(await service.hashPlaintextPasswords({ apply: true })).to.deep.equal({ found: 2, hashed: 1, failed: ["u1"] });
        expect(writes.map(([id]) => id)).to.deep.equal(["u2"]);
    });
});
