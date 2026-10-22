import { accountIdSchema, EntityTypes, roomIdSchema, untypedIdSchema } from "./id.ts";
import * as z from "zod";

export const messageSchema = z.object({
    id: z.string(),
    senderAccount: untypedIdSchema,
    receiver: accountIdSchema.or(roomIdSchema),
    content: z.string(),
    createdAt: z.coerce.date(),
    lastModifiedAt: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

export const createMessageSchema = z.object({
    receiverId: z.int(),
    receiverType: z.literal([EntityTypes.Account, EntityTypes.Room]),
    content: z.string(),
});

export type CreateMessage = z.infer<typeof createMessageSchema>;

export const modifyMessageSchema = z.object({
    content: z.string(),
});

export type ModifyMessage = z.infer<typeof modifyMessageSchema>;
