import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const gallery = mysqlTable('gallery', {
    id:  varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', {length: 255}).notNull(),
    description: varchar('description', {length: 255}).notNull(),
    viewing: boolean().notNull(),
//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})