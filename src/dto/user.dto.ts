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

/** New access role (not routed yet). */
export interface AccessDto {
    id?: string;
    name: string;
    description: string;
}
