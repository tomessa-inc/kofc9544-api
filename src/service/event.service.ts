import type { EventInput } from "../dto/event.dto";
import { CalendarMapper, calendarMapper } from "../mapper/calendar.mapper";
import { EventMapper, eventMapper } from "../mapper/event.mapper";
import { authService } from "./auth.service";
import { CdnService, cdnService } from "./cdn.service";
import { occurrences, parseLocalDateTime, scheduleId } from "./event-schedule";
import { mailService, type EventMailer, type Recipient } from "./mail.service";

type EventStore = Pick<EventMapper, "insert">;
type CalendarStore = Pick<CalendarMapper, "insertOccurrence" | "findByMonth">;

/** Resolves a session token to the signed-in member (AuthService). */
export interface CreatorLookup {
    currentUser(token: string): Promise<Recipient | null>;
}

export interface CreateEventResult {
    eventId: string;
    emailSent: boolean;
}

/** Calendar events: creating them (with their recurring occurrences), listing a month, publishing. */
export class EventService {
    constructor(
        private readonly events: EventStore,
        private readonly calendar: CalendarStore,
        private readonly users: CreatorLookup,
        private readonly mailer: EventMailer,
        private readonly cdn: Pick<CdnService, "invalidate">,
    ) {}

    /**
     * Create an event and one calendar row per occurrence, then email the member who created it.
     * @param token the creator's bearer token, if the request had one
     */
    public async createEvent(input: EventInput, token: string | null): Promise<CreateEventResult> {
        const start = parseLocalDateTime(input.start);
        const end = parseLocalDateTime(input.end);
        const dates = occurrences(start, input.recurring, input.frequency);
        const eventId = scheduleId(dates[0], start.hour, end.hour);

        await this.events.insert({
            id: eventId,
            hourStart: start.hour,
            minuteStart: start.minute,
            hourEnd: end.hour,
            minuteEnd: end.minute,
            text: input.text,
            description: input.description,
            viewing: input.viewing,
        });

        for (const date of dates) {
            await this.calendar.insertOccurrence({
                id: scheduleId(date, start.hour, end.hour),
                day: date.getDate(),
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                EventId: eventId,
            });
        }

        return { eventId, emailSent: await this.notifyCreator(input, token) };
    }

    /** A month's occurrences; every row carries the month's `total`. */
    public async listByMonth(month: number, year: number) {
        const rows = await this.calendar.findByMonth(month, year);
        return rows.map((row) => ({ ...row, total: rows.length }));
    }

    /** Make calendar changes visible by clearing the CDN's cached event pages. */
    public publish(): Promise<boolean> {
        return this.cdn.invalidate("/event/month");
    }

    /**
     * The event is already saved, so a missing creator or a mail failure is reported, not thrown:
     * failing the request here would invite a retry that duplicates the event.
     */
    private async notifyCreator(input: EventInput, token: string | null): Promise<boolean> {
        if (!token) return false;

        try {
            const creator = await this.users.currentUser(token);
            if (!creator?.email) return false;

            await this.mailer.sendCalendarEvent(creator, {
                event: input.text,
                description: input.description,
                start: input.start,
                end: input.end,
                recurring: input.recurring || "none",
            });
            return true;
        } catch (error) {
            console.error(`Calendar event email not sent: ${error}`);
            return false;
        }
    }
}

export const eventService = new EventService(eventMapper, calendarMapper, authService, mailService, cdnService);
