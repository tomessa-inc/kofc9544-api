import { int, mysqlTable, tinyint, varchar } from "drizzle-orm/mysql-core";

export const image = mysqlTable("image", {
    id: varchar("id", { length: 36 }).primaryKey(),
    /** S3 object key; clients get CDN URLs built from it. */
    key: varchar("key", { length: 255 }).notNull(),
    GalleryId: varchar("GalleryId", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    primaryImage: tinyint("primaryImage"),
    description: varchar("description", { length: 255 }),
    /** 1 = shown, 0 = soft-deleted. */
    active: int("active"),
    orientation: int("orientation"),
    order: int("order"),
});
