import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const team = mysqlTable('team', {
    id: varchar('id', {length: 25}).primaryKey(),
    name: varchar('name', {length: 255}).notNull(),
    captain: varchar('captain', {length: 255}).notNull(),

//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})