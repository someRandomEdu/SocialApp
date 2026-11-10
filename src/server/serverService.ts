import { HttpStatusCodes } from "../shared/net.ts";
import { err, ok, toUnixSeconds } from "../shared/utils.ts";
import { AppService } from "./appService.ts";
import * as z from "zod";
import { JWTHeaderParameters, JWTPayload, SignJWT, SignOptions } from "jose";
import { DbAccount, DbMessage } from "./db.ts";
import { EntityTypes } from "../shared/id.ts";
import { Message } from "../shared/message.ts";

export const publicKeySchema = z.object({
    algorithm: z.string(),
    format: z.string(),
    encoding: z.string(),
    value: z.string()
});

export type PublicKey = z.infer<typeof publicKeySchema>;

export const customJwtPayloadClaims = Object.freeze({
    subjectType: "subjectType",
    issuerAccountId: "issuerAccountId",
    issuerAccountOrigin: "issuerAccountOrigin"
} as const);

export const accountTokenPayloadSchema = z.object({
    iss: z.url(),
    sub: z.string().transform(Number).pipe(z.int()),
    iat: z.int().transform((seconds) => new Date(Math.trunc(seconds * 1000))).pipe(z.date()),
    jti: z.string(),
    exp: z.int().transform((seconds) => new Date(Math.trunc(seconds * 1000))).pipe(z.date()).exactOptional(),
    [customJwtPayloadClaims.subjectType]: z.literal([EntityTypes.Account])
});

export type AccountTokenPayloadInput = z.input<typeof accountTokenPayloadSchema>;
export type AccountTokenPayloadOutput = z.infer<typeof accountTokenPayloadSchema>;

export async function initServerService(appService: AppService) {
    const e = appService.expressInstance;
    const route = "/server";
    const algorithm = Object.freeze({ name: "Ed25519" } as const);
    const alphabet = Object.freeze({ alphabet: "base64url" });
    const { publicKey, privateKey } = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
    const publicKeyStr = new Uint8Array(await crypto.subtle.exportKey("spki", publicKey)).toBase64(alphabet);

    e.get(`${route}/public-key`, (_, res) => {
        return res.status(HttpStatusCodes.Ok).type("application/json").send({
            algorithm: "Ed25519",
            format: "spki",
            encoding: "base64url",
            value: publicKeyStr
        } satisfies PublicKey);
    });

    e.post(`${route}/echo{/*pathParams}`, async (req, res) => {
        return res.status(HttpStatusCodes.Ok).send({
            params: req.params.pathParams ?? [],
            query: req.query,
            header: req.headers,
            cookies: req.cookies,
            body: req.body
        });
    });

    const keys: Record<string, CryptoKey> = Object.create(null);
    keys[appService.origin] = publicKey;
    console.log("Initialized server service!");

    async function signJwt(header: JWTHeaderParameters, payload?: JWTPayload, signOptions?: SignOptions) {
        return await new SignJWT(payload).setProtectedHeader(header).sign(privateKey, signOptions);
    }

    const subjectType = customJwtPayloadClaims.subjectType;

    const serverToken = await signJwt({ alg: "Ed25519", typ: "JWT" }, {
        iss: appService.origin,
        sub: appService.origin,
        iat: toUnixSeconds(new Date()),
        jti: crypto.randomUUID(),
        [subjectType]: EntityTypes.Server
    });

    return Object.freeze({
        publicKey,
        serverToken,
        customJwtPayloadClaims,
        signJwt,

        async sign(data: BufferSource) {
            return await crypto.subtle.sign(algorithm, privateKey, data);
        },

        async verify(signature: BufferSource, data: BufferSource) {
            return await crypto.subtle.verify(algorithm, publicKey, signature, data);
        },

        async importPublicKey(k: PublicKey) {
            return await crypto.subtle.importKey("spki", Uint8Array.fromBase64(k.value, alphabet), algorithm, true, ["verify"]);
        },

        /**
         * Returns an object describing the public key of a server, or undefined if that object can't be obtained.
         */
        async publicKeyOfOrigin(origin: string) {
            const k = keys[origin];

            if (k) {
                return k;
            }

            try {
                const r = await fetch(`${origin}/server/public-key`);

                if (r.status !== HttpStatusCodes.Ok) {
                    return undefined;
                }

                const d = publicKeySchema.safeParse(await r.json());

                if (!d.success) {
                    return undefined;
                }

                const parsedKey = d.data;
                const importedKey = await this.importPublicKey(parsedKey);
                keys[origin] = importedKey;
                return importedKey;
            } catch (e) {
                return undefined;
            }
        },

        async tryGetPublicKeyOfOrigin(origin: unknown) {
            if (typeof origin !== "string") {
                return err(`Origin is not a string!`)
            }

            const k = keys[origin];

            if (k) {
                return ok(k);
            }

            try {
                const r = await fetch(`${origin}/server/public-key`);

                if (r.status !== HttpStatusCodes.Ok) {
                    return err(`Server ${origin} didn't return a successful request!`);
                }

                const d = publicKeySchema.safeParse(await r.json());

                if (!d.success) {
                    appService.log.error(`Error while parsing the public key of server with origin ${origin}: ${d.error}`);
                    return err(`Server didn't return a suitable key format!`);
                }

                const parsedKey = d.data;
                const importedKey = await this.importPublicKey(parsedKey);
                keys[origin] = importedKey;
                return ok(importedKey);
            } catch (e) {
                appService.log.error(`Error while getting the key of server ${origin}: ${e}`);
                return err(String(e));
            }
        },

        tryGetBearerToken(rawToken: unknown) {
            if (typeof rawToken !== "string") {
                return err("Token's not a string!");
            }

            const s = rawToken.split(" ", 2);

            if (s.length !== 2 || s[0]?.toLowerCase() !== "bearer") {
                return err("Token doesn't follow the Bearer scheme!");
            }

            return ok(s[1]!);
        },

        async generateAccountSessionToken({ id }: DbAccount, exp?: Date) {
            const payload: JWTPayload = {
                iss: appService.origin,
                sub: String(id),
                iat: toUnixSeconds(new Date()),
                jti: crypto.randomUUID(),
                [subjectType]: EntityTypes.Account
            };

            if (exp) {
                payload.exp = toUnixSeconds(exp);
            }

            return await this.signJwt({ alg: "Ed25519", typ: "JWT" }, payload);
        },

        async generateServerSessionToken(exp?: Date) {
            const payload: JWTPayload = {
                iss: appService.origin,
                sub: appService.origin,
                iat: toUnixSeconds(new Date()),
                jti: crypto.randomUUID(),
                subjectType: EntityTypes.Server
            };

            if (exp !== undefined) {
                payload.exp = toUnixSeconds(exp);
            }

            return await this.signJwt({ alg: "Ed25519", typ: "JWT" }, payload);
        },

        toMessage(m: DbMessage): Message {
            return {
                id: m.id,
                senderAccount: { id: m.senderAccountId, origin: m.senderAccountOrigin },
                receiver: { id: m.receiverId, origin: appService.origin, type: m.receiverType },
                content: m.content,
                createdAt: m.createdAt,
                lastModifiedAt: m.lastModifiedAt
            };
        }
    } as const);
}

export type ServerService = Awaited<ReturnType<typeof initServerService>>;
