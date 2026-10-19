// https://web.dev/articles/url-parts
export const port = 8080;
export const hostname = `localhost`

// host = hostname + port
// should it be renamed to authority tho... https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Authority
export const host = `${hostname}:${port}`;

export const scheme = `https`;
export const absoluteRootRoute = `${scheme}://${host}`;
export const apiRoute = `/api`;
