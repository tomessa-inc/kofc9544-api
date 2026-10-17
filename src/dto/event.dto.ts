import type { Recurrence } from "../service/event-schedule";

/** POST /event `data`: start/end are local "YYYY-MM-DDTHH:MM[:SS]". */
export interface EventInput {
    start: string;
    end: string;
    text: string;
    description: string;
    recurring: Recurrence;
    /** How many more times a recurring event happens after the first. */
    frequency: number;
    /** Shown to visitors who are not signed in. */
    viewing: boolean;
}
