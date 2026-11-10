import * as z from "zod";
import { UntypedId, untypedIdSchema } from "./id.ts";

export const createRoomSchema = z.object({
    name: z.string(),
    isPublic: z.boolean().default(false),
    description: z.string().default("")
});

export type CreateRoomRequest = z.infer<typeof createRoomSchema>;

export const roomMemberSchema = z.object({
    accountId: z.int(),
    accountOrigin: z.string()
});

export type RoomMember = z.infer<typeof roomMemberSchema>;

export const roomSchema = z.object({
    id: z.int(),
    name: z.string(),
    isPublic: z.boolean(),
    createdAt: z.coerce.date(),
    description: z.string(),
    ownerAccount: untypedIdSchema,
});

export const roomArraySchema = roomSchema.array();

export const modifyRoomSchema = z.object({
    name: createRoomSchema.shape.name.exactOptional(),
    isPublic: createRoomSchema.shape.isPublic.exactOptional(),
    description: createRoomSchema.shape.description.exactOptional()
});

export type Room = z.infer<typeof roomSchema>;
export type RoomArray = z.infer<typeof roomArraySchema>;

export const createRoomInviteSchema = z.object({
    expireAt: z.coerce.date().exactOptional()
});
