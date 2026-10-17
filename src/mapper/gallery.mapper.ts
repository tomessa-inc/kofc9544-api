import { eq, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { gallery } from "../models/Gallery";
import { galleryTag } from "../models/GalleryTag";
import type { Page, WriteResult } from "./types";

export interface GalleryTagRef {
    id: string;
    name: string;
}

// Correlated subquery: the outer gallery is named literally (see TeamMapper for why).
const galleryTags = sql<GalleryTagRef[] | null>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', tag.id, 'name', tag.name)) FROM gallery_tag INNER JOIN tag ON tag.id = gallery_tag.TagId WHERE gallery_tag.GalleryId = gallery.id)`;

/** Data access for galleries and their tags. */
export class GalleryMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    /** One page of galleries with their tags; every row carries the overall `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run<{ id: string; name: string; Tags: GalleryTagRef[] | null; total: number }[]>(
            db.select({
                id: gallery.id,
                name: gallery.name,
                Tags: galleryTags.as("Tags"),
                total: sql<number>`(SELECT count(*) FROM gallery)`.as("total"),
            }).from(gallery).offset(offset).limit(limit),
        );
    }

    public async findById(id: string) {
        const rows = await this.executor.run<{ id: string; name: string; Tags: GalleryTagRef[] | null; viewing: boolean }[]>(
            db.select({ id: gallery.id, name: gallery.name, Tags: galleryTags.as("Tags"), viewing: gallery.viewing })
                .from(gallery).where(eq(gallery.id, id)),
        );
        return rows[0];
    }

    public setDescription(id: string, description: string): Promise<WriteResult> {
        return this.executor.run(db.update(gallery).set({ description }).where(eq(gallery.id, id)));
    }

    /** Make `tagIds` the gallery's complete tag set. */
    public async replaceTags(id: string, tagIds: string[]): Promise<void> {
        await this.executor.run(db.delete(galleryTag).where(eq(galleryTag.GalleryId, id)));
        if (tagIds.length > 0) {
            await this.executor.run(db.insert(galleryTag).values(tagIds.map((TagId) => ({ GalleryId: id, TagId }))));
        }
    }
}

export const galleryMapper = new GalleryMapper();
