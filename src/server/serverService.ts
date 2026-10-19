import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import {err, ok, toUnixSeconds} from "../shared/utils.ts";
import { AppService } from "./appService.ts";
import * as z from "zod";
import { serverApiRoute } from "./utils.ts";
import { Request } from "express";
import {
    decodeJwt, decodeProtectedHeader,
    jwtDecrypt, JWTHeaderParameters, JWTPayload, jwtVerify, JWTVerifyOptions, SignJWT, SignOptions
} from "jose";
import {signJwt, tryVerifyJwt} from "../shared/jwt.ts";
import {UntypedId} from "../shared/id.ts";
import {dbAccountSessionSchema, dbMessageSchema} from "./db.ts";

const publicKeySchema = z.object({
    algorithm: z.string(),
    format: z.string(),
    encoding: z.string(),
    value: z.string()
});

export type PublicKey = z.infer<typeof publicKeySchema>;

export async function initServerService(app: AppService) {
    const e = app.expressInstance;
    const route = serverApiRoute;
    // process.loadEnvFile("./secrets/.env");
    const algorithm = Object.freeze({ name: "Ed25519" } as const);
    const alphabet = Object.freeze({ alphabet: "base64url" });
    const { publicKey, privateKey } = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
    const publicKeyStr = new Uint8Array(await crypto.subtle.exportKey("spki", publicKey)).toBase64(alphabet);
    const accountSessionRepo = app.dataSource.getRepository(dbAccountSessionSchema);

    e.get(`${route}/public-key`, (_, res) => {
        return res.status(HttpStatusCodes.Ok).type("application/json").send({
            algorithm: "Ed25519",
            format: "spki",
            encoding: "base64url",
            value: publicKeyStr
        } satisfies PublicKey);
    });

    const keys: Record<string, CryptoKey> = Object.create(null);
    keys[app.origin] = publicKey;

    return Object.freeze({
        async signJwt(header: JWTHeaderParameters, payload?: JWTPayload, signOptions?: SignOptions) {
            return await new SignJWT(payload).setProtectedHeader(header).sign(privateKey, signOptions);
        },

        async tryVerifyJwt(jwt: string | Uint8Array, verifyOptions?: JWTVerifyOptions) {
            return await tryVerifyJwt(jwt, publicKey, verifyOptions);
        },

        async sign(data: BufferSource) {
            return await crypto.subtle.sign(algorithm, privateKey, data);
        },

        async verify(signature: BufferSource, data: BufferSource) {
            return await crypto.subtle.verify(algorithm, publicKey, signature, data);
        },

        async importPublicKey(k: PublicKey) {
            return await crypto.subtle.importKey("spki", Uint8Array.fromBase64(k.value, 
                alphabet), algorithm, true, ["verify"]);
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

        async generateAccountSessionToken(accountId: number, exp?: Date) {
            const d = new Date();
            const payload: JWTPayload = { iss: app.origin, sub: String(accountId), iat: toUnixSeconds(d) };

            if (exp !== undefined) {
                payload.exp = toUnixSeconds(exp);
            }

            return await signJwt(
                { alg: "Ed25519", typ: "JWT" },
                payload,
                privateKey
            );
        },

        async tryAuthSessionToken(token: string, options?: JWTVerifyOptions) {
            try {
                const unverifiedPayload = decodeJwt(token);
                const origin = unverifiedPayload.iss;

                if (typeof origin !== "string") {
                    return err(`Token doesn't have an origin!`);
                }

                const publicKey = await this.publicKeyOfOrigin(origin);

                if (!publicKey) {
                    return err(`Can't get the public key of the server ${origin}, or the public key is in an invalid format!`);
                }

                const { payload } = await jwtVerify(token, publicKey, options);
                const id = Number(payload.sub);

                if (typeof id !== "number") {
                    return err(`Account Id is not valid!`);
                }

                return ok({ id, origin });
            } catch (e) {
                return err(String(e));
            }
        },

        async tryAuthLocalSessionToken(token: string, options?: JWTVerifyOptions) {
            try {
                const unverifiedPayload = decodeJwt(token);
                const origin = unverifiedPayload.iss;

                if (typeof origin !== "string") {
                    return err(`Token doesn't have an origin!`);
                }

                const { payload } = await jwtVerify(token, publicKey, options);
                const id = Number(payload.sub);

                if (typeof id !== "number") {
                    return err(`Account Id is not valid!`);
                }

                return ok({ id, origin });
            } catch (e) {
                return err(String(e));
            }
        },

        async tryAuthRawBearerSessionToken(rawToken: unknown, options?: JWTVerifyOptions) {
            if (typeof rawToken !== "string") {
                return err("Token not found!");
            }

            const s = rawToken.split(" ", 2);

            if (s.length !== 2 || s[0]?.toLowerCase() !== "bearer") {
                return err("Token doesn't follow the Bearer scheme!");
            }

            const token = s[1]!;
            return await this.tryAuthSessionToken(token, options);
        },

        async tryAuthRawBearerLocalSessionToken(rawToken: unknown, options?: JWTVerifyOptions) {
            if (typeof rawToken !== "string") {
                return err("Token not found!");
            }

            const s = rawToken.split(" ", 2);

            if (s.length !== 2 || s[0]?.toLowerCase() !== "bearer") {
                return err("Token doesn't follow the Bearer scheme!");
            }

            const token = s[1]!;
            return await this.tryAuthLocalSessionToken(token, options);
        }
    } as const);
}

export type ServerService = Awaited<ReturnType<typeof initServerService>>;
