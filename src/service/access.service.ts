import type { AccessDto } from "../dto/user.dto";
import { ConflictError } from "../errors";
import { AccessMapper, accessMapper } from "../mapper/access.mapper";
import type { LabelValue } from "../mapper/types";
import { ListParams, toPage } from "../validators/list.validator";

type AccessStore = Pick<AccessMapper, "findPage" | "findByName" | "insert">;

/** Access-role administration. */
export class AccessService {
    constructor(private readonly roles: AccessStore) {}

    public list(params: ListParams) {
        return this.roles.findPage(toPage(params));
    }

    public async listAsOptions(params: ListParams): Promise<LabelValue[]> {
        return (await this.roles.findPage(toPage(params))).map((role) => ({ label: role.name, value: role.id }));
    }

    public async create(dto: AccessDto): Promise<void> {
        if ((await this.roles.findByName(dto.name)).length > 0) {
            throw new ConflictError("Access already exists");
        }
        await this.roles.insert({ id: dto.id ?? dto.name.toLowerCase(), name: dto.name, description: dto.description });
    }
}

export const accessService = new AccessService(accessMapper);
