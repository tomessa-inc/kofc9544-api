import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const hole = mysqlTable('hole', {
    id: varchar('id', {length: 25}).primaryKey(),
    name: varchar('name', {length: 255}).notNull(),
    par: varchar('par', {length: 255}).notNull(),

//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})