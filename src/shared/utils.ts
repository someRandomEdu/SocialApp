export type Fn<Ts extends readonly any[] = [], R = void> = (...params: Ts) => R;

/** 
 * @template T
 * {@link Partial}, but the properties can also be explicitly set to undefined.
 */
export type LoosePartial<T> = { [P in keyof T]?: T[P] | undefined };

export type Expand<T> = { [K in keyof T]: T[K] };
export type Result<T, E> = { success: true, data: T } | { success: false, error: E };
export type Option<T> = { data: T } | undefined;

export type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor |
    Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor |
    Float16ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor |
    BigInt64ArrayConstructor | BigUint64ArrayConstructor;

export type TypedArray<B extends ArrayBufferLike = ArrayBufferLike> =
    Int8Array<B> | Uint8Array<B> | Uint8ClampedArray<B> | Int16Array<B> | Uint16Array<B> |
    Int32Array<B> | Uint32Array<B> | Float16Array<B> | Float32Array<B> | Float64Array<B> |
    BigInt64Array<B> | BigUint64Array<B>;

export type UIntTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = Uint8Array<B> | Uint8ClampedArray<B> | Uint16Array<B> | Uint32Array<B>;

export type SIntTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = Int8Array<B> | Int16Array<B> | Int32Array<B>;

export type IntTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = UIntTypedArray<B> | SIntTypedArray<B>;

export type FloatTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = Float16Array<B> | Float32Array<B> | Float64Array<B>;

export type NumberTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = IntTypedArray<B> | FloatTypedArray<B>;

export type BigIntTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = BigUint64Array<B> | BigInt64Array<B>;

export type IntLikeTypedArray<B extends ArrayBufferLike = ArrayBufferLike>
    = IntTypedArray<B> | BigIntTypedArray<B>;

type FixedArrayOf<T, L extends number, R extends readonly T[]> = 
    R["length"] extends L ? R : FixedArrayOf<T, L, [T, ...R]>;

export type FixedArray<T, L extends number> = number extends L ? never : FixedArrayOf<T, L, []>;

export function toUnixSeconds(date: Date) {
    return Math.trunc(date.getTime() / 1000);
}

export function isNullish(v: unknown): v is null | undefined {
    return v === null || v === undefined;
}

export function typeOfStrict(v: unknown) {
    return v === null ? "null" : typeof v;
}

export function some<T>(data: T): Option<T> {
    return { data };
}

export function none<T>(): Option<T> {
    return undefined;
}

export function ok<T, E = never>(data: T): Result<T, E> {
    return { success: true, data };
}

export function err<E, T = never>(error: E): Result<T, E> {
    return { success: false, error };
}

export function tryInvoke<T>(fn: () => T) { 
    try {
        return ok(fn());
    } catch (e) {
        return err(e);
    }
}

export async function tryInvokeAsync<T>(fn: () => Promise<T>) {
    try {
        return ok(await fn());
    } catch (e) {
        return err(e);
    }
}

export function tryParseNumber(v: unknown): Result<number, string> {
    if (Number.isNaN(v)) {
        return ok(NaN);
    }

    const r = Number(v);
    return Number.isNaN(r) ? err("Value is not a number!") : ok(r);
}

export function tryParseInt(v: unknown): Result<number, string> {
    const n = Number(v);
    return Number.isInteger(n) ? ok(n) : err("Value is not an int!");
}

export function isInteger(v: unknown): v is number {
    return Number.isInteger(v);
}

export function isSafeInteger(v: unknown): v is number {
    return Number.isSafeInteger(v);
}

const parseSafeIntErr = `Value is not an int within the range [${Number.MIN_SAFE_INTEGER}, ${Number.MAX_SAFE_INTEGER}]!`;

export function tryParseSafeInt(v: unknown): Result<number, string> {
    const n = Number(v);
    return Number.isSafeInteger(n) ? ok(n) : err(parseSafeIntErr);
}

export function getProp<T extends object, K extends keyof T>(obj: T, key: K): Option<T[K]> {
    return key in obj ? some(obj[key]) : none<T[K]>();
}

export function setProp<T extends object, K extends PropertyKey, V>(obj: T, key: K, value: V): Omit<T, K> & { [_ in K]: V } {
    Reflect.defineProperty(obj, key, { value });
    return obj as any;
}

export function delProp<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
    delete obj[key];
    return obj;
}
