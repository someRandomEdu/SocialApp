import { AppService } from "./appService.ts";
import * as z from "zod";
import { JWTHeaderParameters, JWTPayload, SignOptions } from "jose";
import { DbAccount, DbMessage } from "./db.ts";
import { Message } from "../shared/message.ts";
export declare const publicKeySchema: z.ZodObject<{
    algorithm: z.ZodString;
    format: z.ZodString;
    encoding: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
export type PublicKey = z.infer<typeof publicKeySchema>;
export declare const customJwtPayloadClaims: Readonly<{
    readonly subjectType: "subjectType";
    readonly issuerAccountId: "issuerAccountId";
    readonly issuerAccountOrigin: "issuerAccountOrigin";
}>;
export declare const accountTokenPayloadSchema: z.ZodObject<{
    iss: z.ZodURL;
    sub: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>, z.ZodInt>;
    iat: z.ZodPipe<z.ZodPipe<z.ZodInt, z.ZodTransform<Date, number>>, z.ZodDate>;
    jti: z.ZodString;
    exp: z.ZodExactOptional<z.ZodPipe<z.ZodPipe<z.ZodInt, z.ZodTransform<Date, number>>, z.ZodDate>>;
    subjectType: z.ZodLiteral<"account">;
}, z.core.$strip>;
export type AccountTokenPayloadInput = z.input<typeof accountTokenPayloadSchema>;
export type AccountTokenPayloadOutput = z.infer<typeof accountTokenPayloadSchema>;
export declare function initServerService(appService: AppService): Promise<Readonly<{
    readonly publicKey: CryptoKey;
    readonly serverToken: string;
    readonly customJwtPayloadClaims: Readonly<{
        readonly subjectType: "subjectType";
        readonly issuerAccountId: "issuerAccountId";
        readonly issuerAccountOrigin: "issuerAccountOrigin";
    }>;
    readonly signJwt: (header: JWTHeaderParameters, payload?: JWTPayload, signOptions?: SignOptions) => Promise<string>;
    readonly sign: (data: BufferSource) => Promise<ArrayBuffer>;
    readonly verify: (signature: BufferSource, data: BufferSource) => Promise<boolean>;
    readonly importPublicKey: (k: PublicKey) => Promise<CryptoKey>;
    /**
     * Returns an object describing the public key of a server, or undefined if that object can't be obtained.
     */
    readonly publicKeyOfOrigin: (origin: string) => Promise<CryptoKey | undefined>;
    readonly tryGetPublicKeyOfOrigin: (origin: unknown) => Promise<{
        success: true;
        data: CryptoKey;
    } | {
        success: false;
        error: string;
    }>;
    readonly tryGetBearerToken: (rawToken: unknown) => {
        success: true;
        data: string;
    } | {
        success: false;
        error: string;
    };
    readonly generateAccountSessionToken: ({ id }: DbAccount, exp?: Date) => Promise<string>;
    readonly generateServerSessionToken: (exp?: Date) => Promise<string>;
    readonly toMessage: (m: DbMessage) => Message;
}>>;
export type ServerService = Awaited<ReturnType<typeof initServerService>>;
//# sourceMappingURL=serverService.d.ts.map