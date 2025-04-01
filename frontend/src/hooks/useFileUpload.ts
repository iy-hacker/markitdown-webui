import { useCallback, useState } from "react";
import { FileRejection } from "react-dropzone";
import { taskService } from "../services/taskService";

export function useFileUpload(onSuccess?: () => void) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ファイルをアップロード
    const uploadFile = useCallback(
        async (file: File) => {
            setUploading(true);
            setError(null);

            try {
                const response = await taskService.uploadFile(file);
                if (onSuccess) onSuccess();
                return response;
            } catch (err: any) {
                const errorMessage = err.response?.data?.detail || "ファイルのアップロードに失敗しました";
                setError(errorMessage);
                throw err;
            } finally {
                setUploading(false);
            }
        },
        [onSuccess]
    );

    // 複数ファイルをアップロード
    const uploadFiles = useCallback(
        async (files: File[]) => {
            setUploading(true);
            setError(null);

            try {
                const results = await Promise.allSettled(files.map((file) => taskService.uploadFile(file)));

                // エラーをチェック
                const errors = results.filter((result): result is PromiseRejectedResult => result.status === "rejected").map((result) => result.reason);

                if (errors.length > 0) {
                    setError(`${errors.length}個のファイルでエラーが発生しました`);
                }

                if (onSuccess) onSuccess();

                return results;
            } catch (err) {
                setError("ファイルのアップロードに失敗しました");
                throw err;
            } finally {
                setUploading(false);
            }
        },
        [onSuccess, uploadFile]
    );

    // URLを処理
    const processUrl = useCallback(
        async (url: string) => {
            setUploading(true);
            setError(null);

            try {
                const response = await taskService.processUrl(url);
                if (onSuccess) onSuccess();
                return response;
            } catch (err: any) {
                const errorMessage = err.response?.data?.detail || "URLの処理に失敗しました";
                setError(errorMessage);
                throw err;
            } finally {
                setUploading(false);
            }
        },
        [onSuccess]
    );

    // Dropzoneのイベントハンドラ
    const onDropAccepted = useCallback(
        async (acceptedFiles: File[]) => {
            await uploadFiles(acceptedFiles);
        },
        [uploadFiles]
    );

    const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
        const errors = fileRejections.map((rejection) => `${rejection.file.name}: ${rejection.errors.map((e) => e.message).join(", ")}`);

        setError(`ファイルが拒否されました: ${errors.join("; ")}`);
    }, []);

    return {
        uploading,
        error,
        uploadFile,
        uploadFiles,
        processUrl,
        onDropAccepted,
        onDropRejected,
    };
}
