import {eventMapper, tagMapper, paramsOptions, mailMapper} from "../mapper/";
import {EmailMessaging} from "../models/EmailMessaging";
import {calendarMapper} from "../mapper/calendar.mapper";

export class EventController {


    public static async apiPublishEvents(req: any, res: any, next: any) {
        await eventMapper.publishEvents();

        return res.status(200).json({result:"success"});
    }

    /**
     * Calling all galleries
     * @param req
     * @param res
     * @param next
     */
    public static async apiGetEventsMonthByDay(req: any, res: any, next: any) {
        try {
            let month;
            let year;
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }

            const options: paramsOptions = { pageIndex: 1, pageSize: 10, filterQuery: "", sort: eventMapper.DEFAULT_SORT, order: eventMapper.DEFAULT_ORDER };

        if (req.body?.data?.month && req.body?.data?.year) {
            month = req.body.data.month;
            year = req.body.data.year;
        } else {
            month = req.params.month;
            year = req.params.year;
        }

            const events = await calendarMapper.getAllEventsByMonth(month, year);

            if (typeof events === 'string') {
                return res.status(500).json({ errors_string: events })
            }

            const paginationResults = eventMapper.prepareListResults(events,options);

            return res.status(200).json(paginationResults);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }

    }


    /**
     * Updating gallery based on ID
     * @param req
     * @param res
     * @param next
     *//*
    public static async apiUpdateGalleryById(req: any, res: any, next: any) {
        try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }
            const options: paramsOptions = { id: "string" };

            if (req.params.id) {
                options.id = req.params.id;
            }

            const gallery = await eventMapper.updateGallery(options, req.body);

            if (typeof gallery === 'string') {
                return res.status(500).json({ errors_string: gallery })
            }

            return res.status(200).json(gallery);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }
    } */

    /**
     * Retreiving gallery based on id
     * @param req
     * @param res
     * @param next
     */
    public static async apiCreateEvent(req: any, res: any, next: any) {
        try {
            req.body.data.eventId =  await eventMapper.createEvent(req.body.data);
            await calendarMapper.createCalendar(req.body.data);

            await mailMapper.prepareEmail({email_type: EmailMessaging.EMAIL_TYPE_CALENDER_EVENT, data: req.body.data });
            await mailMapper.apiSendMail();

            res.status(200).json({success:true })

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        }
    }

      /*  try {
            //        if (!galleryMapper.checkAuthenication(req.headers.authorization)) {
            //        return res.status(500).json({error: 'Not Authorized to access the API'})
            //      }
            const options: paramsOptions = { id: "string" };

            if (req.params.id) {
                options.id = req.params.id;
            }

            const event = await eventMapper.createEvent(req.body);

            gallery.dataValues.tags = gallery.Tags.map((tag) => {
                console.log({"label":tag.name, "value":tag.id})
                return {"label":tag.name, "value":tag.id}
            })

            if (typeof gallery === 'string') {
                return res.status(500).json({ errors_string: gallery })
            }

            return res.status(200).json(gallery);

        } catch (error) {
            res.status(500).json({ error_main: error.toString() })
        } */

}
