import { UntypedId } from "./id.ts";
export type Fn<Ts extends readonly any[] = [], R = void> = (...params: Ts) => R;
/**
 * @template {T}
 * {@link Partial}, but the properties can also be explicitly set to `undefined`.
 */
export type LoosePartial<T> = {
    [P in keyof T]?: T[P] | undefined;
};
export type Union<Ts extends readonly unknown[]> = Ts[number];
export type Nullable<T> = NonNullable<T> | null | undefined;
export type NonNull = {};
export type Expand<T> = {
    [K in keyof T]: T[K];
};
export type Result<T, E> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export type Option<T> = {
    data: T;
} | undefined;
export declare function getUnixSeconds(): number;
export declare function toUnixSeconds(date: Date): number;
export declare function fromUnixSeconds(seconds: number): Date;
export declare function isNullish(v: unknown): v is null | undefined;
export declare function some<T>(data: T): {
    data: T;
};
export declare function none<T>(): undefined;
export declare function ok<T, E = never>(data: T): {
    success: true;
    data: T;
};
export declare function err<E, T = never>(error: E): {
    success: false;
    error: E;
};
/** {@link Number.isInteger} that also narrows down the type of the value on success */
export declare function isInteger(v: unknown): v is number;
/** {@link Number.isSafeInteger} that also narrows down the type of the value on success */
export declare function isSafeInteger(v: unknown): v is number;
export declare function partialOrd<T>(lhs: T, rhs: T): -1 | 0 | 1 | undefined;
export declare function ord<T>(lhs: T, rhs: T): -1 | 0 | 1;
export declare function identity<T>(v: T): T;
export declare function identityAsync<T>(v: T): Promise<T>;
export declare function invoke<Ts extends readonly unknown[], R>(fn: Fn<Ts, R>, ...params: Ts): R;
export declare function invokeAsync<Ts extends readonly unknown[], R>(fn: Fn<Ts, R>, ...params: Ts): Promise<R>;
export declare function idOrd(lhs: UntypedId, rhs: UntypedId): -1 | 0 | 1;
export declare function dmIdOf(acc1: UntypedId, acc2: UntypedId): [UntypedId, UntypedId];
//# sourceMappingURL=utils.d.ts.map