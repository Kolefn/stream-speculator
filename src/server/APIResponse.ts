import { Response } from "express";
import Cookie from "./Cookie";

export enum APIResponseStatus {
    Ok = 200,
    UnAuthorized = 401,
    NotFound = 404,
    ServerError = 500,
};

export type APIResponseOptions<T extends {}> = {
    status: APIResponseStatus;
    data?: T;
    cookies: Cookie[];
};

export default class APIResponse<T extends {}> {
    static EmptyOk = new APIResponse();
    static send<T>(options: Partial<APIResponseOptions<T>>, res: Response) : Response {
        return new APIResponse(options).send(res);
    }

    readonly options: APIResponseOptions<T>;

    constructor(options?: Partial<APIResponseOptions<T>>){
        this.options = {
            status: APIResponseStatus.Ok,
            cookies: [],
            ...(options ?? {})
        };
    }

    send(res: Response) : Response {
        res.status(this.options.status);
        if(this.options.cookies.length > 0){
            this.options.cookies.forEach((c)=> {
                c.addTo(res);
            });
        }
        res.json(this.options.data ?? {});
        return res;
    }
}