import { expect } from "chai";
import { BadRequestError } from "../../../errors";
import { MissingCredentialsError } from "../../../errors/auth.errors";
import { validateAccess, validateEmail, validateLogin, validateSignUp, validateUserPatch, validateUserUpdate } from "../../../validators/user.validator";

describe("user validators", () => {
    it("validateLogin trims the username but not the password", () => {
        expect(validateLogin({ username: " tom@x.ca ", password: " pw " })).to.deep.equal({ username: "tom@x.ca", password: " pw " });
    });

    it("validateLogin throws MissingCredentialsError without both fields", () => {
        for (const body of [undefined, {}, { username: "tom" }, { password: "pw" }, { username: "tom", password: "" }]) {
            expect(() => validateLogin(body)).to.throw(MissingCredentialsError);
        }
    });

    it("validateEmail requires an email", () => {
        expect(validateEmail({ email: "a@x.ca" })).to.equal("a@x.ca");
        expect(() => validateEmail({})).to.throw(BadRequestError, "Missing email");
    });

    it("validateUserPatch requires id and user and keeps only editable fields", () => {
        expect(validateUserPatch({ id: "u1", user: { email: "e", phone: "1", id: "x" } })).to.deep.equal({ id: "u1", changes: { email: "e" } });
        expect(() => validateUserPatch({ id: "u1" })).to.throw(BadRequestError, "Missing parameters to access this function");
        expect(() => validateUserPatch({ id: "u1", user: { phone: "1" } })).to.throw(BadRequestError, "Nothing to update");
    });

    it("validateUserUpdate keeps only editable fields", () => {
        expect(validateUserUpdate({ firstName: "Tom", password: " long pass ", token: "t" })).to.deep.equal({ firstName: "Tom", password: " long pass " });
    });

    it("new passwords are kept exactly as typed and must be at least 8 characters", () => {
        expect(() => validateUserUpdate({ password: "short" })).to.throw(BadRequestError, "Password must be at least 8 characters");
        expect(() => validateSignUp({ username: "tom", email: "e", password: "short" })).to.throw(BadRequestError, "Password must be at least 8 characters");
        expect(validateUserUpdate({ firstName: "Tom", password: "" })).to.deep.equal({ firstName: "Tom" });
    });

    it("validateSignUp and validateAccess require their fields", () => {
        expect(validateSignUp({ username: "tom", email: "e", password: "long enough" })).to.include({ username: "tom", email: "e", password: "long enough" });
        expect(() => validateSignUp({ username: "tom" })).to.throw(BadRequestError, "Missing required fields");
        expect(validateAccess({ name: "Admin", description: "d" })).to.include({ name: "Admin", description: "d" });
        expect(() => validateAccess({ name: "Admin" })).to.throw(BadRequestError);
    });
});
