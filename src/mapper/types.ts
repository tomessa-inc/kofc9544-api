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

