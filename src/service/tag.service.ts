import type { TagDto } from "../dto/media.dto";
import { TagMapper, tagMapper, type Tag } from "../mapper/tag.mapper";
import type { LabelValue } from "../mapper/types";
import { slugify } from "../utils/slug";
import { ListParams, toPage } from "../validators/list.validator";

type TagStore = Pick<TagMapper, "findPage" | "findAll" | "findByName" | "insert">;

/** Gallery tags. */
export class TagService {
    constructor(private readonly tags: TagStore) {}

    public list(params: ListParams) {
        return this.tags.findPage(toPage(params));
    }

    /** Every tag as a select option. */
    public async listAsOptions(): Promise<LabelValue[]> {
        return (await this.tags.findAll()).map((t) => ({ label: t.name, value: t.id }));
    }

    /** Create a tag, or return the existing one with the same name. */
    public async create(dto: TagDto): Promise<Tag & { created: boolean }> {
        const [existing] = await this.tags.findByName(dto.name);
        if (existing) return { ...existing, created: false };

        const tag = { id: dto.id ?? slugify(dto.name), name: dto.name, description: dto.description };
        await this.tags.insert(tag);
        return { ...tag, created: true };
    }
}

export const tagService = new TagService(tagMapper);
