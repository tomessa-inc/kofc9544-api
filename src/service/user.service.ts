import * as uuid from "uuid";
import type { SignUpDto, UserUpdateDto } from "../dto/user.dto";
import { ConflictError, NotFoundError } from "../errors";
import { UserFilters, UserMapper, userMapper } from "../mapper/user.mapper";
import type { WriteResult } from "../mapper/types";
import { ListParams, toPage } from "../validators/list.validator";
import { PasswordService, passwordService } from "./password.service";

type UserStore = Pick<UserMapper, "findPage" | "findById" | "findByUserNameOrEmail" | "insert" | "update">;
type Passwords = Pick<PasswordService, "hash">;

/** Member administration. */
export class UserService {
    constructor(
        private readonly users: UserStore,
        private readonly passwords: Passwords,
    ) {}

    public list(params: ListParams, filters: UserFilters = {}) {
        return this.users.findPage(toPage(params), { name: params.filterQuery ? String(params.filterQuery) : undefined, ...filters });
    }

    public async get(id: string) {
        const user = await this.users.findById(id);
        if (!user) throw new NotFoundError("User not found");
        return user;
    }

    /** Update a member; a new password is stored hashed. */
    public async update(id: string, changes: UserUpdateDto): Promise<WriteResult> {
        const { password, ...rest } = changes;
        return this.users.update(id, password === undefined ? rest : { ...rest, password: await this.passwords.hash(password) });
    }

    public async signUp(dto: SignUpDto): Promise<{ id: string }> {
        if ((await this.users.findByUserNameOrEmail(dto.username, dto.email)).length > 0) {
            throw new ConflictError("Username already exists");
        }

        const id = uuid.v4();
        await this.users.insert({
            id,
            userName: dto.username,
            email: dto.email,
            password: await this.passwords.hash(dto.password),
            firstName: dto.firstName ?? "",
            lastName: dto.lastName ?? "",
        });
        return { id };
    }
}

export const userService = new UserService(userMapper, passwordService);
