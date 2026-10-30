import type { Page } from "../mapper/types";

export interface ListParams {
    pageIndex: number;
    pageSize: number;
    sort: string;
    order: string;
    filterQuery: string;
    [key: string]: string | number;
}

const DEFAULTS = { pageIndex: 1, pageSize: 10, sort: "name", order: "ASC", filterQuery: "" };

/**
 * Route params for list endpoints, with numeric values converted and absent/"undefined" segments
 * replaced by defaults. Any other route params (e.g. :id) are passed through.
 */
export function parseListParams(params: Record<string, string | undefined>, defaults: Partial<ListParams> = {}): ListParams {
    const options: ListParams = { ...DEFAULTS, ...defaults } as ListParams;

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === "undefined" || value === "") continue;
        options[key] = Number.isNaN(Number(value)) ? value : Number(value);
    }

    options.pageIndex = Math.max(1, Math.trunc(Number(options.pageIndex)) || 1);
    options.pageSize = Math.max(1, Math.trunc(Number(options.pageSize)) || DEFAULTS.pageSize);
    return options;
}

/** SQL paging for the list params. */
export function toPage({ pageIndex, pageSize }: Pick<ListParams, "pageIndex" | "pageSize">): Page {
    return { offset: (pageIndex - 1) * pageSize, limit: pageSize };
}

/** "asc" when the client asked for ascending (any case), otherwise "desc". */
export function sortDirection(order: string | number | undefined): "asc" | "desc" {
    return String(order).toLowerCase() === "asc" ? "asc" : "desc";
}
