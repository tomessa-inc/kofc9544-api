import { calendarMapper } from "../mapper/calendar.mapper";
import { eventMapper } from "../mapper/event.mapper";
import { mailMapper } from "../mapper/mail.mapper";
import { userMapper } from "../mapper/user.mapper";
import { EmailMessaging } from "../models/EmailMessaging";

export interface EventInput {
    id: string;
    start: string;
    end: string;
    text: string;
    description: string;
    recurring: string;
    frequency: string;
    viewing: boolean;
    [key: string]: unknown;
}

export interface EventCreator {
    email: string;
    firstName: string;
}

export interface EventWriter {
    createEvent(data: EventInput): Promise<string | undefined>;
}

export interface CalendarWriter {
    createCalendar(data: EventInput & { eventId: string }): Promise<boolean>;
}

export interface CreatorLookup {
    getUserByToken(token: string): Promise<EventCreator[] | string>;
}

export interface Mailer {
    prepareEmail(body: Record<string, unknown>): Promise<void>;
    apiSendMail(): Promise<unknown>;
}

export interface CreateEventResult {
    eventId: string | undefined;
    emailSent: boolean;
}

/**
 * Creates an event, its calendar occurrences, and emails the member who created it.
 */
export class EventService {
    constructor(
        private readonly events: EventWriter,
        private readonly calendar: CalendarWriter,
        private readonly users: CreatorLookup,
        private readonly mailer: Mailer,
    ) {}

    /**
     * @param data  the event from the request body
     * @param token the creator's bearer token, if the request had one
     * @returns eventId is undefined when the event could not be created (nothing else is written)
     */
    public async createEvent(data: EventInput, token: string | null): Promise<CreateEventResult> {
        const eventId = await this.events.createEvent(data);
        if (!eventId) {
            return { eventId: undefined, emailSent: false };
        }

        await this.calendar.createCalendar({ ...data, eventId });

        return { eventId, emailSent: await this.notifyCreator(data, token) };
    }

    /**
     * The event is already saved, so a missing creator or a mail failure is reported, not thrown:
     * failing the request here would invite a retry that duplicates the event.
     */
    private async notifyCreator(data: EventInput, token: string | null): Promise<boolean> {
        if (!token) return false;

        try {
            const users = await this.users.getUserByToken(token);
            const creator = Array.isArray(users) ? users[0] : undefined;
            if (!creator?.email) return false;

            await this.mailer.prepareEmail({
                email_type: EmailMessaging.EMAIL_TYPE_CALENDER_EVENT,
                email: creator.email,
                firstName: creator.firstName,
                event: data.text,
                description: data.description,
                start: data.start,
                end: data.end,
                recurring: data.recurring || "none",
            });
            await this.mailer.apiSendMail();
            return true;
        } catch (error) {
            console.log(`Calendar event email not sent: ${error}`);
            return false;
        }
    }
}

export const eventService = new EventService(eventMapper, calendarMapper, userMapper, mailMapper);
