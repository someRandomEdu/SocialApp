export const rootPort = 8080;
export const domain = `localhost:${rootPort}`;
export const rootRoute = `http://${domain}`;
export const accountRoute = `${rootRoute}/account`;

export const routes = Object.freeze({

} as const);
