import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    password: string;
    email: string;
}, {
    name: string;
    password: string;
    email: string;
}>;
export declare const updateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    password?: string | undefined;
    email?: string | undefined;
}, {
    name?: string | undefined;
    password?: string | undefined;
    email?: string | undefined;
}>;
export declare const userResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}, {
    name: string;
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
//# sourceMappingURL=user.schema.d.ts.map