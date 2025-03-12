import { drizzle } from 'drizzle-orm/mysql2';
import { mysqlTable, serial, varchar, int, boolean, DatetimeFsp, MySqlTimestamp, timestamp } from 'drizzle-orm/mysql-core';
import mysql from 'mysql2/promise';
import {DataTypes} from "../db";


// Define your schema
export const player = mysqlTable('player', {
    id: serial('id').primaryKey(),
    name: varchar('name', {length: 255}).notNull(),
    email: varchar('email', {length: 255}).notNull(),
    phone: varchar('phone', {length: 255}).notNull(),
    individual: varchar('individual', {length: 255}),
    TeamId: varchar('TeamId', {length: 255}),
    allergies: varchar('allergies', {length: 255}),
    payment: boolean('payment')
//    createdAt:timestamp().defaultNow(),
  //  updatedAt: timestamp().defaultNow(),
})