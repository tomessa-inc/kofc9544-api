import { expect } from "chai";
import { BadRequestError } from "../../../errors";
import { validateGalleryUpdate, validateImageUpdate, validateOrder, validateTag } from "../../../validators/media.validator";

describe("media validators", () => {
    it("validateGalleryUpdate normalizes tag ids and defaults to no tags", () => {
        expect(validateGalleryUpdate({ description: " Summer ", tags: ["a", 2] })).to.deep.equal({ description: "Summer", tags: ["a", "2"] });
        expect(validateGalleryUpdate({})).to.deep.equal({ tags: [] });
        expect(() => validateGalleryUpdate({ tags: [{}] })).to.throw(BadRequestError);
    });

    it("validateImageUpdate accepts description and a 0/1 primaryImage", () => {
        expect(validateImageUpdate({ description: "x", primaryImage: "0", key: "evil" })).to.deep.equal({ description: "x", primaryImage: 0 });
        expect(() => validateImageUpdate({ primaryImage: 2 })).to.throw(BadRequestError, "primaryImage must be 0 or 1");
        expect(() => validateImageUpdate({})).to.throw(BadRequestError, "Nothing to update");
    });

    it("validateTag requires a name", () => {
        expect(validateTag({ name: "Golf", id: "golf" })).to.deep.equal({ name: "Golf", description: "", id: "golf" });
        expect(() => validateTag({})).to.throw(BadRequestError, "Missing name");
    });

    it("validateOrder accepts non-negative integers", () => {
        expect(validateOrder("0")).to.equal(0);
        for (const bad of ["-1", "1.5", "x", undefined]) expect(() => validateOrder(bad)).to.throw(BadRequestError);
    });
});
