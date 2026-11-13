import * as z from "zod";
export declare const validCreationNamesRegex: RegExp;
export declare const accountSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    origin: z.ZodString;
    description: z.ZodString;
    createdAt: z.ZodCoercedDate<unknown>;
    lastModifiedAt: z.ZodCoercedDate<unknown>;
}, z.core.$strip>;
export type Account = z.infer<typeof accountSchema>;
export declare const createAccountSchema: z.ZodObject<{
    name: z.ZodString;
    password: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type CreateAccount = z.infer<typeof createAccountSchema>;
export declare const accountCredentialsSchema: z.ZodObject<{
    name: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type AccountCredentials = z.infer<typeof accountCredentialsSchema>;
export declare const modifyAccountDataSchema: z.ZodIntersection<z.ZodObject<{
    currentPassword: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    name: z.ZodExactOptional<z.ZodString>;
    password: z.ZodExactOptional<z.ZodString>;
    description: z.ZodExactOptional<z.ZodDefault<z.ZodString>>;
}, z.core.$strip>>;
export type ModifyAccountData = z.infer<typeof modifyAccountDataSchema>;
export declare const successfulLoginDataSchema: z.ZodObject<{
    account: z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        origin: z.ZodString;
        description: z.ZodString;
        createdAt: z.ZodCoercedDate<unknown>;
        lastModifiedAt: z.ZodCoercedDate<unknown>;
    }, z.core.$strip>;
    token: z.ZodString;
}, z.core.$strip>;
export type SuccessfulLoginData = z.infer<typeof successfulLoginDataSchema>;
//# sourceMappingURL=account.d.ts.map