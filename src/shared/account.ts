import * as z from "zod";

export const validCreationNamesRegex = /\w+/;

export const accountSchema = z.object({
    id: z.number(),
    name: z.string(),
    origin: z.string(),
    description: z.string(),
    createdAt: z.coerce.date(),
    lastModifiedAt: z.coerce.date()
});

export type Account = z.infer<typeof accountSchema>;

export const createAccountSchema = z.object({
    name: z.string(),
    password: z.string(),
    description: z.string().default("")
});

export type CreateAccount = z.infer<typeof createAccountSchema>;

export const accountCredentialsSchema = createAccountSchema.omit({
    description: true
});

export type AccountCredentials = z.infer<typeof accountCredentialsSchema>;

export const modifyAccountSchema = z.object({ 
    currentPassword: z.string() 
}).and(createAccountSchema.exactPartial());

export type ModifyAccount = z.infer<typeof modifyAccountSchema>;

export const loginDataSchema = z.object({
    account: accountSchema,
    token: z.string()
});

export type LoginData = z.infer<typeof loginDataSchema>;
