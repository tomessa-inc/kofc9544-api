/** POST /auth/login body. */
export interface LoginDto {
    username: string;
    password: string;
}

/** Sign-up body (not routed yet). */
export interface SignUpDto {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

/** Editable member fields (PATCH /user `user` object). There is no phone column. */
export interface UserUpdateDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
}

/** An access role's editable fields; the id is derived from the name on create. */
export interface AccessDto {
    name: string;
    description: string;
}
