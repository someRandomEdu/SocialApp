import { UntypedId } from "../shared/id.ts";
import { AppService } from "./appService.ts";
import { DbRoom, DbRoomMember } from "./db.ts";
import { ServerService } from "./serverService.ts";
import z from "zod";
import { AccountService } from "./accountService.ts";
export declare const roomInviteTokenSchema: z.ZodObject<{
    iss: z.ZodURL;
    sub: z.ZodString;
    aud: z.ZodLiteral<"account">;
    iat: z.ZodInt;
    jti: z.ZodString;
    exp: z.ZodExactOptional<z.ZodInt>;
    subjectType: z.ZodLiteral<"room">;
}, z.core.$strip>;
export declare const invitationSchema: z.ZodObject<{
    inviteCode: z.ZodString;
}, z.core.$strip>;
/** The type of the object representing the JWT payload of a room invite JWT token. */
export type RoomInviteTokenPayload = z.infer<typeof roomInviteTokenSchema>;
export declare function initRoomService(appService: AppService, serverService: ServerService, accountService: AccountService): Promise<Readonly<{
    readonly accountIsInRoom: (account: UntypedId, roomId: number) => Promise<boolean>;
    readonly isPublicRoom: (roomId: number) => Promise<boolean | null>;
    readonly accountCanViewRoom: (account: UntypedId, roomId: number) => Promise<boolean>;
    readonly hasRoom: (id: number) => Promise<boolean>;
    readonly findOneRoomBy: (room: Partial<DbRoom>) => Promise<DbRoom | null>;
    readonly findRoomsBy: (room: Partial<DbRoom>) => Promise<DbRoom[]>;
    readonly roomMembersOf: (roomId: number) => Promise<DbRoomMember[]>;
}>>;
export type RoomService = Awaited<ReturnType<typeof initRoomService>>;
//# sourceMappingURL=roomService.d.ts.map