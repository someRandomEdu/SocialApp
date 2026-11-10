import * as z from "zod";
export declare const validOriginNamesRegex: RegExp;
export declare const EntityTypes: Readonly<{
    readonly Account: "account";
    readonly Message: "message";
    readonly Room: "room";
    readonly Server: "server";
}>;
export type EntityTypeKey = keyof typeof EntityTypes;
export type EntityType = typeof EntityTypes[EntityTypeKey];
export declare const untypedIdSchema: z.ZodObject<{
    id: z.ZodInt;
    origin: z.ZodString;
}, z.core.$strip>;
/** The identity of an entity of a particular type. */
export type UntypedId = z.infer<typeof untypedIdSchema>;
/** The identity of an entity of a type specified by its tag type. */
export type TypedId<T extends EntityType> = UntypedId & {
    type: T;
};
export declare const accountIdSchema: z.ZodObject<{
    id: z.ZodInt;
    origin: z.ZodString;
    type: z.ZodLiteral<"account">;
}, z.core.$strip>;
export declare const roomIdSchema: z.ZodObject<{
    id: z.ZodInt;
    origin: z.ZodString;
    type: z.ZodLiteral<"room">;
}, z.core.$strip>;
export declare const messageableId: z.ZodUnion<[z.ZodObject<{
    id: z.ZodInt;
    origin: z.ZodString;
    type: z.ZodLiteral<"room">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodInt;
    origin: z.ZodString;
    type: z.ZodLiteral<"account">;
}, z.core.$strip>]>;
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
export declare function getCanonicalDmRoomId<T extends UntypedId>([acc1, acc2]: [T, T]): [T, T];
//# sourceMappingURL=id.d.ts.map