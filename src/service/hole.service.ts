import type { HoleDto } from "../dto/golf.dto";
import { HoleMapper, holeMapper } from "../mapper/hole.mapper";
import type { WriteResult } from "../mapper/types";
import { slugify } from "../utils/slug";
import { ListParams, sortDirection, toPage } from "../validators/list.validator";

type HoleStore = Pick<HoleMapper, "insert" | "update" | "findPage" | "findNeedingTeamsAsOptions">;

/** Hole management for the admin screens. */
export class HoleService {
    constructor(private readonly holes: HoleStore) {}

    public list(params: ListParams) {
        return this.holes.findPage(toPage(params), sortDirection(params.order));
    }

    public listNeedingTeamsAsOptions() {
        return this.holes.findNeedingTeamsAsOptions();
    }

    /** Create a hole; its id is derived from the name ("Hole 18" -> "hole-18"). */
    public async create(dto: HoleDto): Promise<{ id: string }> {
        const id = slugify(dto.name);
        await this.holes.insert({ id, name: dto.name, par: dto.par ?? "" });
        return { id };
    }

    public update(id: string, changes: HoleDto): Promise<WriteResult> {
        return this.holes.update(id, changes);
    }
}

export const holeService = new HoleService(holeMapper);
