/** Result header MySQL returns for UPDATE/DELETE. */
export interface WriteResult {
    affectedRows: number;
}

/** Result header MySQL returns for INSERT. */
export interface InsertResult extends WriteResult {
    insertId: number;
}

/** A page of rows to fetch. */
export interface Page {
    offset: number;
    limit: number;
}

/** A select-box option. */
export interface LabelValue {
    label: string;
    value: string | number;
}

/**
 * TEMPORARY (removed when strictNullChecks is enabled at the end of the refactor): with strictNullChecks
 * off, Drizzle's insert/update types drop every nullable column, so mappers hand their typed values to
 * Drizzle through this.
 */
export function driverValues<T extends object>(values: T): any {
    return values;
}
