import { asc, eq, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { tag } from "../models/Tag";
import { driverValues, type Page, type WriteResult } from "./types";

export interface Tag {
    id: string;
    name: string;
    description: string;
}

const tagColumns = { id: tag.id, name: tag.name, description: tag.description };

/** Data access for gallery tags. */
export class TagMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** One page of tags; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run<(Tag & { total: number })[]>(
            db.select({ ...tagColumns, total: sql<number>`(SELECT count(*) FROM tag)`.as("total") })
                .from(tag).offset(offset).limit(limit),
        );
    }

    public findAll(): Promise<Tag[]> {
        return this.executor.run(db.select(tagColumns).from(tag).orderBy(asc(tag.name)));
    }

    public findByName(name: string): Promise<Tag[]> {
        return this.executor.run(db.select(tagColumns).from(tag).where(eq(tag.name, name)));
    }

    public insert(values: Tag): Promise<WriteResult> {
        return this.executor.run(db.insert(tag).values(driverValues({ ...values, createdAt: sql`NOW()`, updatedAt: sql`NOW()` })));
    }
}

export const tagMapper = new TagMapper();
