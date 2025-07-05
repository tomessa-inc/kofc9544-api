import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, date, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";

// Define your schema
export const calendar = mysqlTable('calendar', {
    id:  varchar('id', { length: 36 }).primaryKey(),
    day: int('day').notNull(),
    month: int('month').notNull(),
    year: int('year').notNull(),
    EventId: varchar('EventId', {length: 255}).notNull(),
    createdAt: date('createdAt').notNull(),
    updatedAt: date('updatedAt').notNull(),
})