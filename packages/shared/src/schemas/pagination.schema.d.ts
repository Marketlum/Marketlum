import { z } from 'zod';
export declare const paginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["ASC", "DESC"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "ASC" | "DESC";
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "ASC" | "DESC" | undefined;
}>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
//# sourceMappingURL=pagination.schema.d.ts.map