/** Who receives each notification, and the addresses mail is sent from. */
export const mailRecipients = {
    contactUs: ["tcruicksh@gmail.com", "resolvewithmarc@sympatico.ca"],
    register: ["tcruicksh@gmail.com", "registration@kofc9544.ca"],
    volunteer: ["tcruicksh@gmail.com", "jpopulus@rogers.com"],
    sponsor: ["tcruicksh@gmail.com", "bmilliere@sympatico.ca", "resolvewithmarc@sympatico.ca"],
    /** Blind-copied on every player confirmation. */
    playerConfirmationBcc: ["tomc@tomvisions.com"],
} as const;

export const mailSenders = {
    registrations: "KOFC Golf Registrations <registrations@kofc9544.ca>",
    account: "KOFC <test@kofc9544.ca>",
} as const;
