import { defineHandler, type H3Event } from "h3";
import { handleError, ListOptions, usePagedListResponse } from "../utils/response";

/** A route handler whose thrown errors (domain or unexpected) become responses via handleError. */
export function controller(handler: (event: H3Event) => unknown) {
    return defineHandler(async (event) => {
        try {
            return await handler(event);
        } catch (error) {
            return handleError(event, error);
        }
    });
}

/** Paged list envelope for rows that carry an overall `total`; the page count is derived from it. */
export function pagedList<T extends Record<string, any>>(rows: T[], options: ListOptions, defaultSort: string) {
    const listLength = Array.isArray(rows) && rows.length > 0 ? Number(rows[0].total) : 0;
    return usePagedListResponse(rows, { ...options, listLength }, defaultSort);
}

/**
 * The id of the resource being updated: the URL's :id, or the body's id when a client sends the
 * literal "undefined"/"null" in the URL (older admin screens put the id only in the body).
 */
export function routeOrBodyId(routeId: string | undefined, body: Record<string, unknown> | undefined): string | undefined {
    if (routeId && routeId !== "undefined" && routeId !== "null") return routeId;
    const bodyId = body?.id;
    return typeof bodyId === "string" || typeof bodyId === "number" ? String(bodyId) : undefined;
}
