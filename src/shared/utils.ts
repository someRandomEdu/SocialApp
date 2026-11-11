import { UntypedId } from "./id.ts";

export type Fn<Ts extends readonly any[] = [], R = void> = (...params: Ts) => R;

/** 
 * @template {T}
 * {@link Partial}, but the properties can also be explicitly set to `undefined`.
 */
export type LoosePartial<T> = { [P in keyof T]?: T[P] | undefined };

export type Union<Ts extends readonly unknown[]> = Ts[number];
export type Nullable<T> = NonNullable<T> | null | undefined;
export type NonNull = {};
export type Expand<T> = { [K in keyof T]: T[K] };
export type Result<T, E> = { success: true, data: T } | { success: false, error: E };
export type Option<T> = { data: T } | undefined;

export function currentUnixSeconds() {
    return Math.trunc(Date.now() / 1000);
}

export function toUnixSeconds(date: Date) {
    return Math.trunc(date.getTime() / 1000);
}

export function fromUnixSeconds(seconds: number) {
    return new Date(Math.trunc(seconds) * 1000)
}

export function isNullish(v: unknown): v is null | undefined {
    return v === null || v === undefined;
}

export function some<T>(data: T) {
    return { data } satisfies Option<T>;
}

export function none<T>() {
    return undefined satisfies Option<T>;
}

export function ok<T, E = never>(data: T) {
    return { success: true, data } satisfies Result<T, E>;
}

export function err<E, T = never>(error: E) {
    return { success: false, error } satisfies Result<T, E>;
}

/** {@link Number.isInteger} that also narrows down the type of the value on success */
export function isInteger(v: unknown): v is number {
    return Number.isInteger(v);
}

/** {@link Number.isSafeInteger} that also narrows down the type of the value on success */
export function isSafeInteger(v: unknown): v is number {
    return Number.isSafeInteger(v);
}

export function isFinite(v: unknown): v is number {
    return Number.isFinite(v);
}

export function partialOrd<T>(lhs: T, rhs: T) {
    if (lhs < rhs) {
        return -1;
    }

    if (lhs > rhs) {
        return 1;
    }

    if (lhs === rhs) {
        return 0;
    }

    return undefined;
}

export function ord<T>(lhs: T, rhs: T) {
    if (lhs < rhs) {
        return -1;
    }

    if (lhs > rhs) {
        return 1;
    }

    return 0;
}

export function identity<T>(v: T) { return v; }
export async function identityAsync<T>(v: T) { return v; }

export function invoke<Ts extends readonly unknown[], R>(fn: Fn<Ts, R>, ...params: Ts) {
    return fn(...params);
}

export async function invokeAsync<Ts extends readonly unknown[], R>(fn: Fn<Ts, R>, ...params: Ts) {
    return fn(...params);
}

export function idOrd(lhs: UntypedId, rhs: UntypedId) {
    const o = ord(lhs.id, rhs.id);
    return o !== 0 ? o : ord(lhs.origin, rhs.origin);
}

export function dmIdOf(acc1: UntypedId, acc2: UntypedId): [UntypedId, UntypedId] {
    const o = idOrd(acc1, acc2);
    return o < 0 ? [acc1, acc2] : [acc2, acc1];
}
