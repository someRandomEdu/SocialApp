import { DataSource, EntitySchema } from "typeorm";
import { Account } from "../shared/account.ts";
import { EntityType, EntityTypes } from "../shared/id.ts";
import { JWTPayload } from "jose";
import * as path from "node:path";

export type DbAccount = Omit<Account, "origin">;

export const dbAccountSchema = new EntitySchema<DbAccount>({
    name: "accounts",

    columns: {
        id: { type: "int", primary: true, generated: true },
        name: { type: String, unique: true, nullable: false  },
        password: { type: String, nullable: false },
        description: { type: String, nullable: false, default: "" },
        createdAt: { type: Date, nullable: false },
        lastModifiedAt: { type: Date, nullable: false }
    }
});

export type DbMessage = {
    id: number;
    createdAt: Date;
    lastModifiedAt: Date;
    senderAccountId: number;
    senderAccountOrigin: string;
    receiverId: number;
    receiverOrigin: string;
    receiverType: Exclude<EntityType, typeof EntityTypes.Message>;
};

export type DbRoom = {
    id: number;
    name: string;
    privateRoom: boolean;
    createdAt: Date;
    ownerAccountId: number;
    ownerAccountOrigin: string;
};

export type DbRoomMember = {
    id: number;
    roomId: number;
    accountId: number;
    accountOrigin: string;
};

export type DbRoomBannedMember = {
    id: number;
    roomId: number;
    accountId: number;
    accountOrigin: string;
};

/** Represents a session of a particular account in the database, in a {@link JWTPayload}-like format. */
// TODO: Make DbAccountSession and AccountSession use a more readable scheme?
export type DbAccountSession = {
    /** The Id of the session object itself. */
    jti: number;

    /** The Id of the account associated with this token. */
    sub: number;

    /** When is this session issued? */
    iat: Date;

    /** Contains either the expiry {@link Date} of this session, or null if it doesn't have a such date. */
    exp: Date | null;
};

export const dbMessageSchema = new EntitySchema<DbMessage>({
    name: "messages",

    columns: {
        id: { type: "int", primary: true, generated: true },
        createdAt: { type: Date, nullable: false },
        lastModifiedAt: { type: Date, nullable: false },
        senderAccountId: { type: "int", nullable: false },
        senderAccountOrigin: { type: String, nullable: false },
        receiverId: { type: "int", nullable: false },
        receiverOrigin: { type: String, nullable: false },
        receiverType: { type: String, nullable: false },
    }
});

export const dbRoomSchema = new EntitySchema<DbRoom>({
    name: "rooms",

    columns: {
        id: { type: "int", primary: true },
        name: { type: String, nullable: false },
        privateRoom: { type: Boolean, nullable: false, default: false },
        createdAt: { type: Date, nullable: false },
        ownerAccountId: { type: "int", nullable: false },
        ownerAccountOrigin: { type: String, nullable: false }
    },
});

export const dbRoomMemberSchema = new EntitySchema<DbRoomMember>({
    name: "roomMembers",

    columns: {
        id: { type: "int", primary: true },
        roomId: { type: "int", nullable: false },
        accountId: { type: "int", nullable: false },
        accountOrigin: { type: String, nullable: false }
    },

    uniques: [{ columns: ["roomId", "accountId", "accountOrigin"] }]
});

export const dbRoomBannedMemberSchema = new EntitySchema<DbRoomBannedMember>({
    name: "roomBannedMembers",

    columns: {
        id: { type: "int", primary: true, generated: true },
        roomId: { type: "int", nullable: false },
        accountId: { type: "int", nullable: false },
        accountOrigin: { type: "int", nullable: false },
    },

    uniques: [{ columns: ["roomId", "accountId", "accountOrigin"] }],
});

export const dbAccountSessionSchema = new EntitySchema<DbAccountSession>({
    name: "accountSessions",

    columns: {
        jti: { type: "int", primary: true, generated: true },
        sub: { type: "int", nullable: false },
        iat: { type: Date, nullable: false },
        exp: { type: Date, nullable: true, default: null },
    }
});

export async function createDataSource() {
    return await new DataSource({
        type: "better-sqlite3",
        database: path.join(import.meta.dirname, "..", "..", "data", "serverData.db"),
        entities: [dbAccountSchema, dbMessageSchema, dbRoomSchema, dbRoomBannedMemberSchema, dbAccountSessionSchema],
        synchronize: true
    }).initialize();
}
