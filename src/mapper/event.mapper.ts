"use strict";
//import {gallery as Gallery, image as Image} from "../models/";
import {BaseMapper, paramsOptions, resourceGroupTaggingApiMapper, cloudFrontMapper} from '.';
import moment from "moment";
import {hasSubscribers} from "diagnostics_channel";
import * as uuid from 'uuid';
import {SequelizeApi} from "../db/Sequelize";
import {trim} from "lodash";
import {parse} from "dotenv";
import process from "process";
import {Event} from "../models/Event"

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


export class EventMapper extends BaseMapper {
    private _PARAMS_ID: string = 'id';
    private _PARAMS_NAME: string = 'name';
    private _DEFAULT_SORT: string = 'createdAt';
    private _LIST_NAME: string = 'galleries';


    constructor() {
        super();
        this.DATABASE_NAME = 'kofc_golf';
        this.initializeSequelize()
        this.initializeEvent();
    }


    private async initializeEvent() {
        try {
            Event.initialize(this.SEQUELIZE);
        } catch (error) {
            console.log(error);

        }
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

    public async publishEvents() {
        const resources = (await resourceGroupTaggingApiMapper.getResourceByTag({key: "Environment", value:process.env.NODE_ENV}))['ResourceTagMappingList'][0];
        const id = resources['ResourceARN'].split("/").pop();
        const checkValidation = await cloudFrontMapper.createInvalidation("/event/month", id)
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


    public async createEvent(data: DataOptions) {
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
        const id = `${day}-${month+1}-${year}-${startHour}-${endHour}`;
        const eventDefaults = {
            id: id,
            //   day: day,
            //   month: month + 1,
            //   year: year,
            hourStart: startDate.time.hour,
            minuteStart: startDate.time.minute,
            hourEnd: endDate.time.hour,
            minuteEnd: endDate.time.minute,
            text: data.text,
            description: data.description,
            public: data.viewing

        }

        await Event.findOrCreate({where: {id: id}, defaults: eventDefaults})

        return id;
    }


    get DEFAULT_SORT():
        string
        {
            return this._DEFAULT_SORT;
        }

        get PARAMS_ID():
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

export const eventMapper = new EventMapper();