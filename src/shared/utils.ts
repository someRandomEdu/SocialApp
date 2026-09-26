export type Fn<Ts extends readonly any[] = [], R = void> = (...params: Ts) => R;

export function isNullish(v: unknown): v is null | undefined {
    return v === null || v === undefined;
}

export type Result<T, E> = { ok: true, value: T } | { ok: false, value: E };
export type Option<T> = { value: T } | undefined;

export function some<T>(value: T): Option<T> {
    return { value };
}

export function none<T>(): Option<T> {
    return undefined;
}

export function success<T, E = never>(value: T): Result<T, E> {
    return { ok: true, value };
}

export function error<E, T = never>(value: E): Result<T, E> {
    return { ok: false, value };
}

export function tryInvoke<T>(fn: () => T) { 
    try {
        return success(fn());
    } catch (e) {
        return error(e);
    }
}

export async function tryInvokeAsync<T>(fn: () => Promise<T>) {
    try {
        return success(await fn());
    } catch (e) {
        return error(e);
    }
}
