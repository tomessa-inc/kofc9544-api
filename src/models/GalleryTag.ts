import { mysqlTable, varchar } from "drizzle-orm/mysql-core";

/** Which tags each gallery has. */
export const galleryTag = mysqlTable("gallery_tag", {
    GalleryId: varchar("GalleryId", { length: 255 }).notNull(),
    TagId: varchar("TagId", { length: 255 }).notNull(),
});
