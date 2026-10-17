import { boolean, date, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const event = mysqlTable("event", {
    /** "<day>-<month>-<year>-<startHour>-<endHour>" of the first occurrence. */
    id: varchar("id", { length: 36 }).primaryKey(),
    hourStart: int("hourStart").notNull(),
    minuteStart: int("minuteStart").notNull(),
    hourEnd: int("hourEnd").notNull(),
    minuteEnd: int("minuteEnd").notNull(),
    text: varchar("text", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    createdAt: date("createdAt"),
    updatedAt: date("updatedAt"),
    /** Whether visitors who are not signed in see the event. */
    viewing: boolean("viewing"),
});
