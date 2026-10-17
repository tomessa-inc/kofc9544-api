import { and, eq, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { calendar } from "../models/Calendar";
import { event } from "../models/Event";
import type { WriteResult } from "./types";

export interface NewOccurrence {
    id: string;
    day: number;
    /** 1-12. */
    month: number;
    year: number;
    EventId: string;
}

/** Data access for event occurrences on the calendar. */
export class CalendarMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** Add an occurrence; one that already exists (same id) is left as it is. */
    public insertOccurrence(values: NewOccurrence): Promise<WriteResult> {
        return this.executor.run(
            db.insert(calendar).ignore().values({ ...values, createdAt: sql`CURDATE()`, updatedAt: sql`CURDATE()` }),
        );
    }

    /** A month's occurrences, each with its event's id, text and description. */
    public findByMonth(month: number, year: number) {
        return this.executor.run<Record<string, unknown>[]>(
            db.select({
                id: calendar.id,
                day: calendar.day,
                month: calendar.month,
                year: calendar.year,
                createdAt: calendar.createdAt,
                updatedAt: calendar.updatedAt,
                EventId: calendar.EventId,
                Event: sql<{ id: string; text: string; description: string }>`JSON_OBJECT('id', ${event.id}, 'text', ${event.text}, 'description', ${event.description})`.as("Event"),
            })
                .from(calendar)
                .innerJoin(event, eq(event.id, calendar.EventId))
                .where(and(eq(calendar.month, month), eq(calendar.year, year))),
        );
    }
}

export const calendarMapper = new CalendarMapper();
