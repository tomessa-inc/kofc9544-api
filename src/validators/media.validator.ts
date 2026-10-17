import type { GalleryUpdateDto, ImageUpdateDto, TagDto } from "../dto/media.dto";
import { BadRequestError } from "../errors";

type Body = Record<string, unknown> | undefined;

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export function validateGalleryUpdate(body: Body): GalleryUpdateDto {
    const tags = body?.tags ?? [];
    if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string" || typeof t === "number")) {
        throw new BadRequestError("tags must be a list of tag ids");
    }
    const description = text(body?.description);
    return { tags: tags.map(String), ...(description !== undefined && { description }) };
}

export function validateImageUpdate(body: Body): ImageUpdateDto {
    const changes: ImageUpdateDto = {};
    const description = text(body?.description);
    if (description !== undefined) changes.description = description;
    if (body?.primaryImage !== undefined) {
        const primary = Number(body.primaryImage);
        if (primary !== 0 && primary !== 1) throw new BadRequestError("primaryImage must be 0 or 1");
        changes.primaryImage = primary;
    }
    if (Object.keys(changes).length === 0) throw new BadRequestError("Nothing to update");
    return changes;
}

export function validateTag(body: Body): TagDto {
    const name = text(body?.name);
    if (!name) throw new BadRequestError("Missing name");
    return { name, description: text(body?.description) ?? "", ...(text(body?.id) && { id: text(body?.id) }) };
}

/** A non-negative integer route segment (e.g. an image's position). */
export function validateOrder(value: string | undefined): number {
    const order = Number(value);
    if (!Number.isInteger(order) || order < 0) throw new BadRequestError("Invalid order");
    return order;
}
