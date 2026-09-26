export type Json = number | string | boolean | null | Json[] | { [key: string]: Json };
export type JwtStr = `${string}.${string}.${string}`;

// https://http.dev/
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
export const HttpStatusCodes = Object.freeze({
    // 100-199: Informational
    Continue: 100,
    SwitchingProtocols: 101,
    Processing: 102,
    EarlyHints: 103,

    // 200-299: Successful responses
    Ok: 200,
    Created: 201,
    Accepted: 202,
    NonAuthoritativeInformation: 203,
    NoContent: 204,
    ResetContent: 205,
    PartialContent: 206,
    MultiStatus: 207,
    AlreadyReported: 208,
    IMUsed: 226,

    // 300-399: Redirection responses
    MultipleChoices: 300,
    MovedPermanently: 301,
    Found: 302,
    SeeOther: 303,
    NotModified: 304,
    TemporaryRedirect: 307,
    PermanentRedirect: 308,

    // 400-499: Client error responses
    BadRequest: 400,
    Unauthorized: 401,
    PaymentRequired: 402,
    Forbidden: 403,
    NotFound: 404,
    MethodNotAccepted: 405,
    NotAcceptable: 406,
    ProxyAuthenticationRequired: 407,
    RequestTimeout: 408,
    Conflict: 409,
    Gone: 410,
    LengthRequired: 411,
    PreconditionFailed: 412,
    ContentTooLarge: 413,
    UriTooLong: 414,
    UnsupportedMediaType: 415,
    RangeNotSatisfiable: 416,
    ExpectationFailed: 417,
    ImATeapot: 418,
    MisdirectedRequest: 421,
    UnprocessableContent: 422,
    Locked: 423,
    FailedDependency: 424,
    TooEarly: 425,
    UpgradeRequired: 426,
    PreconditionRequired: 428,
    TooManyRequests: 429,
    RequestHeaderFieldsTooLarge: 431,
    UnavailableForLegalReasons: 451,

    // 500-599: Server error responses
    InternalServerError: 500,
    NotImplemented: 501,
    BadGateway: 502,
    ServiceUnavailable: 503,
    GatewayTimeout: 504,
    HttpVersionNotSupported: 505,
    VariantAlsoNegotiates: 506,
    InsufficientStorage: 507,
    LoopDetected: 508,
    NotExtended: 510,
    NetworkAuthenticationRequired: 511,
} as const);

export const HttpStatusMessages = Object.freeze({
    // 100-199: Informational
    100: "Continue",
    101: "SwitchingProtocols",
    102: "Processing",
    103: "EarlyHints",

    // 200-299: Successful responses
    200: "Ok",
    201: "Created",
    202: "Accepted",
    203: "NonAuthoritativeInformation",
    204: "NoContent",
    205: "ResetContent",
    206: "PartialContent",
    207: "MultiStatus",
    208: "AlreadyReported",
    226: "IMUsed",

    // 300-399: Redirection responses
    300: "MultipleChoices",
    301: "MovedPermanently",
    302: "Found",
    303: "SeeOther",
    304: "NotModified",
    307: "TemporaryRedirect",
    308: "PermanentRedirect",

    // 400-499: Client error responses
    400: "BadRequest",
    401: "Unauthorized",
    402: "PaymentRequired",
    403: "Forbidden",
    404: "NotFound",
    405: "MethodNotAccepted",
    406: "NotAcceptable",
    407: "ProxyAuthenticationRequired",
    408: "RequestTimeout",
    409: "Conflict",
    410: "Gone",
    411: "LengthRequired",
    412: "PreconditionFailed",
    413: "ContentTooLarge",
    414: "UriTooLong",
    415: "UnsupportedMediaType",
    416: "RangeNotSatisfiable",
    417: "ExpectationFailed",
    418: "ImATeapot",
    421: "MisdirectedRequest",
    422: "UnprocessableContent",
    423: "Locked",
    424: "FailedDependency",
    425: "TooEarly",
    426: "UpgradeRequired",
    428: "PreconditionRequired",
    429: "TooManyRequests",
    431: "RequestHeaderFieldsTooLarge",
    451: "UnavailableForLegalReasons",

    // 500-599: Server error responses
    500: "InternalServerError",
    501: "NotImplemented",
    502: "BadGateway",
    503: "ServiceUnavailable",
    504: "GatewayTimeout",
    505: "HttpVersionNotSupported",
    506: "VariantAlsoNegotiates",
    507: "InsufficientStorage",
    508: "LoopDetected",
    510: "NotExtended",
    511: "NetworkAuthenticationRequired",
} as const);

