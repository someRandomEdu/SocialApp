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

export const publicAccountSchema = z.object({
    id: z.number(),
    name: z.string(),
    origin: z.string(),
    description: z.string(),
    createdAt: z.coerce.date(),
    lastModifiedAt: z.coerce.date()
});

export type PublicAccount = z.infer<typeof publicAccountSchema>;

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

export const loginResultSchema = z.object({
    account: publicAccountSchema,
    token: z.string()
});

export type LoginResult = z.infer<typeof loginResultSchema>;
