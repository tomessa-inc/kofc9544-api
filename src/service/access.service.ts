import type { AccessDto } from "../dto/user.dto";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { Access, AccessMapper, accessMapper } from "../mapper/access.mapper";
import type { LabelValue } from "../mapper/types";
import { UserAccessMapper, userAccessMapper } from "../mapper/user-access.mapper";
import { slugify } from "../utils/slug";
import { ListParams, toPage } from "../validators/list.validator";
import { authService } from "./auth.service";

type AccessStore = Pick<AccessMapper, "findAll" | "findPage" | "findByIdOrName" | "insert" | "update" | "delete">;
type AssignmentStore = Pick<UserAccessMapper, "deleteByAccess">;

/** Looks up the member a session token belongs to (AuthService in production). */
export interface RoleHolderLookup {
    currentUser(token: string | null): Promise<{ roles: string[] | string | null } | null>;
}

/** Roles that may create, rename and delete roles. */
export const ROLE_MANAGERS = ["access", "admin"];

/** Longest role id `access.id` holds. */
export const MAX_ACCESS_ID = 25;

/** A member's role ids, whether the SQL proxy sent JSON_ARRAYAGG as an array or as JSON text. */
export function roleIdsOf(roles: string[] | string | null | undefined): string[] {
    if (Array.isArray(roles)) return roles;
    if (typeof roles !== "string") return [];
    try {
        const parsed: unknown = JSON.parse(roles);
        return Array.isArray(parsed) ? parsed.filter((role): role is string => typeof role === "string") : [];
    } catch {
        return [];
    }
}

/** Access-role administration. */
export class AccessService {
    constructor(
        private readonly roles: AccessStore,
        private readonly assignments: AssignmentStore,
        private readonly members: RoleHolderLookup,
    ) {}

    /** Every role, for the admin role list. */
    public listAll(): Promise<Access[]> {
        return this.roles.findAll();
    }

    public list(params: ListParams) {
        return this.roles.findPage(toPage(params));
    }

    public async listAsOptions(params: ListParams): Promise<LabelValue[]> {
        return (await this.roles.findPage(toPage(params))).map((role) => ({ label: role.name, value: role.id }));
    }

    /** Create a role whose id is the slug of its name. */
    public async create(dto: AccessDto, token: string | null): Promise<Access> {
        await this.requireManager(token);

        const id = slugify(dto.name);
        if (id.length > MAX_ACCESS_ID) throw new BadRequestError(`Role name must be ${MAX_ACCESS_ID} characters or fewer`);
        if ((await this.roles.findByIdOrName(id, dto.name)).length > 0) {
            throw new ConflictError("Access already exists");
        }

        const role = { id, name: dto.name, description: dto.description };
        await this.roles.insert(role);
        return role;
    }

    /** Rename a role or change its description; its id (and so every assignment) stays the same. */
    public async update(id: string, dto: AccessDto, token: string | null): Promise<Access> {
        await this.requireManager(token);

        const role = { id, name: dto.name, description: dto.description };
        await this.roles.update(id, { name: role.name, description: role.description });
        return role;
    }

    /** Delete a role and take it away from every member who has it. */
    public async delete(id: string, token: string | null): Promise<void> {
        await this.requireManager(token);

        const { affectedRows } = await this.roles.delete(id);
        if (affectedRows === 0) throw new NotFoundError("Role not found");
        await this.assignments.deleteByAccess(id);
    }

    private async requireManager(token: string | null): Promise<void> {
        const member = await this.members.currentUser(token);
        if (!member) throw new UnauthorizedError("Invalid or expired token");
        if (!roleIdsOf(member.roles).some((role) => ROLE_MANAGERS.includes(role))) {
            throw new ForbiddenError("You do not have permission to manage roles");
        }
    }
}

export const accessService = new AccessService(accessMapper, userAccessMapper, authService);
