import { HttpStatusCodes, ProblemDetail } from "../shared/net.ts";
import { err, ok } from "../shared/utils.ts";
import { AppService } from "./appService.ts";
import * as z from "zod";
import { serverApiRoute } from "./utils.ts";
import { Request } from "express";
import { decodeJwt, decodeProtectedHeader, JWTHeaderParameters, JWTPayload, jwtVerify, JWTVerifyOptions, SignJWT, SignOptions } from "jose";
import { tryVerifyJwt } from "../shared/jwt.ts";

const publicKeySchema = z.object({
    algorithm: z.string(),
    format: z.string(),
    encoding: z.string(),
    value: z.string()
});

export type PublicKey = z.infer<typeof publicKeySchema>;
export const originServerHeaderName = "X-Origin-Server";

export async function initServerService(app: AppService) {
    const e = app.expressInstance;
    const route = serverApiRoute;
    // process.loadEnvFile("./secrets/.env");
    const algorithm = Object.freeze({ name: "Ed25519" } as const);
    const alphabet = Object.freeze({ alphabet: "base64url" });
    const { publicKey, privateKey } = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
    const publicKeyStr = new Uint8Array(await crypto.subtle.exportKey("spki", publicKey)).toBase64(alphabet);

    e.get(`${route}/public-key`, (_, res) => {
        return res.setHeader("content-type", "application/json").status(HttpStatusCodes.Ok).send({
            algorithm: "Ed25519",
            format: "spki",
            encoding: "base64url",
            value: publicKeyStr
        } satisfies PublicKey);
    });

    const keys: Record<string, CryptoKey> = Object.create(null);

    return Object.freeze({
        originServerHeaderName,

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

        /**
         * Verifies and returns the header and the payload of a JWT if it's a valid JWT string 
         * coming from the specified server inside that JWT string, or an error object containing the details of the error 
         * caused when verifying.
         */
        async tryVerifyForeignToken(token: string, options?: JWTVerifyOptions) {
            try {
                const p = decodeJwt(token);
                const origin = p.iss;

                if (typeof origin !== "string") {
                    return err("Token origin is not a string!");
                }

                const publicKey = await this.publicKeyOfOrigin(origin);

                if (!publicKey) {
                    return err(`Can't get the public key of the server ${origin}!`);
                }

                return ok(await jwtVerify(token, publicKey, options));
            } catch (e) {
                return err(String(e));
            }
        },

        /**
         * Verifies and returns the header and the payload of a JWT if it's a valid JWT string coming from this server, 
         * or an error object containing the details of the error caused when verifying.
         */
        async tryVerifyLocalToken(token: string, options?: JWTVerifyOptions) {
            try {
                return ok(await jwtVerify(token, publicKey, options));
            } catch (e) {
                return err(String(e));
            }
        }
    } as const);
}

export type ServerService = Awaited<ReturnType<typeof initServerService>>;
