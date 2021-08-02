"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIResponseStatus = void 0;
var APIResponseStatus;
(function (APIResponseStatus) {
    APIResponseStatus[APIResponseStatus["Ok"] = 200] = "Ok";
    APIResponseStatus[APIResponseStatus["UnAuthorized"] = 401] = "UnAuthorized";
    APIResponseStatus[APIResponseStatus["NotFound"] = 404] = "NotFound";
    APIResponseStatus[APIResponseStatus["ServerError"] = 500] = "ServerError";
    APIResponseStatus[APIResponseStatus["Redirect"] = 302] = "Redirect";
})(APIResponseStatus = exports.APIResponseStatus || (exports.APIResponseStatus = {}));
class APIResponse {
    constructor(options) {
        this.options = {
            status: APIResponseStatus.Ok,
            cookies: [],
            contentType: 'applicaiton/json',
            ...(options ?? {}),
        };
    }
    static send(options, res) {
        return new APIResponse(options).send(res);
    }
    send(res) {
        res.status(this.options.status);
        res.contentType(this.options.contentType);
        if (this.options.redirect) {
            res.location(this.options.redirect);
            res.status(APIResponseStatus.Redirect);
        }
        if (this.options.cookies.length > 0) {
            this.options.cookies.forEach((c) => {
                c.addTo(res);
            });
        }
        if (this.options.contentType === 'applicaiton/json') {
            res.json(this.options.data ?? {});
        }
        else {
            res.send(this.options.data);
        }
    }
}
exports.default = APIResponse;
APIResponse.EmptyOk = new APIResponse();
//# sourceMappingURL=APIResponse.js.map