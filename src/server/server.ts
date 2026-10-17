import * as z from "zod";

export const keySchema = z.object({
    algorithm: z.string(),
    format: z.string(),
    encoding: z.string(),
    value: z.string()
});

export type Key = z.infer<typeof keySchema>;
