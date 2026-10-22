import { DataSource, EntitySchema } from "typeorm";
import { Account } from "../shared/account.ts";
import { EntityType, EntityTypes } from "../shared/id.ts";
import { JWTPayload } from "jose";
import * as path from "node:path";

export type DbAccount = {
    readonly id: number;
    passwordHash: string;
    name: string;
    readonly origin: string;
    description: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
};

export const dbAccountSchema = new EntitySchema<DbAccount>({
    name: "accounts",

    columns: {
        id: { type: "int", primary: true, generated: true },
        name: { type: String, unique: true, nullable: false  },
        passwordHash: { type: String, nullable: false },
        description: { type: String, nullable: false, default: "" },
        createdAt: { type: Date, nullable: false },
        lastModifiedAt: { type: Date, nullable: false }
    }
});

export type DbMessage = {
    readonly id: string;
    readonly senderAccountId: number;
    readonly senderAccountOrigin: string;
    readonly receiverId: number;
    readonly receiverType: Exclude<EntityType, typeof EntityTypes.Message>;
    content: string;
    readonly createdAt: Date;
    lastModifiedAt: Date;
};

export type DbRoom = {
    readonly id: number;
    name: string;
    isPublic: boolean;
    description: string;
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

export const dbMessageSchema = new EntitySchema<DbMessage>({
    name: "messages",

    columns: {
        id: { type: String, primary: true },
        senderAccountId: { type: "int", primary: true },
        senderAccountOrigin: { type: String, primary: true },
        receiverId: { type: "int", nullable: false },
        receiverType: { type: String, nullable: false },
        content: { type: String, nullable: false },
        createdAt: { type: Date, nullable: false },
        lastModifiedAt: { type: Date, nullable: false },
    }
});

export const dbRoomSchema = new EntitySchema<DbRoom>({
    name: "rooms",

    columns: {
        id: { type: "int", primary: true, generated: true },
        name: { type: String, nullable: false },
        isPublic: { type: Boolean, nullable: false, default: false },
        description: { type: String, nullable: false, default: "" },
        createdAt: { type: Date, nullable: false },
        ownerAccountId: { type: "int", nullable: false },
        ownerAccountOrigin: { type: String, nullable: false }
    },
});

export const dbRoomMemberSchema = new EntitySchema<DbRoomMember>({
    name: "roomMembers",

    columns: {
        id: { type: "int", primary: true },
        
        roomId: { type: "int", nullable: false, foreignKey: { 
            target: "rooms", 
            inverseSide: "id" satisfies keyof DbRoom, 
            onDelete: "CASCADE" 
        }},

        accountId: { type: "int", nullable: false },
        accountOrigin: { type: String, nullable: false }
    },

    uniques: [{ columns: ["roomId", "accountId", "accountOrigin"] }]
});

export const dbRoomBannedMemberSchema = new EntitySchema<DbRoomBannedMember>({
    name: "roomBannedMembers",

    columns: {
        id: { type: "int", primary: true, generated: true },

        roomId: { type: "int", nullable: false, foreignKey: { 
            target: "rooms", 
            inverseSide: "id" satisfies keyof DbRoom, 
            onDelete: "CASCADE" 
        }},

        accountId: { type: "int", nullable: false },
        accountOrigin: { type: "int", nullable: false },
    },

    uniques: [{ columns: ["roomId", "accountId", "accountOrigin"] }],
});

export async function createDataSource(port: number) {
    return await new DataSource({
        type: "better-sqlite3",
        database: path.join(import.meta.dirname, "..", "..", "data", `serverData${port}.db`),
        entities: [dbAccountSchema, dbMessageSchema, dbRoomSchema, dbRoomBannedMemberSchema, dbRoomMemberSchema],
        synchronize: true
    }).initialize();
}
