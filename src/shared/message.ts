import { EntitySchema } from "typeorm";
import { accountIdSchema, EntityType, EntityTypes, roomIdSchema, untypedIdSchema } from "./id.ts";
import * as z from "zod";

export const messageSchema = z.object({
    id: z.int(),
    content: z.string(),
    createdAt: z.date(),
    lastModifiedAt: z.date(),
    senderAccount: untypedIdSchema,
    target: accountIdSchema.or(roomIdSchema)
});

export type Message = z.infer<typeof messageSchema>;

export type DbMessage = {
    id: number;
    content: string;
    createdAt: Date;
    lastModifiedAt: Date;
    senderAccountId: number;
    senderAccountOrigin: string;
    targetId: number;
    targetOrigin: string;
    targetType: Exclude<EntityType, typeof EntityTypes.Message>;
};

export const createMessageSchema = messageSchema.omit({
    id: true,
    createdAt: true,
    lastModifiedAt: true
});

export const messageDbSchema = new EntitySchema<DbMessage>({
    name: "messages",

    columns: {
        id: { type: "int", primary: true },
        content: { type: String, nullable: false },
        createdAt: { type: Date, nullable: false },
        lastModifiedAt: { type: Date, nullable: false },
        senderAccountId: { type: "int", nullable: false },
        senderAccountOrigin: { type: String, nullable: false },
        targetId: { type: "int", nullable: false },
        targetOrigin: { type: String, nullable: false },
        targetType: { type: String, nullable: false }
    }
});

export type CreateMessage = z.infer<typeof createMessageSchema>;
