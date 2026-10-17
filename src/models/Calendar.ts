import { date, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** One occurrence of an event on a calendar day. */
export const calendar = mysqlTable("calendar", {
    id: varchar("id", { length: 36 }).primaryKey(),
    day: int("day").notNull(),
    month: int("month").notNull(),
    year: int("year").notNull(),
    EventId: varchar("EventId", { length: 255 }).notNull(),
    createdAt: date("createdAt").notNull(),
    updatedAt: date("updatedAt").notNull(),
});
