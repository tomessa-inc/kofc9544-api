import { expect } from "chai";
import { eventMapper } from "../../../mapper";
import { cdnService } from "../../../service/cdn.service";
import { calendarMapper, nthWeekdayOfMonth } from "../../../mapper/calendar.mapper";
import { Calendar2 } from "../../../models/Calendar2";
import { stubMethod, stubSQL } from "../helpers/sql-stub";


describe("CalendarMapper / EventMapper", () => {
    const stubs: { restore: () => void }[] = [];
    const track = <T extends { restore: () => void }>(stub: T) => (stubs.push(stub), stub);

    afterEach(() => stubs.splice(0).reverse().forEach((s) => s.restore()));

    function stubPublish(started: boolean) {
        return track(stubMethod(cdnService, "invalidate", async () => started));
    }

    describe("CalendarMapper.publishCalendars", () => {
        it("invalidates the calendar pages on the CDN", async () => {
            const invalidate = stubPublish(true);

            expect(await calendarMapper.publishCalendars()).to.equal(true);
            expect(invalidate.calls[0]).to.deep.equal(["/Calendar/month"]);
        });

        it("returns false when the invalidation is not in progress", async () => {
            stubPublish(false);

            expect(await calendarMapper.publishCalendars()).to.equal(false);
        });
    });

    describe("CalendarMapper.getAllEventsByMonth", () => {
        it("filters calendar entries by month and year joined to events", async () => {
            const db = track(stubSQL(calendarMapper, [{ id: "1-6-2026-9-10" }]));

            const result = await calendarMapper.getAllEventsByMonth(6, 2026);

            expect(result).to.deep.equal([{ id: "1-6-2026-9-10" }]);
            expect(db.last.sql).to.include("from `calendar` inner join `event`");
            expect(db.last.sql).to.include("`calendar`.`month` = ? and `calendar`.`year` = ?");
            expect(db.last.params).to.deep.equal([6, 2026]);
        });
    });

    describe("CalendarMapper.getAllCalendarsByMonth", () => {
        it("queries the legacy model by month and year", async () => {
            const findAll = track(stubMethod(Calendar2 as any, "findAll", async () => [{ get: () => ({ id: "x" }) }]));

            const result = await calendarMapper.getAllCalendarsByMonth(6, 2026);

            expect(result).to.deep.equal([{ id: "x" }]);
            expect(findAll.calls[0][0]).to.deep.equal({ where: { month: 6, year: 2026 } });
        });
    });

    describe("CalendarMapper.createCalendar", () => {
        const data = {
            start: "2026-06-01T09:00:00",
            end: "2026-06-01T10:00:00",
            id: "",
            text: "Meeting",
            description: "",
            recurring: "monthly",
            frequency: "2",
            viewing: true,
            eventId: "evt-1",
        };

        const rows = (db: ReturnType<typeof stubSQL>) => db.calls.map((c) => c.params.slice(0, 5));

        it("resolves true for a recurring event", async () => {
            track(stubSQL(calendarMapper, { affectedRows: 1 }));

            expect(await calendarMapper.createCalendar(data)).to.equal(true);
        });

        it("inserts the occurrence with INSERT IGNORE, linked to the event, dated by the DB", async () => {
            const db = track(stubSQL(calendarMapper, { affectedRows: 1 }));

            await calendarMapper.createCalendar({ ...data, recurring: "", frequency: "0" });

            expect(db.calls).to.have.length(1);
            expect(db.last.sql).to.match(/^insert ignore into `calendar`/);
            expect(db.last.sql).to.include("CURDATE(), CURDATE()");
            expect(rows(db)).to.deep.equal([["1-6-2026-9-10", 1, 6, 2026, "evt-1"]]);
        });

        it("repeats monthly on the same weekday position (first Monday)", async () => {
            const db = track(stubSQL(calendarMapper, { affectedRows: 1 }));

            await calendarMapper.createCalendar(data);

            expect(rows(db)).to.deep.equal([
                ["1-6-2026-9-10", 1, 6, 2026, "evt-1"],
                ["6-7-2026-9-10", 6, 7, 2026, "evt-1"],
                ["3-8-2026-9-10", 3, 8, 2026, "evt-1"],
            ]);
        });

        it("repeats monthly across a year boundary (third Wednesday)", async () => {
            const db = track(stubSQL(calendarMapper, { affectedRows: 1 }));

            await calendarMapper.createCalendar({ ...data, start: "2026-11-18T19:00:00", end: "2026-11-18T21:00:00", frequency: "2" });

            expect(rows(db).map((r) => r[0])).to.deep.equal(["18-11-2026-19-21", "16-12-2026-19-21", "20-1-2027-19-21"]);
        });

        it("repeats weekly every 7 days, rolling over month ends", async () => {
            const db = track(stubSQL(calendarMapper, { affectedRows: 1 }));

            await calendarMapper.createCalendar({ ...data, start: "2026-06-24T09:00:00", recurring: "weekly", frequency: "2" });

            expect(rows(db).map((r) => r[0])).to.deep.equal(["24-6-2026-9-10", "1-7-2026-9-10", "8-7-2026-9-10"]);
        });

        it("inserts a single row for a non-recurring event even if frequency is set", async () => {
            const db = track(stubSQL(calendarMapper, { affectedRows: 1 }));

            await calendarMapper.createCalendar({ ...data, recurring: "", frequency: "3" });

            expect(db.calls).to.have.length(1);
        });

        it("keeps going when one occurrence fails to insert", async () => {
            const db = track(stubSQL(calendarMapper, (_q, i) => { if (i === 0) throw new Error("Duplicate"); return {}; }));

            expect(await calendarMapper.createCalendar(data)).to.equal(true);
            expect(db.calls).to.have.length(3);
        });
    });

    describe("nthWeekdayOfMonth", () => {
        const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

        it("finds the first Monday when the month starts on a Monday", () => {
            expect(iso(nthWeekdayOfMonth(2026, 5, 1, 1))).to.equal("2026-6-1");
        });

        it("finds the first Monday when the month starts later in the week", () => {
            expect(iso(nthWeekdayOfMonth(2026, 6, 1, 1))).to.equal("2026-7-6");
        });

        it("finds the third Wednesday", () => {
            expect(iso(nthWeekdayOfMonth(2026, 10, 3, 3))).to.equal("2026-11-18");
        });

        it("falls back to the last occurrence when there is no 5th", () => {
            // June 2026 has four Fridays (5, 12, 19, 26).
            expect(iso(nthWeekdayOfMonth(2026, 5, 5, 5))).to.equal("2026-6-26");
        });

        it("rolls month 12 over into January of the next year", () => {
            expect(iso(nthWeekdayOfMonth(2026, 12, 3, 3))).to.equal("2027-1-20");
        });
    });

    describe("CalendarMapper getters", () => {
        it("exposes param names", () => {
            expect(calendarMapper.DEFAULT_SORT).to.equal("createdAt");
            expect(calendarMapper.PARAMS_ID).to.equal("id");
            expect(calendarMapper.PARAMS_NAME).to.equal("name");
            expect(calendarMapper.LIST_NAME).to.equal("galleries");
        });
    });

    describe("EventMapper.publishEvents", () => {
        it("invalidates the event pages on the CDN", async () => {
            const invalidate = stubPublish(true);

            expect(await eventMapper.publishEvents()).to.equal(true);
            expect(invalidate.calls[0]).to.deep.equal(["/event/month"]);
        });

        it("returns false when the invalidation is not in progress", async () => {
            stubPublish(false);

            expect(await eventMapper.publishEvents()).to.equal(false);
        });
    });

    describe("EventMapper.createEvent", () => {
        const golfNight = {
            start: "2026-06-15T18:30:00",
            end: "2026-06-15T20:45:00",
            id: "",
            text: "Golf night",
            description: "Annual",
            recurring: "",
            frequency: "0",
            viewing: true,
        };

        it("inserts the event with an id built from the start date and hours", async () => {
            const db = track(stubSQL(eventMapper, { affectedRows: 1 }));

            await eventMapper.createEvent(golfNight);

            expect(db.last.sql).to.match(/^insert into `event`/);
            expect(db.last.params).to.include.members(["15-6-2026-18-20", 18, 30, 20, 45, "Golf night", "Annual"]);
        });

        it("returns the new event's id so calendar rows can reference it", async () => {
            track(stubSQL(eventMapper, { affectedRows: 1 }));

            expect(await eventMapper.createEvent(golfNight)).to.equal("15-6-2026-18-20");
        });

        it("returns undefined when the insert fails", async () => {
            // getSQLData swallows DB errors and resolves undefined.
            track(stubSQL(eventMapper, () => undefined));

            expect(await eventMapper.createEvent(golfNight)).to.equal(undefined);
        });

        it("persists the viewing flag", async () => {
            const db = track(stubSQL(eventMapper, { affectedRows: 1 }));

            await eventMapper.createEvent(golfNight);

            expect(db.last.sql).to.include("`viewing`");
            expect(db.last.params.at(-1)).to.equal(true);
        });

        it("persists a private (viewing: false) event", async () => {
            const db = track(stubSQL(eventMapper, { affectedRows: 1 }));

            await eventMapper.createEvent({ ...golfNight, viewing: false });

            expect(db.last.params.at(-1)).to.equal(false);
        });
    });

    describe("EventMapper getters", () => {
        it("exposes param names", () => {
            expect(eventMapper.DEFAULT_SORT).to.equal("createdAt");
            expect(eventMapper.PARAMS_ID).to.equal("id");
            expect(eventMapper.PARAMS_NAME).to.equal("name");
            expect(eventMapper.LIST_NAME).to.equal("galleries");
        });
    });
});
