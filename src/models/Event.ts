import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, date, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";

// Define your schema
export const event = mysqlTable('event', {
    id:  varchar('id', { length: 36 }).primaryKey(),
    hourStart: int('hourStart').notNull(),
    minuteStart: int('minuteStart').notNull(),
    hourEnd: int('hourEnd').notNull(),
    minuteEnd:int('minuteEnd').notNull(),
    text: varchar('text', {length: 255}).notNull(),
    description: varchar('description', {length: 255}).notNull(),
    createdAt: date('createdAt'),
    updatedAt: date('updatedAt'),
    viewing: boolean('viewing'),
})