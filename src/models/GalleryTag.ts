
import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp, tinyint } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";
import { sql } from "drizzle-orm";

// Define your schema
export const galleryTag = mysqlTable('gallery_tag', {
    GalleryId:  varchar('GalleryId', { length: 255 }).notNull(),
    TagId: varchar('TagId', {length: 255}).notNull(),
})
