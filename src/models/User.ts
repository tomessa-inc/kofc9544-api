import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
    id: varchar("id", { length: 255 }).primaryKey(),
    firstName: varchar("firstName", { length: 255 }).notNull(),
    lastName: varchar("lastName", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("userName", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
});
