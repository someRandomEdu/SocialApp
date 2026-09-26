import { HttpResponse, HttpStatusCode } from "../shared/net.ts";
import { Response } from "express";

export function sendResponse<E, S extends HttpStatusCode>(self: HttpResponse<E, S>, res: Response) {
    res.status(self.status).send(self.entity);
}
