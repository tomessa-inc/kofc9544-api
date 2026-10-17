import * as uuid from "uuid";
import type { SignUpDto, UserUpdateDto } from "../dto/user.dto";
import { ConflictError, NotFoundError } from "../errors";
import { UserMapper, userMapper } from "../mapper/user.mapper";
import type { WriteResult } from "../mapper/types";
import { ListParams, toPage } from "../validators/list.validator";

type UserStore = Pick<UserMapper, "findPage" | "findById" | "findByUserNameOrEmail" | "insert" | "update">;

/** Member administration. */
export class UserService {
    constructor(private readonly users: UserStore) {}

    public list(params: ListParams) {
        return this.users.findPage(toPage(params), params.filterQuery || undefined);
    }

    public async get(id: string) {
        const user = await this.users.findById(id);
        if (!user) throw new NotFoundError("User not found");
        return user;
    }

    public update(id: string, changes: UserUpdateDto): Promise<WriteResult> {
        return this.users.update(id, changes);
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
            password: dto.password,
            firstName: dto.firstName ?? "",
            lastName: dto.lastName ?? "",
        });
        return { id };
    }
}

export const userService = new UserService(userMapper);
