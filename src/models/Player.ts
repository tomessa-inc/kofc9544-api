import { boolean, datetime, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const player = mysqlTable("player", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 45 }),
    firstName: varchar("firstName", { length: 255 }),
    lastName: varchar("lastName", { length: 255 }),
    email: varchar("email", { length: 45 }),
    phone: varchar("phone", { length: 45 }),
    TeamId: varchar("TeamId", { length: 45 }),
    individual: boolean("individual"),
    allergies: varchar("allergies", { length: 45 }),
    payment: varchar("payment", { length: 45 }),
    member: varchar("member", { length: 45 }),
    createdAt: datetime("createdAt"),
    updatedAt: datetime("updatedAt"),
});
