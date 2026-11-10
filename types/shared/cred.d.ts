/**
 * A pair containing data along with a session token associated with it.
 * Can be constructed by unauthorized means, so validation is needed.
 */
export type WithAuth<E, S> = {
    data: E;
    session: S;
};
export declare function withAuth<E, S>(data: E, session: S): WithAuth<E, S>;
//# sourceMappingURL=cred.d.ts.map