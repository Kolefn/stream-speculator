"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
exports.default = (title) => {
    react_1.useEffect(() => {
        document.title = title;
    }, [title]);
};
//# sourceMappingURL=usePageTitle.js.map