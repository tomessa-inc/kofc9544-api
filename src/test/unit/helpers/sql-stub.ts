export interface CapturedQuery {
    sql: string;
    params: unknown[];
}

type Result = unknown | ((query: CapturedQuery, callIndex: number) => unknown);

interface SQLExecutor {
    getSQLData: (preparedSQL: any, processKeyImage?: boolean) => Promise<any>;
}

/**
 * Replaces a mapper's getSQLData with a recorder so tests can assert the generated
 * SQL and bound params without a database. Call restore() in afterEach.
 */
export function stubSQL(mapper: SQLExecutor, result: Result = []) {
    const calls: CapturedQuery[] = [];
    const original = mapper.getSQLData;

    mapper.getSQLData = async (query: CapturedQuery) => {
        calls.push(query);
        return typeof result === "function" ? (result as Function)(query, calls.length - 1) : result;
    };

    return {
        calls,
        get last(): CapturedQuery {
            return calls[calls.length - 1];
        },
        restore: () => {
            mapper.getSQLData = original;
        },
    };
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
