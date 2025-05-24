import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const userAuthentication = mysqlTable('user_authentication', {
    id: varchar('id', {length: 45}).primaryKey(),
    UserId: varchar('UserId', {length: 255}).notNull(),
    token: varchar('token', {length: 255}).notNull(),
    eventType: varchar('eventType', {length: 255}).notNull(),

//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})