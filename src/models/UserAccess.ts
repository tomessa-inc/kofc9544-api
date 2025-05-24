import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const userAccess = mysqlTable('user_access', {
    accessId: varchar('AccessId', {length: 255}).notNull(),
    userId: varchar('UserId', {length: 255}).notNull(),

//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})