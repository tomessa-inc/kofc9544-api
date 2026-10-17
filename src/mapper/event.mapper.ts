import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { event } from "../models/Event";
import { driverValues, type WriteResult } from "./types";

export interface NewEvent {
    id: string;
    hourStart: number;
    minuteStart: number;
    hourEnd: number;
    minuteEnd: number;
    text: string;
    description: string;
    viewing: boolean;
}

/** Data access for calendar events. */
export class EventMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    public insert(values: NewEvent): Promise<WriteResult> {
        return this.executor.run(db.insert(event).values(driverValues(values)));
    }
}

export const eventMapper = new EventMapper();
