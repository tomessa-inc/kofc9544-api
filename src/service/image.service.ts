import type { ImageUpdateDto } from "../dto/media.dto";
import { NotFoundError } from "../errors";
import { ImageMapper, imageMapper } from "../mapper/image.mapper";
import type { WriteResult } from "../mapper/types";
import { ListParams, toPage } from "../validators/list.validator";
import { imageUrl, THUMBNAIL } from "../views/image-url";

type ImageStore = Pick<ImageMapper, "findById" | "update" | "setOrder" | "findActiveInGallery" | "deactivate" | "findPage" | "findPrimary" | "findByGallery">;

/** Gallery images. */
export class ImageService {
    constructor(private readonly images: ImageStore) {}

    public list(params: ListParams) {
        return this.images.findPage(toPage(params));
    }

    public listByGallery(galleryId: string, params: ListParams) {
        return this.images.findByGallery(galleryId, toPage(params));
    }

    /** Each gallery's primary image with a thumbnail URL; private galleries only for signed-in members. */
    public async listPrimary(signedIn: boolean) {
        const images = await this.images.findPrimary({ includePrivate: signedIn });
        return images.map((row) => ({ ...row, key: imageUrl(row.key, THUMBNAIL) }));
    }

    public async get(id: string) {
        const found = await this.images.findById(id);
        if (!found) throw new NotFoundError("Image not found");
        return found;
    }

    public update(id: string, changes: ImageUpdateDto): Promise<WriteResult> {
        return this.images.update(id, changes);
    }

    public setOrder(galleryId: string, id: string, order: number): Promise<WriteResult> {
        return this.images.setOrder(galleryId, id, order);
    }

    /** Renumber a gallery's active images 0..n-1 in their current order, closing any gaps. */
    public async renumber(galleryId: string) {
        const images = await this.images.findActiveInGallery(galleryId);
        for (const [index, { id }] of images.entries()) {
            await this.images.setOrder(galleryId, id, index);
        }
        return images.map(({ id }, index) => ({ id, order: index }));
    }

    /** Hide an image (it stays in storage and the database). */
    public delete(id: string): Promise<WriteResult> {
        return this.images.deactivate(id);
    }
}

export const imageService = new ImageService(imageMapper);
