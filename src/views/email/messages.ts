/** Email types, as sent in `email_type` by the site's forms and used internally. */
export const EmailType = {
    CalendarEvent: "calender",
    ForgotPassword: "forgot",
    ContactUs: "contact_us",
    Register: "register",
    PlayerConfirmation: "send_id",
    Volunteer: "volunteer",
    Sponsor: "sponsor",
} as const;
export type EmailType = (typeof EmailType)[keyof typeof EmailType];

/** Subject, plain-text intro and HTML intro of each email. `%s` is filled in where noted. */
export const messages = {
    calendarEvent: {
        subject: "New Calender Event has just been posted",
        text: "A new event has been posted on the KOFC Calender:\n",
    },
    forgotPassword: {
        subject: "Forgot Password",
        text: "You are receiving this email in order to reset your password:\n",
        /** %s: the reset link. */
        html: '<p>You are receiving this email in order to reset your password</p><p><a href="%s"><button>Reset Password</button></a></p>',
    },
    contactUs: {
        subject: "Email From Information Page",
        text: "You have received a message from the Contact Us Form:\n",
        html: "<p>You have received a message from the Contact Us Form:</p>",
    },
    register: {
        subject: "Email From Register Form",
        text: "You have received a submission from register form:\n",
        html: "<p>You have received a submission from register form:</p>",
    },
    playerConfirmation: {
        subject: "Registration confirmed! - Knights of Columbus Golf Tournament",
        text: "Your registration has been received. Please send payment ($175/person) via e-transter to registration@kofc9544.ca.<br><br>     OR by mail to 152 Springcreek Crescent, Kanata Ontario K2M 2M1 with cheque payable to Knights of Columbus 9544 Charity Golf Tournament\n",
        /** %s: the player's id, their payment reference. */
        html: '<p>Your registration has been received. Please send your payment of $175 via e-transter to <a href="mailto:registration@kofc9544.ca">registration@kofc9544.ca</a> with your <strong>ID #%s</strong> in the notes.<br><br>If paying by cheque, make the cheque payable to <strong>Knights of Columbus 9544 Charity Golf Tournament</strong> and mail it to Holy Redeemer Parish at 44 Rothesay Dr, Kanata, ON K2L 2X1,  with your ID (above) written on the cheque.</p><p>Thank you for your support!</p>',
    },
    volunteer: {
        subject: "Email From Volunteer Form",
        text: "You have received a message from the Volunteer Form:\n",
        html: "<p>You have received a message from the Membership Form:</p>",
    },
    sponsor: {
        subject: "Email From Sponsor Form",
        text: "You have received a message from the Sponsor Form:\n",
        html: "<p>You have received a message from the Membership Form:</p>",
    },
} as const;
