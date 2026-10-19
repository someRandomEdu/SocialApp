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
    readonly id: number;
    readonly senderAccountId: number;
    readonly senderAccountOrigin: string;
    readonly receiverId: number;
    readonly receiverOrigin: string;
    readonly receiverType: Exclude<EntityType, typeof EntityTypes.Message>;
    content: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
};

export type DbRoom = {
    readonly id: number;
    name: string;
    isPublic: boolean;
    readonly createdAt: Date;
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

/** Represents a session of a particular account in the database, in a {@link JWTPayload}-like format. */
// TODO: Make DbAccountSession and AccountSession use a more readable scheme?
export type DbAccountSession = {
    /** The Id of the session object itself. */
    readonly jti: number;

    /** The Id of the account associated with this token. */
    readonly sub: number;

    /** When is this session issued? */
    readonly iat: Date;

    /** Contains either the expiry {@link Date} of this session, or null if it doesn't have a such date. */
    readonly exp: Date | null;
};

export const dbMessageSchema = new EntitySchema<DbMessage>({
    name: "messages",

    columns: {
        id: { type: "int", primary: true, generated: true },
        senderAccountId: { type: "int", primary: true },
        senderAccountOrigin: { type: String, primary: true },
        receiverId: { type: "int", primary: true },
        receiverOrigin: { type: String, primary: true },
        receiverType: { type: String, primary: true },
        content: { type: String, nullable: false },
        createdAt: { type: Date, nullable: false },
        lastModifiedAt: { type: Date, nullable: false },
    }
});

export const dbRoomSchema = new EntitySchema<DbRoom>({
    name: "rooms",

    columns: {
        id: { type: "int", primary: true },
        name: { type: String, nullable: false },
        isPublic: { type: Boolean, nullable: false, default: false },
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
