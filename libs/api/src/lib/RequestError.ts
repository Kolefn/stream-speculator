export default class RequestError extends Error {
    method: string;
    path: string;
    status: any;
    statusText: string;
    constructor(method: string, path: string, status: number, statusText: string){
      super(`${method} ${path} ${status} ${statusText}`);
      this.method = method;
      this.path = path;
      this.status = status;
      this.statusText = statusText;
    }
}