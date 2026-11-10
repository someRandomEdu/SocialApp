import { ApiResponse, HttpStatusCode } from "../shared/net.ts";
import { Response } from "express";
export declare function sendResponse<E, S extends HttpStatusCode>(self: ApiResponse<E, S>, res: Response): void;
//# sourceMappingURL=utils.d.ts.map