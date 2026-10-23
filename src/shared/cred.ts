/**
 * A pair containing data along with a session token associated with it. 
 * Can be constructed by unauthorized means, so validation is needed.
 */
export type WithAuth<E, S> = { 
    data: E;
    session: S;
};

export function withAuth<E, S>(data: E, session: S): WithAuth<E, S> {
    return { data, session };
}
