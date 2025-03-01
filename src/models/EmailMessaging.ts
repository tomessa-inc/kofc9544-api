const os = require('node:os');

export class EmailMessaging
{
    static EMAIL_TYPE_CONTACT = 'contact';
    static EMAIL_TYPE_FORGOTPASSWORD = 'forgot';
    static EMAIL_TYPE_CALENDER_EVENT = 'calender';

    static EMAIL_TYPE_CONTACTUS = 'contact_us';
    static EMAIL_TYPE_REGISTER = 'register';
    static EMAIL_TYPE_SEND_ID = 'send_id';

    static EMAIL_TYPE_VOLUNTEER = 'volunteer';
    static EMAIL_TYPE_SPONSOR = 'sponsor';

    static CONTACT_SUBJECT = '%s';
    static CONTACT_CONTENT_TEXT = `You have received a message from the Contact Form:\\n%s`;
    static CONTACT_CONTENT_HTML = '<p>You have received a message from the Contact Form:</p><p>%s</p>';

    static CALENDER_EVENT_SUBJECT = 'New Calender Event has just been posted';
    static CALENDER_EVENT_CONTENT_TEXT = `A new event has been posted on the KOFC Calender:\\n`;
    static CALENDER_EVENT_CONTENT_HTML = '<p>A new event has been posted on the KOFC Calender. You are receiving this email to alert you.in order to reset your password</p><p><a href=\\\"%s\\\"><button>Reset Password</button></a></p>';



    static FORGOTPASSWORD_SUBJECT = 'Forgot Password';
    static FORGOTPASSWORD_CONTENT_TEXT = `You have received a message from the Contact Us Form:\\n`;
    static FORGOTPASSWORD_CONTENT_HTML = '<p>You are receiving this email in order to reset your password</p><p><a href=\\\"%s\\\"><button>Reset Password</button></a></p>';


    static CONTACTUS_SUBJECT = 'Email From Information Page';
    static CONTACTUS_CONTENT_TEXT = `You have received a message from the Contact Us Form:\\n`;
    static CONTACTUS_CONTENT_HTML = '<p>You have received a message from the Contact Us Form:</p>';

    static REGISTER_SUBJECT = 'Email From Register Form';
    static REGISTER_CONTENT_TEXT = `You have received a submission from register form:\\n`;
    static REGISTER_CONTENT_HTML = '<p>You have received a submission from register form:</p>';

    static REGISTERCONTACTSENDER_SUBJECT = 'Registration confirmed! - Knights of Columbus Golf Tournament';
    static REGISTERCONTACTSENDER_CONTENT_TEXT = `Your registration has been received. Please send payment ($175/person) via e-transter to golfregistration@kofc9544.ca.<br><br>     OR by mail to 152 Springcreek Crescent, Kanata Ontario K2M 2M1 with cheque payable to Knights of Columbus 9544 Charity Golf Tournament\\n`;
    static REGISTERCONTACTSENDER_CONTENT_HTML = "<p>Your registration has been received. Please send your payment of $175 via e-transter to <a href=\\\"mailto:golfregistration@kofc9544.ca\\\">golfregistration@kofc9544.ca</a> with your <strong>ID #%s</strong> in the notes.<br><br>If paying by cheque, make the cheque payable to <strong>Knights of Columbus 9544 Charity Golf Tournament</strong> and mail it to Holy Redeemer Parish at 44 Rothesay Dr, Kanata, ON K2L 2X1,  with your ID (above) written on the cheque.</p><p>Thank you for your support!</p>";

    static VOLUNTEER_SUBJECT = 'Email From Volunteer Form';
    static VOLUNTEER_CONTENT_TEXT = `You have received a message from the Volunteer Form:\\n`;
    static VOLUNTEER_CONTENT_HTML = '<p>You have received a message from the Membership Form:</p>';

    static SPONSOR_SUBJECT = 'Email From Sponsor Form';
    static SPONSOR_CONTENT_TEXT = `You have received a message from the Sponsor Form:\\n`;
    static SPONSOR_CONTENT_HTML = '<p>You have received a message from the Membership Form:</p>';

    static PARAMS_CONTENT = '<p>%s: %s</p>';
}
