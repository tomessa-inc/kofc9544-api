import { UserMapper, userMapper } from "../mapper/user.mapper";
import { PasswordService, passwordService } from "./password.service";

type UserStore = Pick<UserMapper, "findUnhashedPasswords" | "setPassword">;

export interface MigrationReport {
    found: number;
    hashed: number;
    failed: string[];
}

/** One-off: hash every password still stored in plain text. Safe to re-run (hashed values are skipped). */
export class PasswordMigrationService {
    constructor(
        private readonly users: UserStore,
        private readonly passwords: Pick<PasswordService, "hash">,
    ) {}

    /** With apply false (a dry run) nothing is written; the report says what would change. */
    public async hashPlaintextPasswords({ apply }: { apply: boolean }): Promise<MigrationReport> {
        const pending = await this.users.findUnhashedPasswords();
        const report: MigrationReport = { found: pending.length, hashed: 0, failed: [] };
        if (!apply) return report;

        for (const { id, password } of pending) {
            try {
                await this.users.setPassword(id, await this.passwords.hash(password));
                report.hashed++;
            } catch (error) {
                console.error(`Could not hash the password of ${id}: ${error}`);
                report.failed.push(id);
            }
        }
        return report;
    }
}

export const passwordMigrationService = new PasswordMigrationService(userMapper, passwordService);
