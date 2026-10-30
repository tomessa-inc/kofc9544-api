import { expect } from "chai";
import { BadRequestError } from "../../../errors";
import {
    validateHole,
    validateNewPlayer,
    validateNewYear,
    validatePlayerUpdate,
    validateRegistration,
    validateTeamUpdate,
    validateYear,
} from "../../../validators/golf.validator";
import { validateNumericId, validateTextId } from "../../../validators/id.validator";
import { parseListParams, sortDirection, toPage } from "../../../validators/list.validator";

const badRequest = (fn: () => unknown, message: string) => {
    expect(fn).to.throw(BadRequestError, message);
};

describe("validators", () => {
    describe("validateRegistration", () => {
        it("normalizes a valid registration", () => {
            const dto = validateRegistration({
                team_name: " Eagles ",
                players: [{ player: " Jo ", email: "jo@x.ca", phone: 555, allergies: "nuts", extra: "ignored" }],
                payment: "100",
                member: "yes",
                admin: true,
            });

            expect(dto).to.deep.equal({
                team_name: "Eagles",
                players: [{ player: "Jo", email: "jo@x.ca", phone: "555", allergies: "nuts" }],
                payment: 100,
                member: "yes",
            });
        });

        it("rejects a missing body, no players, or a player without name/email", () => {
            badRequest(() => validateRegistration(undefined), "Missing request body");
            badRequest(() => validateRegistration({ players: [] }), "At least one player is required");
            badRequest(() => validateRegistration({ players: [{ player: "Jo" }] }), "Player 1 needs a name and email");
            badRequest(() => validateRegistration({ players: ["Jo"] }), "Player 1 is invalid");
        });

        it("rejects a non-numeric payment", () => {
            badRequest(() => validateRegistration({ players: [{ player: "Jo", email: "e" }], payment: "lots" }), "Invalid payment");
        });
    });

    describe("other golf validators", () => {
        it("validateNewPlayer requires name and email", () => {
            expect(validateNewPlayer({ name: "Jo", email: "e", TeamId: "eagles" })).to.deep.equal({ name: "Jo", email: "e", phone: "", TeamId: "eagles" });
            badRequest(() => validateNewPlayer({ email: "e" }), "Missing name");
        });

        it("validatePlayerUpdate and validateTeamUpdate keep only editable fields", () => {
            expect(validatePlayerUpdate({ name: "Jo", id: 9, payment: 1 })).to.deep.equal({ name: "Jo" });
            expect(validateTeamUpdate({ captain: "Jo", id: "x" })).to.deep.equal({ captain: "Jo" });
        });

        it("validateHole requires a name", () => {
            expect(validateHole({ name: "Hole 1", par: 4 })).to.deep.equal({ name: "Hole 1", par: "4" });
            badRequest(() => validateHole({ par: "4" }), "Missing name");
        });

        it("validateNumericId accepts positive integers only", () => {
            expect(validateNumericId("7")).to.equal(7);
            for (const bad of ["0", "-1", "1.5", "abc", undefined]) badRequest(() => validateNumericId(bad, "player id"), "Invalid player id");
        });

        it("validateTextId rejects missing and placeholder values", () => {
            expect(validateTextId("eagles")).to.equal("eagles");
            for (const bad of ["", "undefined", "null", undefined]) badRequest(() => validateTextId(bad, "team id"), "Missing team id");
        });
    });

    describe("list params", () => {
        it("applies defaults, converts numbers and ignores 'undefined' segments", () => {
            expect(parseListParams({ pageIndex: "2", pageSize: "undefined", sort: "name", order: "asc", id: "eagles" })).to.deep.equal({
                pageIndex: 2, pageSize: 10, sort: "name", order: "asc", filterQuery: "", id: "eagles",
            });
        });

        it("clamps nonsensical paging to page 1 / size 10", () => {
            expect(parseListParams({ pageIndex: "-3", pageSize: "0" })).to.include({ pageIndex: 1, pageSize: 10 });
        });

        it("accepts endpoint-specific defaults", () => {
            expect(parseListParams({}, { sort: "label" }).sort).to.equal("label");
        });

        it("toPage and sortDirection", () => {
            expect(toPage({ pageIndex: 3, pageSize: 25 })).to.deep.equal({ offset: 50, limit: 25 });
            expect(sortDirection("ASC")).to.equal("asc");
            expect(sortDirection("desc")).to.equal("desc");
            expect(sortDirection(undefined)).to.equal("desc");
        });
    });

    describe("validateNewYear", () => {
        it("reads the year from the body, as a number or string", () => {
            expect(validateNewYear({ year: 2027 })).to.deep.equal({ year: 2027 });
            expect(validateNewYear({ year: " 2027 " })).to.deep.equal({ year: 2027 });
        });

        it("rejects a missing body or year", () => {
            badRequest(() => validateNewYear(undefined), "Missing request body");
            badRequest(() => validateNewYear({}), "Invalid year");
        });
    });

    describe("validateYear", () => {
        it("accepts a four-digit year in range", () => {
            expect(validateYear("2026")).to.equal(2026);
        });

        it("rejects anything else", () => {
            for (const bad of ["1899", "2101", "20.5", "abc", "undefined", undefined]) badRequest(() => validateYear(bad), "Invalid year");
        });
    });
});
