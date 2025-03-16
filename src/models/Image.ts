
import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp, tinyint } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";
import { sql } from "drizzle-orm";
import {galleryTag} from "./GalleryTag"

// Define your schema
export const image = mysqlTable('image', {
    id:  varchar('id', { length: 36 }).primaryKey(),
    key: varchar('key', {length: 255}).notNull(),
    GalleryId: varchar('GalleryId', {length: 255}).notNull(),
    name: varchar('name', {length: 255}).notNull(),
    primaryImage: tinyint('primaryImage'),
    description: varchar('description', {length: 255}),
    active: int('active'),
    orientation: int('orientation'),
    order: int('order'),
//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})

