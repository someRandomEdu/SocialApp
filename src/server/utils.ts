import { ApiResponse, HttpStatusCode } from "../shared/net.ts";
import { Response } from "express";

export const serverApiRoute = `/server`;

export function sendResponse<E, S extends HttpStatusCode>(self: ApiResponse<E, S>, res: Response) {
    return res.status(self.status).send(self.entity);
}
