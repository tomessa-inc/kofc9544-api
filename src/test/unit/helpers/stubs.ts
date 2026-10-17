export interface CapturedQuery {
    sql: string;
    params: unknown[];
}

/**
 * Replaces a single method on an object, recording its arguments. Call restore() in afterEach.
 */
export function stubMethod<T extends object, K extends keyof T>(target: T, key: K, impl: (...args: any[]) => any = async () => undefined) {
    const calls: any[][] = [];
    const original = target[key];

    (target as any)[key] = (...args: any[]) => {
        calls.push(args);
        return impl(...args);
    };

    return {
        calls,
        restore: () => {
            target[key] = original;
        },
    };
}
