import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Issued tokens: a member's login sessions and password-reset links, distinguished by eventType. */
export const userAuthentication = mysqlTable("user_authentication", {
    UserId: varchar("UserId", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    eventType: varchar("eventType", { length: 255 }).notNull(),
});
