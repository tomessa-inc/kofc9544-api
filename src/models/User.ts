import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const user = mysqlTable('user', {
    id: varchar('id', {length: 255}).primaryKey(),
    firstName: varchar('firstName', {length: 255}).notNull(),
    lastName: varchar('lastName', {length: 255}).notNull(),
    email: varchar('email', {length: 255}).notNull(),
    userName: varchar('userName', {length: 255}).notNull(),
    password: varchar('password', {length: 255}).notNull(),

//    createdAt:timestamp().defaultNow(),
    //  updatedAt: timestamp().defaultNow(),
})