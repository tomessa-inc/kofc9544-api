/** One golfer in a registration request (field names are the API's). */
export interface RegistrationPlayerDto {
    player: string;
    email: string;
    phone: string;
    allergies?: string;
}

/** POST /golf/register body: one player registers individually, two or more form a team. */
export interface RegistrationDto {
    team_name?: string;
    players: RegistrationPlayerDto[];
    payment?: number;
    member?: string;
}

/** POST /golf/player-new body. */
export interface NewPlayerDto {
    TeamId?: string;
    name: string;
    email: string;
    phone: string;
    allergies?: string;
}

/** PUT /golf/player-update/:id body. */
export interface PlayerUpdateDto {
    name?: string;
    email?: string;
    phone?: string;
    TeamId?: string;
    allergies?: string;
}

/** PUT /golf/team/:id body. */
export interface TeamUpdateDto {
    name?: string;
    captain?: string;
    hole?: string;
}

/** POST /golf/hole-new and POST /golf/hole/:id body. */
export interface HoleDto {
    name: string;
    par?: string;
}

/** POST /golf/year-new body. */
export interface NewYearDto {
    year: number;
}

/** One row of the player-import CSV, keyed by its header. */
export interface ImportRow {
    PAR?: string;
    "TEAM NAME"?: string;
    HOLE?: string;
    "LAST NAME"?: string;
    "FIRST NAME"?: string;
    EMAIL?: string;
    REGISTERED?: string;
    PAID?: string;
    PHONE?: string;
    NOTES?: string;
}

/** Result of a player import. */
export interface ImportResult {
    teamsCreated: number;
    playersCreated: number;
}
