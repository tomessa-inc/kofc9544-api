import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "crypto";

export interface ScryptParams {
    /** CPU/memory cost (a power of two). */
    N: number;
    r: number;
    p: number;
}

/** OWASP's recommended scrypt settings (about 128 MiB per hash; the Lambda function has 2 GiB). */
export const DEFAULT_SCRYPT: ScryptParams = { N: 2 ** 17, r: 8, p: 1 };

const PREFIX = "scrypt";
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Minimum length for a new password (existing passwords still log in whatever their length). */
export const MIN_PASSWORD_LENGTH = 8;

function derive(password: string, salt: Buffer, { N, r, p }: ScryptParams): Promise<Buffer> {
    const options: ScryptOptions = { N, r, p, maxmem: 2 * 128 * N * r * p };
    return new Promise((resolve, reject) =>
        scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key))),
    );
}

/** Constant-time comparison of two strings of any length. */
function sameText(a: string, b: string): boolean {
    const digest = (value: string) => createHash("sha256").update(value).digest();
    return timingSafeEqual(digest(a), digest(b));
}

/**
 * Hashes and verifies member passwords. Hashes are self-describing
 * ("scrypt$N$r$p$<salt>$<key>", base64), so the cost can be raised without invalidating old ones.
 */
export class PasswordService {
    constructor(private readonly params: ScryptParams = DEFAULT_SCRYPT) {}

    public async hash(password: string): Promise<string> {
        const salt = randomBytes(SALT_LENGTH);
        const key = await derive(password, salt, this.params);
        const { N, r, p } = this.params;
        return [PREFIX, N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
    }

    /** Whether a stored value is one of our hashes (as opposed to a legacy plain-text password). */
    public isHash(stored: string): boolean {
        return stored.startsWith(`${PREFIX}$`);
    }

    /**
     * Check a password against a stored value. Legacy plain-text values are still accepted (compared in
     * constant time) so members can sign in while their passwords are being migrated.
     */
    public async verify(password: string, stored: string): Promise<boolean> {
        if (!this.isHash(stored)) return sameText(password, stored);

        const [, N, r, p, salt, key] = stored.split("$");
        const expected = Buffer.from(key ?? "", "base64");
        if (!salt || expected.length !== KEY_LENGTH) return false;

        const actual = await derive(password, Buffer.from(salt, "base64"), { N: Number(N), r: Number(r), p: Number(p) });
        return timingSafeEqual(actual, expected);
    }

    /** Whether a stored value should be re-hashed: plain text, or hashed with weaker settings. */
    public needsRehash(stored: string): boolean {
        if (!this.isHash(stored)) return true;
        const [, N, r, p] = stored.split("$").map(Number);
        return N !== this.params.N || r !== this.params.r || p !== this.params.p;
    }
}

export const passwordService = new PasswordService();
