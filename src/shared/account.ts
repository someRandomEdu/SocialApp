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

export type Account = {
    readonly id: number;
    password: string;
    name: string;
    readonly origin: string;
    description: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
};

export type PublicAccount = {
    readonly id: number;
    name: string;
    readonly origin: string;
    description: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
};

export const createAccountSchema = z.object({
    name: z.string(),
    password: z.string(),
    description: z.string().default("")
});

export type CreateAccount = z.infer<typeof createAccountSchema>;

export const accountCredSchema = createAccountSchema.omit({
    description: true
});

export type AccountCred = z.infer<typeof accountCredSchema>;

export const modifyAccountSchema = createAccountSchema.exactPartial();

export type ModifyAccount = z.infer<typeof modifyAccountSchema>;
