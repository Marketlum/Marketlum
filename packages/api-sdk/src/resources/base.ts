import { AxiosInstance } from "axios";

export abstract class BaseResource {
    protected constructor(
        protected readonly client: AxiosInstance,
        protected readonly baseUrl: string
    ) {}
}
