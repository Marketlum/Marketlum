import { AxiosInstance } from "axios";
import { BaseResource } from "./base";

export class FilesResource extends BaseResource {
    constructor(client: AxiosInstance, baseUrl: string) {
        super(client, baseUrl);
    }

    public async upload(file: File, folderId?: string): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) {
            formData.append('folderId', folderId);
        }

        const response = await this.client.post(`/files`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to upload file.");
    }

    public async uploadMultiple(files: File[], folderId?: string): Promise<{ uploaded: any[]; failed: Array<{ originalName: string; reason: string }> }> {
        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }
        if (folderId) {
            formData.append('folderId', folderId);
        }

        const response = await this.client.post(`/files/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to upload files.");
    }

    public async getAll(params?: {
        page?: number;
        limit?: number;
        folderId?: string | null;
        q?: string;
        mimeGroup?: 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'other';
        sort?: string;
    }) {
        const response = await this.client.get(`/files`, { params });

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch files.");
    }

    public async get(id: string) {
        const response = await this.client.get(`/files/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the file.");
    }

    public async update(id: string, data: { altText?: string | null; caption?: string | null; folderId?: string | null }) {
        const response = await this.client.patch(`/files/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the file.");
    }

    public async move(id: string, folderId: string | null) {
        const response = await this.client.post(`/files/${id}/move`, { folderId });

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to move the file.");
    }

    public async delete(id: string) {
        const response = await this.client.delete(`/files/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the file.");
    }

    public getDownloadUrl(id: string): string {
        return `${this.baseUrl}/files/${id}/download`;
    }

    public getPreviewUrl(id: string): string {
        return `${this.baseUrl}/files/${id}/preview`;
    }

    public getThumbnailUrl(id: string): string {
        return `${this.baseUrl}/files/${id}/thumbnail`;
    }

    // Image editing methods

    public async crop(id: string, data: { x: number; y: number; width: number; height: number; outputFormat?: string }) {
        const response = await this.client.post(`/files/${id}/edit/crop`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to crop image.");
    }

    public async resize(id: string, data: { width?: number; height?: number; keepAspectRatio?: boolean }) {
        const response = await this.client.post(`/files/${id}/edit/resize`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to resize image.");
    }

    public async grayscale(id: string) {
        const response = await this.client.post(`/files/${id}/edit/grayscale`, {});

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to convert image to grayscale.");
    }

    // Folder methods

    public async getFoldersTree() {
        const response = await this.client.get(`/files/folders/tree`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch folders tree.");
    }

    public async getFolder(id: string) {
        const response = await this.client.get(`/files/folders/${id}`);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch the folder.");
    }

    public async createFolder(data: { name: string; parentId?: string }) {
        const response = await this.client.post(`/files/folders`, data);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to create the folder.");
    }

    public async updateFolder(id: string, data: { name?: string }) {
        const response = await this.client.patch(`/files/folders/${id}`, data);

        if (response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to update the folder.");
    }

    public async deleteFolder(id: string) {
        const response = await this.client.delete(`/files/folders/${id}`);

        if (response.status === 200) {
            return true;
        }

        throw new Error("Failed to delete the folder.");
    }

    public async seed(): Promise<{ inserted: number; skipped: number }> {
        const response = await this.client.post(`/files/seed`);

        if (response.status === 201) {
            return response.data;
        }

        throw new Error("Failed to seed files.");
    }
}
