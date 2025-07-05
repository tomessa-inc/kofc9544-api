"use strict";
//import {gallery as Gallery, image as Image} from "../models/";
import {BaseMapper, paramsOptions, resourceGroupTaggingApiMapper, cloudFrontMapper} from '.';
import moment from "moment";
import {hasSubscribers} from "diagnostics_channel";
import * as uuid from 'uuid';
import {trim} from "lodash";
import {parse} from "dotenv";
import process from "process";
import {Calendar2} from "../models/Calendar2"
import {Event2} from "../models/Event2"
import {Tag2} from "../models/Tag2";
import {Image2} from "../models/Image2";
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
interface Ruleset {
    month: number
    week: number
    timeOfDay: number
    dayOfWeek: string
    year: number
}




class DateStuff extends Date {
    getWeekOfMonth() {

        var firstWeekday = new Date(this.getFullYear(), this.getMonth(), 1).getDay()
        var offsetDate = this.getDate() + firstWeekday;
        return Math.ceil(offsetDate / 7);
    }

    getDayOfWeek() {
        const dayOfWeek = {
            0: "sunday",
            1: "monday",
            2: "tuesday",
            3: "wednesday",
            4: "thursday",
            5: "friday",
            6: "saturday"
        }

        var weekday = new Date(this.getFullYear(), this.getMonth(), this.getDate()).getDay()

        return dayOfWeek[weekday]
    }

    getDaysOfMonth() {
        return new Date(this.getFullYear(), this.getMonth(), 0).getDate();
    }

    getFirstDayOfWeek() {
        const dayOfWeek = {
            0: "monday",
            1: "tuesday",
            2: "wednesday",
            3: "thursday",
            4: "friday",
            5: "saturday",
            6: "sunday"
        }

        var firstWeekday = new Date(this.getFullYear(), this.getMonth(),1).getDay()

        return dayOfWeek[firstWeekday]
    }


    getDateBasedOnWeekDayMonth(ruleSet) {
        const today = new Date();
        const year = ruleSet.year
        const month = ruleSet.month;
        const time = new Date(ruleSet.timeOfDay).getUTCHours();
        const dayOfWeek = ruleSet.dayOfWeek;
        let weekNum = ruleSet.week;

        const weekDays = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6
        };

        const date = new Date(year, month, 1);
        const diff = weekDays[dayOfWeek] - date.getDay();

        if (diff < 0 ) {
            weekNum = weekNum -1
        }

        // console.log('the day')
        // console.log(date.getDay());


        date.setDate(date.getDate() + (diff >= 0 ? diff - 7 : diff));

        date.setDate(date.getDate() + (weekNum * 7));
        /*
                // Create date for first day of required month
                var d = new Date(year, month - 1, 1);

                // Set to first instance of particular day
                d.setDate((8 - (d.getDay() - weekDays[ruleSet.dayOfWeek]))%7);

                // Add (n-1)*7 days
                d.setDate(d.getDate() + (ruleSet.week-1) * 7);
                console.log('the new date')
                console.log(d);
                // Check final date is still in required month
                return d.getMonth() == month - 1? d : false;
        */
        return date;
    }

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

    public async publishCalendars() {
        const resources = (await resourceGroupTaggingApiMapper.getResourceByTag({key: "Environment", value:process.env.NODE_ENV}))['ResourceTagMappingList'][0];
        const id = resources['ResourceARN'].split("/").pop();
        const checkValidation = await cloudFrontMapper.createInvalidation("/Calendar/month", id)
        if (checkValidation['Invalidation'].Status === "InProgress") {
            return true;
        } else {
            return false
        }
        /*       console.log('checking validation')
               let validLoop = true
               const invalidationId = checkValidation['Invalidation']['Id']
               while (validLoop) {
                   const updateStatus = await cloudFrontMapper.checkInvalidation(id, invalidationId);

                   if (updateStatus['Invalidation'].Status === "Completed") {
                       validLoop = false
                   }
                   await this.sleep(5000);
               } */

        //return true;
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
                Event: sql<string>`(SELECT JSON_ARRAYAGG(JSON_OBJECT('id', \`event\`.\`id\`, 'text', \`event\`.\`text\`,
                                                                     'description', \`event\`.\`description\`))
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

        let day = startDate.date.day
        let month = startDate.date.month
        let year = startDate.date.year
        let startHour = startDate.time.hour
        let endHour = endDate.time.hour
        let weekOfMonth = 0;
        let frequency = (data.frequency) ?? 0
        let dayOfWeek = ''
        const ruleSet:Ruleset = {dayOfWeek: null, week: null, month:null, timeOfDay:null, year:0};


        for (let x = 0; x <= frequency; x++) {
            const id = `${day}-${month+1}-${year}-${startHour}-${endHour}`;
            try {
                console.log(data);

                const calendarSQL = this.DRIZZLE.insert(calendar).values( {
                    id: id,
                    day: day,
                    month: month + 1,
                    year: year,
                    EventId: data.eventId
                });
/*
                const CalendarDefaults = {
                    id: id,
                    day: day,
                    month: month + 1,
                    year: year,
                    EventId: data.eventId
                }
                await Calendar2.findOrCreate({where: {id: id}, defaults: CalendarDefaults}) */

            } catch (error) {
                console.log(error.toString())
            }
            const date = new DateStuff(year, month, day)

            weekOfMonth = date.getWeekOfMonth()
            dayOfWeek = date.getDayOfWeek()
            switch(data.recurring) {
                case "monthly":
                    month = month + 1;

                    if (month > 11) {
                        month = 0;
                        year = year + 1;
                    }
                    break;
                case "weekly":
                    day = day + 7;
                    const dateCheck = new DateStuff(year, month, day)
                    const daysInMonth = dateCheck.getDaysOfMonth()
                    if (month > 11) {
                        month = 0;
                        year = year + 1;
                    }
                    break;

            }

            ruleSet.dayOfWeek = dayOfWeek
            ruleSet.week = weekOfMonth
            ruleSet.month = month
            ruleSet.timeOfDay = startDate.time.hour
            ruleSet.year = year;

            const dateUpdate = date.getDateBasedOnWeekDayMonth(ruleSet)
            if (!dateUpdate) {
                return false
            }

            //   month = dateUpdate.getMonth()
            day = dateUpdate.getDate()
            year = dateUpdate.getFullYear()

//            dateUpdate.get
            // console.log(startDate)
            //    const date = new DateStuff(year, month, day)

            //    console.log('week of month')

            //  console.log(date.getWeekOfMonth())


            //  const endDate = this.parseDate(data.end)


            /*    try {


                    const tag = {
                        GalleryId: GalleryId,
                        TagId: TagId,
                        createdAt: moment().format('YYYY-MM-DD'),
                        updatedAt: moment().format('YYYY-MM-DD'),
                    };

                    return await GalleryTag.findOrCreate({where: [{GalleryId: GalleryId}, {TagId: TagId}], defaults: tag});
                } catch (error) {
                    console.log('the error');
                    console.log(error);
                    return error.toString();
                }*/

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