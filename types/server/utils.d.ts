import { ApiResponse, HttpStatusCode } from "../shared/net.ts";
import { Response } from "express";
export declare const serverApiRoute = "/server";
export declare function sendResponse<E, S extends HttpStatusCode>(self: ApiResponse<E, S>, res: Response): Response<any, Record<string, any>>;
//# sourceMappingURL=utils.d.ts.map