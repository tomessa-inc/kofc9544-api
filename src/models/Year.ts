import { int, mysqlTable } from "drizzle-orm/mysql-core";

/** A tournament year that players can be active in. */
export const year = mysqlTable("year", {
    id: int("id").autoincrement().primaryKey(),
    year: int("year").notNull().unique(),
});
