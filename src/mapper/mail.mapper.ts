"use strict";

import { SESClient, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { emailParams } from '../data/email-params';
import { emailHeader } from '../data/email.header';
import { emailFooter } from '../data/email.footer';
import { format } from 'util';
import { EmailMessaging } from '../models/EmailMessaging';
import { imageService } from '../service';

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
        this._sesClient = new SESClient({ 'region': this._REGION });
    }


    /**
     * Function that helps prepare the email
     * @param body
     */
    async prepareEmail(body) {
        this._params = emailParams;
        await this.formatBody(body);
        this._params.Source = 'KOFC Site Admin <test@kofc9544.ca>';
        this._params.ReplyToAddresses = [];
        this._params.Template = 'DefaultEmailTemplate';
        this._PARAMS_CONTENT = '';

        switch (body[this._PARAMS_EMAIL_TYPE]) {
            case EmailMessaging.EMAIL_TYPE_CALENDER_EVENT:
                this._params.Destination.ToAddresses.push('tomc@tomvisions.com');
                this._SUBJECT_CONTENT = EmailMessaging.CALENDER_EVENT_SUBJECT;
                await this.formatBody(body);
                this._HTML_CONTENT = this._PARAMS_CONTENT
               // this._HTML_CONTENT = format( this._PARAMS_CONTENT, `http://localhost:5173/reset-password/${body.token}`)
               // this._HTML_CONTENT = this._PARAMS_CONTENT.concat(format(EmailMessaging.FORGOTPASSWORD_CONTENT_HTML, key, this.checkObject(body[key])));
                this._TEXT_CONTENT = EmailMessaging.CALENDER_EVENT_CONTENT_TEXT;
                this._TO_PERSON = "Tom";
                this._EMAIL_LOGO = imageService.loadImage200x200("tomvisions-logo-email.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("waterfall-sm2.jpg")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;


            case EmailMessaging.EMAIL_TYPE_FORGOTPASSWORD:
                this._params.Destination.ToAddresses.push('tomc@tomvisions.com');
                this._SUBJECT_CONTENT = EmailMessaging.FORGOTPASSWORD_SUBJECT;
                this._HTML_CONTENT = format(EmailMessaging.FORGOTPASSWORD_CONTENT_HTML, `http://localhost:5173/reset-password/${body.token}`)
                this._TEXT_CONTENT = EmailMessaging.FORGOTPASSWORD_CONTENT_TEXT;
                this._TO_PERSON = "Tom";
                this._EMAIL_LOGO = imageService.loadImage200x200("tomvisions-logo-email.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("waterfall-sm2.jpg")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;


                break;
            case EmailMessaging.EMAIL_TYPE_CONTACT:
                this._params.Destination.ToAddresses.push('tomc@tomvisions.com');

                this._SUBJECT_CONTENT = EmailMessaging.CONTACT_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.CONTACT_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.CONTACT_CONTENT_TEXT;
                this._TO_PERSON = "Tom";
                this._EMAIL_LOGO = imageService.loadImage200x200("tomvisions-logo-email.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("waterfall-sm2.jpg")
               
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;

                break;


            case EmailMessaging.EMAIL_TYPE_CONTACTUS:
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('resolvewithmarc@sympatico.ca');

                this._SUBJECT_CONTENT = EmailMessaging.CONTACTUS_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.CONTACTUS_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.CONTACTUS_CONTENT_TEXT;
                this._TO_PERSON = "Marc";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;

            case EmailMessaging.EMAIL_TYPE_REGISTER:
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('golfregistration@kofc9544.ca');
                this._SUBJECT_CONTENT = EmailMessaging.REGISTER_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.REGISTER_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.REGISTER_CONTENT_TEXT;
                this._TO_PERSON = "Richard";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                await this.apiSendMail();


                this._params.Destination.ToAddresses = [];
                this._params.Destination.ToAddresses.push(body['players'][0]['email']);
                this._params.Destination.BccAddresses.push('tomc@tomvisions.com');

                this._SUBJECT_CONTENT = EmailMessaging.REGISTERCONTACTSENDER_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.REGISTERCONTACTSENDER_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.REGISTERCONTACTSENDER_CONTENT_TEXT;
                this._TO_PERSON = body['players'][0]['player'];
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")
                this._PARAMS_CONTENT = '';
                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;

                break;

            case EmailMessaging.EMAIL_TYPE_VOLUNTEER:
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('resolvewithmarc@sympatico.ca');

                this._SUBJECT_CONTENT = EmailMessaging.VOLUNTEER_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.VOLUNTEER_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.VOLUNTEER_CONTENT_TEXT;
                this._TO_PERSON = "Marc";
                this._EMAIL_LOGO = imageService.loadImage200x200("kofc-logo.png")
                this._EMAIL_BANNER = imageService.loadImage600x300("loch-march-background.jpeg")

                this._params.TemplateData = `{\"NAME\":\"${this._TO_PERSON}\",\"EMAIL_LOGO\":\"${this._EMAIL_LOGO}\", \"EMAIL_BANNER\":\"${this._EMAIL_BANNER}\", \"SUBJECT_CONTENT\":\"${this._SUBJECT_CONTENT}\",\"HTML_CONTENT\":\"${this._HTML_CONTENT}\",\"PARAMS_CONTENT\":\"${this._PARAMS_CONTENT}\",  \"TEXT_CONTENT\":\"${this._TEXT_CONTENT}\"}`;
                break;

            case EmailMessaging.EMAIL_TYPE_SPONSOR:
                this._params.Destination.ToAddresses.push('tcruicksh@gmail.com');
                this._params.Destination.ToAddresses.push('n.rolheiser@gmail.com');
                this._SUBJECT_CONTENT = EmailMessaging.SPONSOR_SUBJECT;
                this._HTML_CONTENT = EmailMessaging.SPONSOR_CONTENT_HTML;
                this._TEXT_CONTENT = EmailMessaging.SPONSOR_CONTENT_TEXT;
                this._TO_PERSON = "Nick";
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
        if (typeof data === 'string') {
            return data;
        }

        let stringData = "";

        for (let row of data) {
            let format = `<p>player: ${row['player']}</p><p>email: ${row['email']}</p><p>phone: ${row['phone']}</p>`;
            stringData = stringData.concat(" ", format);
        }

        return stringData;
    }
    async apiSendMail() {
        console.log(this._params);
        return await this._sesClient.send(new SendTemplatedEmailCommand(this._params));
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
