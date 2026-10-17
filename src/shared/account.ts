import * as z from "zod";

export const validCreationNamesRegex = /\w+/;

export function isValidUsername(username: string) {
    const r = validCreationNamesRegex.exec(username);
    return r !== null && r.length === 1 && r[0] === username;
}

export type FullUsername = `${string}@${string}`;

export const accountSchema = z.object({
    id: z.int(),
    name: z.string(),
    password: z.string(),
    origin: z.url(),
    description: z.string(),
    createdAt: z.coerce.date(),
    lastModifiedAt: z.coerce.date(),
});

export type Account = z.infer<typeof accountSchema>;
export type PublicAccount = Omit<Account, "password">;

export const createAccountSchema = accountSchema.omit({
    id: true,
    origin: true,
    createdAt: true,
    lastModifiedAt: true
});

export type CreateAccount = z.infer<typeof createAccountSchema>;

export const accountCredSchema = accountSchema.omit({
    id: true,
    origin: true,
    description: true,
    createdAt: true,
    lastModifiedAt: true
});

export type AccountCred = z.infer<typeof accountCredSchema>;

export const modifyAccountSchema = accountSchema.omit({
    id: true,
    origin: true,
    createdAt: true,
    lastModifiedAt: true
}).exactPartial();

export type ModifyAccount = z.infer<typeof modifyAccountSchema>;

/** A {@link JWTPayload}-like type representing a session. */
export type AccountSession = {
    /** The Id of the session object itself. */
    jti: number;

    /** The origin {@link URL} of the home server of that account. */
    iss: URL;

    /** The Id of the account associated with this token. */
    sub: number;

    /** When is this session issued? */
    iat: Date;

    /** Contains either the expiry {@link Date} of this session, or null if it doesn't have a such date. */
    exp: Date | null;
};