export type HttpStatusMessage = keyof typeof HttpStatusCodes;
export type HttpStatusCode = typeof HttpStatusCodes[HttpStatusMessage];

export type HttpInformationalStatusCode = 
    | typeof HttpStatusCodes.Continue
    | typeof HttpStatusCodes.SwitchingProtocols
    | typeof HttpStatusCodes.Processing
    | typeof HttpStatusCodes.EarlyHints;

export type HttpSuccessStatusCode = 
    | typeof HttpStatusCodes.Ok
    | typeof HttpStatusCodes.Created
    | typeof HttpStatusCodes.Accepted
    | typeof HttpStatusCodes.NonAuthoritativeInformation
    | typeof HttpStatusCodes.NoContent
    | typeof HttpStatusCodes.ResetContent
    | typeof HttpStatusCodes.PartialContent
    | typeof HttpStatusCodes.MultiStatus
    | typeof HttpStatusCodes.AlreadyReported
    | typeof HttpStatusCodes.IMUsed;

export type HttpRedirectionStatusCode =
    | typeof HttpStatusCodes.MultipleChoices
    | typeof HttpStatusCodes.MovedPermanently
    | typeof HttpStatusCodes.Found
    | typeof HttpStatusCodes.SeeOther
    | typeof HttpStatusCodes.NotModified
    | typeof HttpStatusCodes.TemporaryRedirect
    | typeof HttpStatusCodes.PermanentRedirect;

export type HttpClientErrorStatusCode = 
    | typeof HttpStatusCodes.BadRequest
    | typeof HttpStatusCodes.Unauthorized
    | typeof HttpStatusCodes.PaymentRequired
    | typeof HttpStatusCodes.Forbidden
    | typeof HttpStatusCodes.NotFound
    | typeof HttpStatusCodes.MethodNotAccepted
    | typeof HttpStatusCodes.NotAcceptable
    | typeof HttpStatusCodes.ProxyAuthenticationRequired
    | typeof HttpStatusCodes.RequestTimeout
    | typeof HttpStatusCodes.Conflict
    | typeof HttpStatusCodes.Gone
    | typeof HttpStatusCodes.LengthRequired
    | typeof HttpStatusCodes.PreconditionFailed
    | typeof HttpStatusCodes.ContentTooLarge
    | typeof HttpStatusCodes.UriTooLong
    | typeof HttpStatusCodes.UnsupportedMediaType
    | typeof HttpStatusCodes.RangeNotSatisfiable
    | typeof HttpStatusCodes.ExpectationFailed
    | typeof HttpStatusCodes.ImATeapot
    | typeof HttpStatusCodes.MisdirectedRequest
    | typeof HttpStatusCodes.UnprocessableContent
    | typeof HttpStatusCodes.Locked
    | typeof HttpStatusCodes.FailedDependency
    | typeof HttpStatusCodes.TooEarly
    | typeof HttpStatusCodes.UpgradeRequired
    | typeof HttpStatusCodes.PreconditionFailed
    | typeof HttpStatusCodes.TooManyRequests
    | typeof HttpStatusCodes.RequestHeaderFieldsTooLarge
    | typeof HttpStatusCodes.UnavailableForLegalReasons;

export type HttpServerErrorStatusCode = 
    | typeof HttpStatusCodes.InternalServerError
    | typeof HttpStatusCodes.NotImplemented
    | typeof HttpStatusCodes.BadGateway
    | typeof HttpStatusCodes.ServiceUnavailable
    | typeof HttpStatusCodes.GatewayTimeout
    | typeof HttpStatusCodes.HttpVersionNotSupported
    | typeof HttpStatusCodes.VariantAlsoNegotiates
    | typeof HttpStatusCodes.InsufficientStorage
    | typeof HttpStatusCodes.LoopDetected
    | typeof HttpStatusCodes.NotExtended
    | typeof HttpStatusCodes.NetworkAuthenticationRequired;

// https://http.dev/methods
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "QUERY" | 
    "HEAD" | "OPTIONS" | "TRACE" | "CONNECT" | "PRI";

export class HttpResponse<E, S extends HttpStatusCode = HttpStatusCode> {
    public entity: E;
    public status: S;

    public constructor(entity: E, status: S) {
        this.entity = entity;
        this.status = status;
    }
};

export function httpResponse<E, S extends HttpStatusCode>(entity: E, status: S) {
    return new HttpResponse(entity, status);
}
