import type { QueryExecutor, SqlQuery } from "../../../db/executor";
import type { CapturedQuery } from "./sql-stub";

type Result = unknown | ((query: CapturedQuery, callIndex: number) => unknown);

/**
 * A QueryExecutor for mapper tests: records each query's SQL and params and returns `result`
 * (or the value of `result(query, index)`). Inject it through the mapper's constructor.
 */
export function fakeExecutor(result: Result = []) {
    const calls: CapturedQuery[] = [];

    const executor: QueryExecutor & { calls: CapturedQuery[]; readonly last: CapturedQuery } = {
        calls,
        get last() {
            return calls[calls.length - 1];
        },
        async run(query: SqlQuery) {
            const captured = query.toSQL();
            calls.push(captured);
            return (typeof result === "function" ? (result as Function)(captured, calls.length - 1) : result) as any;
        },
    };
    return executor;
}
