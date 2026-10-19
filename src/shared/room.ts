import * as z from "zod";
import { accountSchema } from "./account.ts";
import { UntypedId } from "./id.ts";

export const roomSchema = z.object({
    id: z.int(),
    name: z.string(),
    origin: z.string(),
    createdAt: z.date()
});

export const createRoomSchema = z.object({
    name: z.string(),
    isPublic: z.boolean().default(false)
});

export type CreateRoomRequest = z.infer<typeof createRoomSchema>;

export const roomMemberSchema = z.object({
    accountId: z.int(),
    accountOrigin: z.string()
});

/** TODO: simply use {@link UntypedId}...? */
export type RoomMember = z.infer<typeof roomMemberSchema>;
