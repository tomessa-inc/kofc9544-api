import { expect } from "chai";
import { CalendarMapper } from "../../../mapper/calendar.mapper";
import { EventMapper } from "../../../mapper/event.mapper";
import { MailMapper } from "../../../mapper/mail.mapper";
import { fakeExecutor } from "../helpers/fake-executor";

describe("events and mail mappers", () => {
    it("EventMapper.insert writes the event, including viewing", async () => {
        const db = fakeExecutor({ affectedRows: 1 });

        await new EventMapper(db).insert({ id: "1-6-2026-9-10", hourStart: 9, minuteStart: 0, hourEnd: 10, minuteEnd: 30, text: "Golf", description: "", viewing: false });

        expect(db.last.sql).to.match(/^insert into `event` \(.*`viewing`\) values/);
        expect(db.last.params).to.include.members(["1-6-2026-9-10", 9, 0, 10, 30, "Golf", "", false]);
    });

    it("CalendarMapper.insertOccurrence is INSERT IGNORE with database-dated timestamps", async () => {
        const db = fakeExecutor({ affectedRows: 1 });

        await new CalendarMapper(db).insertOccurrence({ id: "1-6-2026-9-10", day: 1, month: 6, year: 2026, EventId: "e1" });

        expect(db.last.sql).to.equal("insert ignore into `calendar` (`id`, `day`, `month`, `year`, `EventId`, `createdAt`, `updatedAt`) values (?, ?, ?, ?, ?, CURDATE(), CURDATE())");
        expect(db.last.params).to.deep.equal(["1-6-2026-9-10", 1, 6, 2026, "e1"]);
    });

    it("CalendarMapper.findByMonth joins events and filters by month and year", async () => {
        const db = fakeExecutor([{ id: "x" }]);

        expect(await new CalendarMapper(db).findByMonth(6, 2026)).to.deep.equal([{ id: "x" }]);
        expect(db.last.sql).to.include("from `calendar` inner join `event` on `event`.`id` = `calendar`.`EventId`");
        expect(db.last.sql).to.include("where (`calendar`.`month` = ? and `calendar`.`year` = ?)");
        expect(db.last.params).to.deep.equal([6, 2026]);
    });

    it("MailMapper.send delivers through SES as a SendTemplatedEmailCommand", async () => {
        const sent: any[] = [];
        const email = { Source: "s", Destination: { CcAddresses: [], ToAddresses: ["a@x.ca"], BccAddresses: [] }, ReplyToAddresses: [], Template: "T", TemplateData: "{}" };

        await new MailMapper({ send: async (c) => (sent.push(c), {}) }).send(email);

        expect(sent[0].constructor.name).to.equal("SendTemplatedEmailCommand");
        expect(sent[0].input).to.deep.equal(email);
    });
});
