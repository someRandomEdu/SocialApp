import { accountIdSchema, EntityTypes, roomIdSchema, untypedIdSchema } from "./id.ts";
import * as z from "zod";

export const messageSchema = z.object({
    id: z.string(),
    senderAccount: untypedIdSchema,
    receiver: roomIdSchema.or(accountIdSchema),

    replyToMessage: z.object({
        id: z.string(),
        isFromDmPartner: z.boolean().default(false)
    }).optional(),

    content: z.string(),
    createdAt: z.coerce.date(),
    lastModifiedAt: z.coerce.date()
});

export const messageArraySchema = messageSchema.array();

export type Message = z.infer<typeof messageSchema>;
export type MessageArray = z.infer<typeof messageArraySchema>;

export const createMessageSchema = z.object({
    content: z.string(),
});

export type CreateMessage = z.infer<typeof createMessageSchema>;

export const modifyMessageSchema = z.object({
    content: z.string(),
});

export type ModifyMessage = z.infer<typeof modifyMessageSchema>;

export function messageIdEq(lhs: Readonly<Message>, rhs: Readonly<Message>) {
    return lhs.id === rhs.id && lhs.senderAccount.id === rhs.senderAccount.id 
        && lhs.senderAccount.origin === rhs.senderAccount.origin;
}

export function messageIdNe(lhs: Readonly<Message>, rhs: Readonly<Message>) {
    return lhs.id !== rhs.id || lhs.senderAccount.id !== rhs.senderAccount.id 
        || lhs.senderAccount.origin !== rhs.senderAccount.origin;
}

