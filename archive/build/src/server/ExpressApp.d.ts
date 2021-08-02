import { AuthSession } from './handlers/authHandlers';
declare global {
    namespace Express {
        interface Request {
            rawBody: any;
            session: AuthSession | null;
        }
    }
}
declare const ExpressApp: import("express-serve-static-core").Express;
export default ExpressApp;
//# sourceMappingURL=ExpressApp.d.ts.map