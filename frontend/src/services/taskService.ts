import { MarkdownResponse, Task, TaskListResponse, UploadResponse } from "../types";
import api from "./api";

// タスク関連のAPIサービス
export const taskService = {
    // タスク一覧を取得
    getTasks: async (): Promise<TaskListResponse> => {
        const response = await api.get<TaskListResponse>("/tasks/");
        return response.data;
    },

    // 特定のタスクを取得
    getTask: async (taskId: string): Promise<Task> => {
        const response = await api.get<Task>(`/tasks/${taskId}`);
        return response.data;
    },

    // タスクを削除
    deleteTask: async (taskId: string): Promise<void> => {
        await api.delete(`/tasks/${taskId}`);
    },

    // ファイルをアップロード
    uploadFile: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post<UploadResponse>("/files/upload/", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data;
    },

    // URLを処理
    processUrl: async (url: string): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("url", url);

        const response = await api.post<UploadResponse>("/files/url/", formData);
        return response.data;
    },

    // マークダウンを取得
    getMarkdown: async (taskId: string): Promise<MarkdownResponse> => {
        const response = await api.get<MarkdownResponse>(`/files/download/${taskId}`);
        return response.data;
    },
};
