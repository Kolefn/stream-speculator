import { Response } from 'express';
import Cookie from './Cookie';
export declare enum APIResponseStatus {
    Ok = 200,
    UnAuthorized = 401,
    NotFound = 404,
    ServerError = 500,
    Redirect = 302
}
export declare type APIResponseOptions<T extends {}> = {
    status: APIResponseStatus;
    data?: T;
    cookies: Cookie[];
    contentType?: string;
    redirect?: string;
};
export default class APIResponse<T extends {}> {
    static EmptyOk: APIResponse<{}>;
    static send<T>(options: Partial<APIResponseOptions<T>>, res: Response): void;
    readonly options: APIResponseOptions<T>;
    constructor(options?: Partial<APIResponseOptions<T>>);
    send(res: Response): void;
}
//# sourceMappingURL=APIResponse.d.ts.map