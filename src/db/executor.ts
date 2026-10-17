import axios from "axios";
import { config } from "../config";

/** Anything Drizzle can turn into SQL: every query builder (select/insert/update/delete) qualifies. */
export interface SqlQuery {
    toSQL(): { sql: string; params: unknown[] };
}

/** Executes a built query and returns the driver result (rows for SELECT, a result header for writes). */
export interface QueryExecutor {
    run<T = any>(query: SqlQuery): Promise<T>;
}

type HttpPost = (url: string, body: unknown) => Promise<{ data: any }>;

/**
 * Runs queries through the RDS SQL proxy over HTTP: the proxy receives the prepared statement as a
 * JSON string under `sql` and answers with mysql2's `[rows, fields]` tuple under `data`.
 * Unlike the legacy BaseMapper.getSQLData, failures are thrown, never swallowed.
 */
export class RdsProxyExecutor implements QueryExecutor {
    constructor(
        private readonly url: () => string = () => config.sqlProxyUrl,
        private readonly post: HttpPost = (url, body) => axios.post(url, body),
    ) {}

    public async run<T = any>(query: SqlQuery): Promise<T> {
        const { sql, params } = query.toSQL();
        // Collapse the newlines/indentation of multi-line sql`` fragments; params are sent untouched.
        const statement = { sql: sql.replace(/\s*\n\s*/g, " "), params };

        const response = await this.post(this.url(), { sql: JSON.stringify(statement) });
        return response.data.data[0] as T;
    }
}

export const sqlExecutor: QueryExecutor = new RdsProxyExecutor();
