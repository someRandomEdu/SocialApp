import * as z from "zod";
export declare const messageSchema: z.ZodObject<{
    id: z.ZodString;
    senderAccount: z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
    }, z.core.$strip>;
    receiver: z.ZodUnion<[z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
        type: z.ZodLiteral<"room">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
        type: z.ZodLiteral<"account">;
    }, z.core.$strip>]>;
    replyToMessage: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        isFromDmPartner: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    content: z.ZodString;
    createdAt: z.ZodCoercedDate<unknown>;
    lastModifiedAt: z.ZodCoercedDate<unknown>;
}, z.core.$strip>;
export declare const messageArraySchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    senderAccount: z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
    }, z.core.$strip>;
    receiver: z.ZodUnion<[z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
        type: z.ZodLiteral<"room">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
        type: z.ZodLiteral<"account">;
    }, z.core.$strip>]>;
    replyToMessage: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        isFromDmPartner: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    content: z.ZodString;
    createdAt: z.ZodCoercedDate<unknown>;
    lastModifiedAt: z.ZodCoercedDate<unknown>;
}, z.core.$strip>>;
export type Message = z.infer<typeof messageSchema>;
export type MessageArray = z.infer<typeof messageArraySchema>;
export declare const createMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strip>;
export type CreateMessage = z.infer<typeof createMessageSchema>;
export declare const modifyMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, z.core.$strip>;
export type ModifyMessage = z.infer<typeof modifyMessageSchema>;
//# sourceMappingURL=message.d.ts.map