import * as z from "zod";
import { ord, partialOrd } from "./utils";

export const validOriginNamesRegex = /[\w-.~]+/; 

export const EntityTypes = Object.freeze({
    Account: "account",
    Message: "message",
    Room: "room",
    Server: "server"
} as const);

export type EntityTypeKey = keyof typeof EntityTypes;
export type EntityType = typeof EntityTypes[EntityTypeKey];

export const untypedIdSchema = z.object({
    id: z.int(),
    origin: z.string(),
});

/** The identity of an entity of a particular type. */
export type UntypedId = z.infer<typeof untypedIdSchema>;

/** The identity of an entity of a type specified by its tag type. */
export type TypedId<T extends EntityType> = UntypedId & { type: T; };

export const accountIdSchema = untypedIdSchema.safeExtend({
    type: z.literal(EntityTypes.Account)
});

export const roomIdSchema = untypedIdSchema.safeExtend({
    type: z.literal(EntityTypes.Room)
});

export const messageableId = roomIdSchema.or(accountIdSchema);

export type AccountId = z.infer<typeof accountIdSchema>;
export type RoomId = z.infer<typeof roomIdSchema>;
export type MessageableId = z.infer<typeof messageableId>;

export type ConvoId = {
    type: typeof EntityTypes.Room;
    id: number;
    origin: string;
} | {
    type: typeof EntityTypes.Account;
    id: number;
    origin: string;
    id2: number;
    origin2: string;
};

export function getCanonicalDmRoomId<T extends UntypedId>([acc1, acc2]: [T, T]): [T, T] {
    if (acc1.id < acc2.id) {
        return [acc1, acc2];
    }

    if (acc1.id > acc2.id) {
        return [acc2, acc1];
    }

    return acc1.origin < acc2.origin ? [acc1, acc2] : [acc2, acc1];
}
