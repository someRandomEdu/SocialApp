import * as z from "zod";
export declare const createRoomSchema: z.ZodObject<{
    name: z.ZodString;
    isPublic: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type CreateRoomRequest = z.infer<typeof createRoomSchema>;
export declare const roomMemberSchema: z.ZodObject<{
    accountId: z.ZodInt;
    accountOrigin: z.ZodString;
}, z.core.$strip>;
export type RoomMember = z.infer<typeof roomMemberSchema>;
export declare const roomSchema: z.ZodObject<{
    id: z.ZodInt;
    name: z.ZodString;
    isPublic: z.ZodBoolean;
    createdAt: z.ZodCoercedDate<unknown>;
    description: z.ZodString;
    ownerAccount: z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const roomArraySchema: z.ZodArray<z.ZodObject<{
    id: z.ZodInt;
    name: z.ZodString;
    isPublic: z.ZodBoolean;
    createdAt: z.ZodCoercedDate<unknown>;
    description: z.ZodString;
    ownerAccount: z.ZodObject<{
        id: z.ZodInt;
        origin: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>>;
export declare const modifyRoomSchema: z.ZodObject<{
    name: z.ZodExactOptional<z.ZodString>;
    isPublic: z.ZodExactOptional<z.ZodDefault<z.ZodBoolean>>;
    description: z.ZodExactOptional<z.ZodDefault<z.ZodString>>;
}, z.core.$strip>;
export type Room = z.infer<typeof roomSchema>;
export type RoomArray = z.infer<typeof roomArraySchema>;
export declare const createRoomInviteSchema: z.ZodObject<{
    expireAt: z.ZodExactOptional<z.ZodCoercedDate<unknown>>;
}, z.core.$strip>;
//# sourceMappingURL=room.d.ts.map