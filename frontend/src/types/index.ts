// タスクの状態を定義
export enum TaskStatus {
    WAITING = "waiting",
    PROCESSING = "processing",
    SUCCESS = "success",
    ERROR = "error",
}

// タスクのタイプを定義
export enum TaskType {
    FILE = "file",
    URL = "url",
}

// タスクの型定義
export interface Task {
    id: string;
    name: string;
    task_type: TaskType;
    source: string;
    status: TaskStatus;
    retry_count: number;
    created_at: string;
    updated_at: string;
    output_path: string | null;
    error_message: string | null;
}

// タスク一覧のレスポンス型
export interface TaskListResponse {
    total: number;
    tasks: Task[];
}

// マークダウン取得レスポンス型
export interface MarkdownResponse {
    filename: string;
    content: string;
}

// ファイルアップロードレスポンス型
export interface UploadResponse {
    task_id: string;
    message: string;
}
