import { DataSource, EntitySchema } from "typeorm";
import { EntityTypes } from "../shared/id.ts";
export type DbAccount = {
    readonly id: number;
    passwordHash: string;
    name: string;
    description: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
};
export declare const dbAccountSchema: EntitySchema<DbAccount>;
export type DbMessage = {
    readonly id: string;
    readonly senderAccountId: number;
    readonly senderAccountOrigin: string;
    readonly receiverId: number;
    readonly receiverType: typeof EntityTypes.Room | typeof EntityTypes.Account;
    readonly createdAt: Date;
    lastModifiedAt: Date;
    content: string;
} & ({
    readonly replyToMessageIsFromDmPartner: false;
    readonly replyToMessageId?: null;
} | {
    readonly replyToMessageIsFromDmPartner: true;
    readonly replyToMessageId: string;
});
export type DbRoom = {
    readonly id: number;
    name: string;
    isPublic: boolean;
    description: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
    ownerAccountId: number;
    ownerAccountOrigin: string;
};
export type DbRoomMember = {
    readonly id: number;
    readonly roomId: number;
    readonly accountId: number;
    readonly accountOrigin: string;
};
export type DbRoomBannedMember = {
    readonly id: number;
    readonly roomId: number;
    readonly accountId: number;
    readonly accountOrigin: string;
};
export type DbRoomInviteToken = {
    readonly id: number;
    readonly roomId: number;
    readonly token: string;
};
export declare const dbMessageSchema: EntitySchema<DbMessage>;
export declare const dbRoomSchema: EntitySchema<DbRoom>;
export declare const dbRoomMemberSchema: EntitySchema<DbRoomMember>;
export declare const dbRoomBannedMemberSchema: EntitySchema<DbRoomBannedMember>;
export declare const dbRoomInviteToken: EntitySchema<DbRoomInviteToken>;
export declare function initDataSource(port: number): Promise<DataSource>;
//# sourceMappingURL=db.d.ts.map