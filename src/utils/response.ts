import type { EventHandlerRequest, H3Event } from 'h3';
import { AppError } from '../errors';

export function useResponseSuccess<T = any>(data: T) {
  return {
    code: 0,
    data,
    error: null,
    message: 'ok',
  };
}

export function usePageResponseSuccess<T = any>(
  page: number | string,
  pageSize: number | string,
  list: T[],
  { message = 'ok' } = {},
) {
  const pageData = pagination(
    Number.parseInt(`${page}`),
    Number.parseInt(`${pageSize}`),
    list,
  );

  return {
    ...useResponseSuccess({
      items: pageData,
      total: list.length,
    }),
    message,
  };
}

export function useResponseError(message: string, error: any = null) {
  return {
    code: -1,
    data: null,
    error,
    message,
  };
}

export function forbiddenResponse(
  event: H3Event<EventHandlerRequest>,
  message = 'Forbidden Exception',
) {
  event.res.status = 403;
  return useResponseError(message, message);
}

export function unAuthorizedResponse(event: H3Event<EventHandlerRequest>) {
  event.res.status = 401;
  return useResponseError('Unauthorized Exception', 'Unauthorized Exception');
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pagination<T = any>(
  pageNo: number,
  pageSize: number,
  array: T[],
): T[] {
  const offset = (pageNo - 1) * Number(pageSize);
  return offset + Number(pageSize) >= array.length
    ? array.slice(offset)
    : array.slice(offset, offset + Number(pageSize));
}

export interface ListOptions {
  sort?: string;
  order?: string;
  pageIndex?: number;
  pageSize?: number;
  listLength?: number;
}

/**
 * Paged list envelope used by every list endpoint. Rows arrive already paged by SQL and carry the
 * overall count in a `total` column; this sorts them and adds the paging fields (stringly typed, as
 * the API has always returned them).
 */
export function usePagedListResponse<T extends Record<string, any>>(list: T[], options: ListOptions, defaultSort: string) {
  const sort = options.sort || defaultSort;
  // Case-insensitive: the default order is 'ASC', which a case-sensitive check treated as descending.
  const order = String(options.order || 'asc').toLowerCase();
  const page = options.pageIndex || 1;
  const size = options.pageSize || 10;
  const items = Array.isArray(list) ? list : [];

  if (options.sort) {
    items.sort((a, b) => {
      const fieldA = String(a[sort] ?? '').toUpperCase();
      const fieldB = String(b[sort] ?? '').toUpperCase();
      return order === 'asc' ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
    });
  } else {
    items.sort((a, b) => (order === 'asc' ? a[sort] - b[sort] : b[sort] - a[sort]));
  }

  const total = items.length === 0 ? 0 : items[0].total;
  const lastPage = Math.max(Math.ceil((options.listLength ?? items.length) / size), 1);

  return JSON.parse(JSON.stringify({
    code: 0,
    error: null,
    message: 'ok',
    data: { items, total },
    total: `${total}`,
    pageSize: `${size}`,
    pageIndex: `${page}`,
    lastpage: `${lastPage}`,
  }));
}

/**
 * Single place errors become responses: domain errors keep their status and message; anything else is
 * logged and reported as a generic 500 so internal details (SQL, stack text) never reach clients.
 */
export function handleError(event: H3Event<EventHandlerRequest>, error: unknown) {
  if (error instanceof AppError) {
    event.res.status = error.status;
    return useResponseError(error.code, error.message);
  }

  console.error(error);
  event.res.status = 500;
  return useResponseError('InternalServerError', 'Internal server error');
}
