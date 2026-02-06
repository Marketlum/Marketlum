"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userResponseSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(1),
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(6).optional(),
    name: zod_1.z.string().min(1).optional(),
});
exports.userResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
//# sourceMappingURL=user.schema.js.map