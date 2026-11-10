import { AppService } from "./appService.ts";
import { DbAccount } from "./db.ts";
import { ServerService } from "./serverService.ts";
export declare function initAccountService(appService: AppService, serverService: ServerService): Promise<Readonly<{
    readonly findAccBy: (accData: Partial<DbAccount>) => Promise<DbAccount | null>;
    readonly verifyAccountToken: (token: string) => Promise<{
        success: true;
        data: DbAccount;
    } | {
        success: false;
        error: {
            status: 401;
            title: string;
            detail: string;
        };
    } | {
        success: false;
        error: {
            status: 404;
            title: string;
            detail: string;
        };
    }>;
    readonly verifyRawAccountToken: (rawToken: unknown) => Promise<{
        success: true;
        data: DbAccount;
    } | {
        success: false;
        error: {
            status: 404;
            title: string;
            detail: string;
        };
    } | {
        success: false;
        error: {
            status: 401;
            title: string;
        };
    }>;
    readonly verifyForeignAccountToken: (token: string) => Promise<{
        success: true;
        data: {
            id: number;
            origin: string;
        };
    } | {
        success: false;
        error: {
            status: 401;
            title: string;
            detail: string;
        };
    } | {
        success: false;
        error: {
            status: 500;
            title: string;
            detail: string;
        };
    }>;
    readonly verifyRawForeignAccountToken: (rawToken: unknown) => Promise<{
        success: true;
        data: {
            id: number;
            origin: string;
        };
    } | {
        success: false;
        error: {
            status: 500;
            title: string;
            detail: string;
        };
    } | {
        success: false;
        error: {
            status: 401;
            title: string;
        };
    }>;
}>>;
export type AccountService = Awaited<ReturnType<typeof initAccountService>>;
//# sourceMappingURL=accountService.d.ts.map