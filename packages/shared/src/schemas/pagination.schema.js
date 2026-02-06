"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = void 0;
const zod_1 = require("zod");
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10),
    search: zod_1.z.string().optional(),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('ASC'),
});
//# sourceMappingURL=pagination.schema.js.map