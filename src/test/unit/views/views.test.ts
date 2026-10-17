import { expect } from "chai";
import { emailImages } from "../../../views/email-images";
import { imageUrl, THUMBNAIL } from "../../../views/image-url";

const decode = (url: string) => JSON.parse(Buffer.from(url.split("/").pop()!, "base64").toString());

describe("views", () => {
    it("imageUrl encodes bucket, key and edits into a CDN path", () => {
        const url = imageUrl("g1/a.png", THUMBNAIL);

        expect(url).to.match(/^https:\/\/images\.kofc9544\.ca\/[A-Za-z0-9+/=]+$/);
        expect(decode(url)).to.deep.equal({ bucket: "images.kofc9544.ca", key: "g1/a.png", edits: { resize: { width: 400, height: 400, fit: "inside" } } });
    });

    for (const [name, width, height] of [["logo100", 100, 100], ["logo200", 200, 200], ["banner", 600, 300]] as const) {
        it(`emailImages.${name} serves email/<file> covered to ${width}x${height}`, () => {
            expect(decode(emailImages[name]("logo.png"))).to.deep.equal({
                bucket: "images.kofc9544.ca",
                key: "email/logo.png",
                edits: { resize: { width, height, fit: "cover" } },
            });
        });
    }
});
