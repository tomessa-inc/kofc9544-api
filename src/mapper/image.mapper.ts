import { and, asc, eq, sql } from "drizzle-orm";
import { QueryExecutor, sqlExecutor } from "../db/executor";
import { db } from "../db/query-builder";
import { gallery } from "../models/Gallery";
import { image } from "../models/Image";
import type { Page, WriteResult } from "./types";

export type Image = typeof image.$inferSelect;
export interface ImageChanges {
    description?: string;
    primaryImage?: number;
}

const ACTIVE = 1;

// Correlated subqueries name the outer image row literally (see TeamMapper for why).
const imageGallery = sql<{ id: string; name: string } | null>`(SELECT JSON_OBJECT('id', gallery.id, 'name', gallery.name) FROM gallery WHERE gallery.id = image.GalleryId)`;

/** Data access for gallery images. Deleting an image only deactivates it. */
export class ImageMapper {
    constructor(private readonly executor: QueryExecutor = sqlExecutor) {}

    public async findById(id: string) {
        const rows = await this.executor.run<Record<string, unknown>[]>(
            db.select({
                id: image.id,
                key: image.key,
                name: image.name,
                primaryImage: image.primaryImage,
                gallery: imageGallery.as("gallery"),
            }).from(image).where(eq(image.id, id)),
        );
        return rows[0];
    }

    public update(id: string, changes: ImageChanges): Promise<WriteResult> {
        return this.executor.run(db.update(image).set(changes).where(eq(image.id, id)));
    }

    /** Set an image's position within its gallery. */
    public setOrder(galleryId: string, id: string, order: number): Promise<WriteResult> {
        return this.executor.run(db.update(image).set({ order }).where(and(eq(image.id, id), eq(image.GalleryId, galleryId))));
    }

    /** A gallery's active images in display order (ties broken by id so renumbering is stable). */
    public findActiveInGallery(galleryId: string) {
        return this.executor.run<{ id: string; order: number | null }[]>(
            db.select({ id: image.id, order: image.order }).from(image)
                .where(and(eq(image.GalleryId, galleryId), eq(image.active, ACTIVE)))
                .orderBy(asc(image.order), asc(image.id)),
        );
    }

    public deactivate(id: string): Promise<WriteResult> {
        return this.executor.run(db.update(image).set({ active: 0 }).where(eq(image.id, id)));
    }

    /** One page of active images; every row carries the active-image `total`. */
    public findPage({ offset, limit }: Page) {
        return this.executor.run<(Image & { total: number })[]>(
            db.select({
                id: image.id,
                key: image.key,
                GalleryId: image.GalleryId,
                name: image.name,
                primaryImage: image.primaryImage,
                description: image.description,
                active: image.active,
                orientation: image.orientation,
                order: image.order,
                total: sql<number>`(SELECT count(*) FROM image WHERE image.active = ${ACTIVE})`.as("total"),
            }).from(image).where(eq(image.active, ACTIVE)).offset(offset).limit(limit),
        );
    }

    /** Each gallery's primary images; visitors who are not signed in only see public galleries. */
    public findPrimary({ includePrivate }: { includePrivate: boolean }) {
        const primary = eq(image.primaryImage, 1);
        return this.executor.run<Record<string, any>[]>(
            db.select({
                id: image.id,
                key: image.key,
                GalleryId: image.GalleryId,
                name: gallery.name,
                primaryImage: image.primaryImage,
                description: image.description,
                active: image.active,
                orientation: image.orientation,
                order: image.order,
                TagsId: sql<{ TagId: string }[] | null>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('TagId', gallery_tag.TagId)) FROM gallery_tag WHERE gallery_tag.GalleryId = image.GalleryId)`.as("TagsId"),
            })
                .from(image)
                .innerJoin(gallery, eq(image.GalleryId, gallery.id))
                .where(includePrivate ? primary : and(primary, eq(gallery.viewing, true))),
        );
    }

    /** One page of a gallery's active images; every row carries that gallery's active-image `total`. */
    public findByGallery(galleryId: string, { offset, limit }: Page) {
        return this.executor.run<(Image & { total: number })[]>(
            db.select({
                id: image.id,
                key: image.key,
                active: image.active,
                GalleryId: image.GalleryId,
                name: image.name,
                description: image.description,
                primaryImage: image.primaryImage,
                orientation: image.orientation,
                order: image.order,
                total: sql<number>`(SELECT count(*) FROM image AS i WHERE i.GalleryId = ${galleryId} AND i.active = ${ACTIVE})`.as("total"),
                gallery: imageGallery.as("gallery"),
            }).from(image)
                .where(and(eq(image.GalleryId, galleryId), eq(image.active, ACTIVE)))
                .offset(offset).limit(limit),
        );
    }
}

export const imageMapper = new ImageMapper();
