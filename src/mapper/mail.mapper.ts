"use strict";

import { SESClient, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { emailParams } from '../data/email-params';
import { emailHeader } from '../data/email.header';
import { emailFooter } from '../data/email.footer';
import util, {format, inspect} from 'util';
import { EmailMessaging } from '../models/EmailMessaging';
import { imageService } from '../service';
import bodyParser from "body-parser";

export interface Params {
    //    Destination
}

export class MailMapper {
    private _sesClient;
    private _REGION: string = 'us-east-1'
    private _message: string;
    private _subject: string;
    private _emailType: string;
    private _phone: string;
    private _name;
    private _email;
    private _params;
    private _paramsGroup: string[];
    private _SUBJECT_CONTENT;
    private _HTML_CONTENT;
    private _TEXT_CONTENT;
    private _PARAMS_EMAIL: string = 'email';
    private _PARAMS_MESSAGE: string = 'message';
    private _PARAMS_EMAIL_TYPE: string = 'email_type';
    private _PARAMS_NAME: string = 'name';
    private _PARAMS_SUBJECT: string = 'subject';
    private _TO_PERSON
    private _EMAIL_LOGO
    private _EMAIL_BANNER
    private _PARAMS_PHONE: string = 'phone';
    private _PARAMS_EMAILORPHONE: string = 'emailOrPhone';

    private _PARAMS_BODY: string = 'body';
    private _PARAMS_CITY: string = 'city';
    private _PARAMS_COUNTRY: string = 'country';
    private _PARAMS_TEAM_NAME: string = 'team_name';
    private _PARAMS_SCHOOL: string = 'school';
    private _PARAMS_FORMER_CLUB: string = 'formerClub';
    private _PARAMS_NHIS: string = 'nhis';
    private _PARAMS_CONTENT: string = '';


    constructor() {
        this._sesClient = new SESClient({ 'region': this._REGION })
    }

    async setupEmail(data, emailType = '') {
        let params = {
            "contact" :  [
                this.PARAMS_MESSAGE, this.PARAMS_EMAIL_TYPE, this.PARAMS_NAME, this.PARAMS_EMAIL
            ],
            "contact_us" :  [
                this.PARAMS_MESSAGE, this.PARAMS_EMAIL_TYPE, this.PARAMS_NAME, this.PARAMS_SUBJECT, this.PARAMS_EMAILORPHONE
            ],
            "sponsor" :  [
                this.PARAMS_EMAIL_TYPE, this.PARAMS_EMAIL
            ],
            "volunteer" :  [
                this.PARAMS_EMAIL_TYPE, this.PARAMS_NAME, this.PARAMS_EMAILORPHONE
            ],
            "register" :  [
                this.PARAMS_EMAIL_TYPE
            ],
            "send_id" :  [
                this.PARAMS_EMAIL_TYPE
            ],

        }

        const missingParam = [];
        let valid = true;
        try {
            const body = data.data;

            if (!body.email_type){
                body.email_type = data[this.PARAMS_EMAIL_TYPE]
            }

            const paramCheck:string[] = params[body[this.PARAMS_EMAIL_TYPE]]

            Object.values(paramCheck).map(param   => {
                if (!body[param]) {
                    valid = false;
                    missingParam.push(param);
                }
            });

            if (valid) {

                await this.prepareEmail(body);
                const retVal = await this.apiSendMail();
                if (retVal['$metadata']['httpStatusCode'] === 200) {
                    return {success:true, data: retVal}

                } else {
                    return {success:true, data: retVal}
                }
            } else {
               return new Error(`Email has not been sent. Missing parameters: ${inspect(missingParam)}`)

            }
        } catch (error) {
            console.log(error);
            throw new Error(`Email has not been sent ${error.toString()}`);
        }
    }


    /**
     * Function that helps prepare the email
     * @param body
     */
    async prepareEmail(body) {
        this._params = emailParams;
        this._params.Source = 'KOFC Site Admin <test@kofc9544.ca>';
        this._params.ReplyToAddresses = [];
        this._params.Template = 'DefaultEmailTemplate';
        this._PARAMS_CONTENT = '';

        switch (body[this._PARAMS_EMAIL_TYPE]) {
            case EmailMessaging.EMAIL_TYPE_CALENDER_EVENT:
                this._params.Destination.ToAddresses.push(body.email);
                this._SUBJECT_CONTENT = EmailMessaging.CALENDER_EVENT_SUBJECT;
                await this.formatBody(body);
                this._HTML_CONTENT = this._PARAMS_CONTENT
               // this._HTML_CONTENT = format( this._PARAMS_CONTENT, `http://localhost:5173/reset-password/${body.token}`)
               // this._HTML_CONTENT = this._PARAMS_CONTENT.concat(format(EmailMessaging.FORGOTPASSWORD_CONTENT_HTML, key, this.checkObject(body[key])));
                this._TEXT_CONTENT = EmailMessaging.CALENDER_EVENT_CONTENT_TEXT;
                this._TO_PERSON = body.firstName;
                this._EMAIL_LOGO = imageService.loadImage100x100("kofc-logo100x100.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("holy-redeemer-kanata.png")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;


            case EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD:
                let host = "https://member.kofc9544.ca"
                switch(process.env.STAGE) {
                    case "dev":
                        host = "http://localhost:5173"
                        break;
                    case "stage":
                        host = "https://member-stage.kofc9544.ca"
                        break;

                    default:
                        break;
                }
                this._params.Destination.ToAddresses.push(body.email);
                this._SUBJECT_CONTENT = EmailMessaging.FORGOTPASSWORD_SUBJECT;
                this._HTML_CONTENT = format(EmailMessaging.FORGOTPASSWORD_CONTENT_HTML, `${host}/reset-password/${body.token}`)
                this._TEXT_CONTENT = EmailMessaging.FORGOTPASSWORD_CONTENT_TEXT;
                this._TO_PERSON = body.firstName;
                this._EMAIL_LOGO = imageService.loadImage100x100("kofc-logo100x100.png")
//                this._EMAIL_LOGO = imageService.loadImage200x200("tomvisions-logo-email.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("holy-redeemer-kanata.png")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;


                break;
            case EmailMessaging.EMAIL_TYPE_CONTACT:
                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push('tomc@tomvisions.com');
                await this.formatBody(body);
                this._SUBJECT_CONTENT = EmailMessaging.CONTACT_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.CONTACT_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.CONTACT_CONTENT_TEXT;
                this._TO_PERSON = "Tom";
                this._EMAIL_LOGO = imageService.loadImage200x200("tomvisions-logo-email.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("waterfall-sm2.jpg")
               
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;

                break;


            case EmailMessaging.EMAIL_TYPE_CONTACTUS:
                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('resolvewithmarc@sympatico.ca');
                await this.formatBody(body);
                this._SUBJECT_CONTENT = EmailMessaging.CONTACTUS_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.CONTACTUS_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.CONTACTUS_CONTENT_TEXT;
                this._TO_PERSON = "Marc";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;

            case EmailMessaging.EMAIL_TYPE_REGISTER:
                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('golfregistration@kofc9544.ca');
                this._SUBJECT_CONTENT = EmailMessaging.REGISTER_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.REGISTER_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.REGISTER_CONTENT_TEXT;
                this._TO_PERSON = "Richard";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")
                await this.formatBody(body);
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;

                break;

            case EmailMessaging.EMAIL_TYPE_SEND_ID:
                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push(body['email']);
                this._params.Destination.BccAddresses.push('tomc@tomvisions.com');

                this._SUBJECT_CONTENT = EmailMessaging.REGISTERCONTACTSENDER_SUBJECT;
                this._HTML_CONTENT = util.format(EmailMessaging.REGISTERCONTACTSENDER_CONTENT_HTML, body.id);
                this._TEXT_CONTENT = EmailMessaging.REGISTERCONTACTSENDER_CONTENT_TEXT;
                this._TO_PERSON = body["name"];
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")
                this._PARAMS_CONTENT = '';
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;

            case EmailMessaging.EMAIL_TYPE_VOLUNTEER:
                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('jpopulus@rogers.com');
                await this.formatBody(body);
                this._SUBJECT_CONTENT = EmailMessaging.VOLUNTEER_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.VOLUNTEER_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.VOLUNTEER_CONTENT_TEXT;
                this._TO_PERSON = "Marc";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;

            case EmailMessaging.EMAIL_TYPE_SPONSOR:
                await this.formatBody(body);
                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('bmilliere@sympatico.ca');
                this._params.Destination.ToAddresses.push('resolvewithmarc@sympatico.ca');
                this._SUBJECT_CONTENT = EmailMessaging.SPONSOR_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.SPONSOR_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.SPONSOR_CONTENT_TEXT;
                this._TO_PERSON = "Brian";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")
                
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;

                break;

        }
    }

    async formatBody(body) {
        this._PARAMS_CONTENT = '';

        Object.keys(body).map((key) => {
            this._PARAMS_CONTENT = this._PARAMS_CONTENT.concat(format(EmailMessaging.PARAMS_CONTENT, key, this.checkObject(body[key])));

        });
    }

    checkObject(data) {
        if (typeof data === 'string' || data === undefined || typeof data === "boolean") {
            return data;
        }

        let stringData = "";

        for (let row of data) {
            let format = `<p>player: ${row['player']}</p><p>email: ${row['email']}</p><p>phone: ${row['phone']}</p><p>allergies: ${row['allergies']}</p>`;
            stringData = stringData.concat(" ", format);
        }

        return stringData;
    }
    async apiSendMail() {
        console.log("the params")
        console.log(this._params);
        return this._sesClient.send(new SendTemplatedEmailCommand(this._params));
    }

    get PARAMS_NAME(): string {
        return this._PARAMS_NAME;
    }

    get PARAMS_EMAIL(): string {
        return this._PARAMS_EMAIL;
    }

    get PARAMS_EMAIL_TYPE(): string {
        return this._PARAMS_EMAIL_TYPE;
    }

    get PARAMS_MESSAGE(): string {
        return this._PARAMS_MESSAGE;
    }

    get PARAMS_PHONE(): string {
        return this._PARAMS_PHONE;
    }

    get PARAMS_BODY(): string {
        return this._PARAMS_BODY;
    }

    get PARAMS_EMAILORPHONE(): string {
        return this._PARAMS_EMAILORPHONE;
    }

    get PARAMS_SUBJECT(): string {
        return this._PARAMS_SUBJECT;
    }
}


export const mailMapper = new MailMapper();
