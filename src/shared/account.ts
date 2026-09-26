import { EntitySchema } from "typeorm";
import * as z from "zod";

export const accountSchema = z.object({
    id: z.int(),
    username: z.string(),
    password: z.string(),
    bio: z.string(),
    createdAt: z.date()
});

export type Account = z.infer<typeof accountSchema>;

export const userEntitySchema = new EntitySchema<Account>({
    name: "users",

    columns: {
        id: {
            type: "int",
            primary: true,
            generated: true
        },
        username: {
            type: String,
            unique: true,
            nullable: false
        },
        password: {
            type: String,
            nullable: false
        },
        bio: {
            type: String,
            default: ""
        },
        createdAt: {
            type: Date,
            nullable: false
        }
    }
});

export const accountSignUpDataSchema = z.object({
    username: z.string(),
    password: z.string(),
    bio: z.string().default(""),
});

export type AccountSignUpData = z.infer<typeof accountSignUpDataSchema>;

export const accountCredentialsSchema = z.object({
    username: z.string(),
    password: z.string()
});

export type AccountCredentials = z.infer<typeof accountCredentialsSchema>;
