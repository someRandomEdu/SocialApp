import * as z from "zod";

export const validOriginNamesRegex = /[\w-.~]+/; 

export const EntityTypes = Object.freeze({
    Account: "account",
    Message: "message",
    Room: "room",
} as const);

export type EntityTypeKey = keyof typeof EntityTypes;
export type EntityType = typeof EntityTypes[EntityTypeKey];

// databases should store type-erased ones since id types can be inferred from the table
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

export const messageIdSchema = untypedIdSchema.safeExtend({
    type: z.literal(EntityTypes.Message)
});

export const roomIdSchema = untypedIdSchema.safeExtend({
    type: z.literal(EntityTypes.Room)
});

export type AccountId = z.infer<typeof accountIdSchema>;
export type MessageId = z.infer<typeof messageIdSchema>;
export type RoomId = z.infer<typeof roomIdSchema>;
