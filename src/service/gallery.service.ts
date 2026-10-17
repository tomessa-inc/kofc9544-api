import type { GalleryUpdateDto } from "../dto/media.dto";
import { NotFoundError } from "../errors";
import { GalleryMapper, galleryMapper } from "../mapper/gallery.mapper";
import type { LabelValue } from "../mapper/types";
import { ListParams, toPage } from "../validators/list.validator";
import { CdnService, cdnService } from "./cdn.service";

type GalleryStore = Pick<GalleryMapper, "findPage" | "findById" | "setDescription" | "replaceTags">;

/** Photo galleries. */
export class GalleryService {
    constructor(
        private readonly galleries: GalleryStore,
        private readonly cdn: Pick<CdnService, "invalidate">,
    ) {}

    public list(params: ListParams) {
        return this.galleries.findPage(toPage(params));
    }

    /** A gallery with its tags as select options. */
    public async get(id: string): Promise<{ id: string; name: string; viewing: boolean; Tags: LabelValue[] }> {
        const found = await this.galleries.findById(id);
        if (!found) throw new NotFoundError("Gallery not found");
        return { ...found, Tags: (found.Tags ?? []).map((t) => ({ label: t.name, value: t.id })) };
    }

    public async update(id: string, changes: GalleryUpdateDto): Promise<void> {
        if (changes.description !== undefined) {
            await this.galleries.setDescription(id, changes.description);
        }
        await this.galleries.replaceTags(id, changes.tags);
    }

    /** Make gallery changes visible by clearing the CDN's cached media pages. */
    public publish(): Promise<boolean> {
        return this.cdn.invalidate("/media/*");
    }
}

export const galleryService = new GalleryService(galleryMapper, cdnService);
