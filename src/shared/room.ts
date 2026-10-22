import * as z from "zod";
import { UntypedId } from "./id.ts";

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

/** TODO: simply use {@link UntypedId}...? */
export type RoomMember = z.infer<typeof roomMemberSchema>;
