import { JWTPayload, JWTVerifyOptions, jwtVerify, SignJWT, JWTHeaderParameters, SignOptions } from "jose";
import { err, ok } from "./utils.ts";

export async function signJwt(header: JWTHeaderParameters, payload: JWTPayload, 
    key: CryptoKey, signOptions?: SignOptions) {
    return await new SignJWT(payload).setProtectedHeader(header).sign(key, signOptions);
}

export async function tryVerifyJwt(jwt: string | Uint8Array, key: CryptoKey, verifyOptions?: JWTVerifyOptions) {
    try {
        return ok(await jwtVerify(jwt, key, verifyOptions));
    } catch (e) {
        return err(String(e));
    }
}
