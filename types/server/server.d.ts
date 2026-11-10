import * as z from "zod";
export declare const keySchema: z.ZodObject<{
    algorithm: z.ZodString;
    format: z.ZodString;
    encoding: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>;
export type Key = z.infer<typeof keySchema>;
//# sourceMappingURL=server.d.ts.map