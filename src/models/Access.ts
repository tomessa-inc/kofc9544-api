import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const access = mysqlTable('access', {
    id: varchar('id', {length: 30}).primaryKey(),
    name: varchar('name', {length: 50}).notNull(),
    description: varchar('description', {length: 50}).notNull(),
//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})