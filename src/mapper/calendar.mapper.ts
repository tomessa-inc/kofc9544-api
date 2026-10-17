"use strict";
//import {gallery as Gallery, image as Image} from "../models/";
import {BaseMapper, paramsOptions} from '.';
import { cdnService } from '../service/cdn.service';
import moment from "moment";
import {hasSubscribers} from "diagnostics_channel";
import * as uuid from 'uuid';
import {trim} from "lodash";
import {parse} from "dotenv";
import process from "process";
import {Calendar2} from "../models/Calendar2"
import {Event2} from "../models/Event2"
import {Tag2} from "../models/Tag2";
import {calendar} from "../models/Calendar";
import {event} from "../models/Event";
import {eq, and, sql, count, lt, isNotNull} from 'drizzle-orm';


interface DateTime {
    date: {
        month:number,
        day:number,
        year:number
    },
    time: {
        hour:number
        minute:number
    }
}

interface DataOptions {
    start: string,
    end: string,
    id: string,
    text: string,
    description: string,
    recurring: string,
    frequency: string,
    viewing:boolean
    eventId: string
}
/**
 * Date of the nth (1-5) given weekday (0 = Sunday) in a month (0-11). If that month has no nth
 * occurrence (e.g. a 5th Monday), the month's last such weekday is used.
 */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
    const firstOfMonth = new Date(year, month, 1);
    const firstMatch = 1 + ((weekday - firstOfMonth.getDay() + 7) % 7);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let day = firstMatch + (nth - 1) * 7;
    while (day > daysInMonth) {
        day -= 7;
    }
    return new Date(year, month, day);
}

export class CalendarMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'createdAt';
    private _LIST_NAME: string = 'galleries';


    constructor() {
        super();
            this.initializeDrizzle()
 //       this.initializeSequelize()
   //     this.initializeCalendar();
    }


    private parseDate(stringData): DateTime {
        const dateTime: DateTime = {date: {year: 0, month: 0, day: 0}, time: {hour:0, minute:0}}
        const temp = stringData.split('T')
        const [year, month, day] = temp[0].split('-');
        const [hour, minute, seconds] = temp[1].split(':');
        dateTime.date.year = parseInt(year);
        dateTime.date.month = parseInt(month) -1;
        dateTime.date.day = parseInt(day)
        dateTime.time.hour = parseInt(hour);
        dateTime.time.minute = parseInt(minute);

        return dateTime;
    }

    /** Clear the CDN cache for the /Calendar/month pages. */
    public async publishCalendars() {
        return cdnService.invalidate("/Calendar/month");
    }

    public async getAllEventsByMonth(month:number, year:number) { //: Promise<string[] | string> {
        try {
            //    console.log(params);
            //  const offset = ((params.pageIndex - 1) * params.pageSize);


            let eventsSQL = this.DRIZZLE.select({
                id: calendar.id,
                day: calendar.day,
                month: calendar.month,
                year: calendar.year,
                createdAt: calendar.createdAt,
                updatedAt: calendar.updatedAt,
                EventId: calendar.EventId,
                Event: sql<string>`(SELECT JSON_OBJECT('id', \`event\`.\`id\`, 'text', \`event\`.\`text\`,
                                                                     'description', \`event\`.\`description\`)
                                    FROM event
                                    WHERE event.id = calendar.EventId)`.as('Event')


            }).from(calendar)

            eventsSQL.innerJoin(event, eq(event.id, calendar.EventId)).where(and(eq(calendar.month, month), eq(calendar.year, year)))

            return await this.getSQLData(eventsSQL.toSQL())

/*            const eventConfig = {
                include: [{
                    attributes: { exclude: ['ImageId', 'GalleryTagTagId'] },
                    association: Calendar2.Event,
                    required: true
                },
                ],
                where: {
                    month:month,
                    year:year
                }
            }
            return await Calendar2.findAll(eventConfig).then(galleries => {
                return this.processArray(galleries);
            }).catch(err => {
                console.log('the error');
                console.log(err);
                return err;
            }) */

        } catch (error) {

            return error.toString();
        }
    }



    public async getAllCalendarsByMonth(month:number, year:number) { //: Promise<string[] | string> {
        try {
            //    console.log(params);
            //  const offset = ((params.pageIndex - 1) * params.pageSize);

            const CalendarConfig = {
                where: {
                    month:month,
                    year:year
                }
            }
            return await Calendar2.findAll(CalendarConfig).then(galleries => {
                return this.processArray(galleries);
            }).catch(err => {
                console.log('the error');
                console.log(err);
                return err;
            })
        } catch (error) {

            return error.toString();
        }
    }

    public async createCalendar(data: DataOptions) {
        const startDate = this.parseDate(data.start)
        const endDate = this.parseDate(data.end)
        const startHour = startDate.time.hour
        const endHour = endDate.time.hour
        const frequency = Number(data.frequency ?? 0)

        let occurrence = new Date(startDate.date.year, startDate.date.month, startDate.date.day)
        // Monthly events repeat on the same weekday position, e.g. "first Monday" or "third Friday".
        const weekday = occurrence.getDay()
        const nth = Math.ceil(occurrence.getDate() / 7)

        for (let x = 0; x <= frequency; x++) {
            const day = occurrence.getDate()
            const month = occurrence.getMonth()
            const year = occurrence.getFullYear()
            const id = `${day}-${month+1}-${year}-${startHour}-${endHour}`;

            try {
                // INSERT IGNORE keeps the old findOrCreate semantics: an occurrence that already exists is skipped.
                const calendarSQL = this.DRIZZLE.insert(calendar).ignore().values( {
                    id: id,
                    day: day,
                    month: month + 1,
                    year: year,
                    EventId: data.eventId,
                    createdAt: sql`CURDATE()`,
                    updatedAt: sql`CURDATE()`,
                });

                await this.getSQLData(calendarSQL.toSQL())
            } catch (error) {
                console.log(error.toString())
            }

            if (data.recurring === "monthly") {
                occurrence = nthWeekdayOfMonth(year, month + 1, weekday, nth)
            } else if (data.recurring === "weekly") {
                occurrence = new Date(year, month, day + 7)
            } else {
                break
            }
        }
        return true;
    }


    get DEFAULT_SORT():
        string
    {
        return this._DEFAULT_SORT;
    }

    get
    PARAMS_ID()
        :
        string
    {
        return this._PARAMS_ID;
    }

    get
    PARAMS_NAME()
        :
        string
    {
        return this._PARAMS_NAME;
    }


    get
    LIST_NAME()
        :
        string
    {
        return this._LIST_NAME;
    }

}

//export const galleryMapper = await (new GalleryMapper()).initialize();

export const calendarMapper = new CalendarMapper();