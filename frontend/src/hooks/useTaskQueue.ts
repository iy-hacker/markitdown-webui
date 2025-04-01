import { useCallback, useEffect, useState } from "react";
import { taskService } from "../services/taskService";
import { Task } from "../types";

// ポーリング間隔（ミリ秒）
const POLLING_INTERVAL = 3000;

export function useTaskQueue() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalTasks, setTotalTasks] = useState(0);

    // タスク一覧を取得
    const fetchTasks = useCallback(async () => {
        try {
            const response = await taskService.getTasks();
            setTasks(response.tasks);
            setTotalTasks(response.total);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
            setError("タスクの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    // タスクを削除
    const deleteTask = useCallback(
        async (taskId: string) => {
            try {
                await taskService.deleteTask(taskId);
                // 削除後にタスク一覧を更新
                fetchTasks();
                return true;
            } catch (err) {
                console.error("Failed to delete task:", err);
                setError("タスクの削除に失敗しました");
                return false;
            }
        },
        [fetchTasks]
    );

    // マークダウンを取得
    const getMarkdown = useCallback(async (taskId: string) => {
        try {
            return await taskService.getMarkdown(taskId);
        } catch (err) {
            console.error("Failed to get markdown:", err);
            setError("マークダウンの取得に失敗しました");
            throw err;
        }
    }, []);

    // マークダウンをダウンロード
    const downloadMarkdown = useCallback(async (taskId: string) => {
        try {
            const markdown = await taskService.getMarkdown(taskId);

            // マークダウンをBlobに変換
            const blob = new Blob([markdown.content], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);

            // ダウンロードリンクを作成して自動クリック
            const a = document.createElement("a");
            a.href = url;
            a.download = markdown.filename;
            document.body.appendChild(a);
            a.click();

            // クリーンアップ
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            return true;
        } catch (err) {
            console.error("Failed to download markdown:", err);
            setError("マークダウンのダウンロードに失敗しました");
            return false;
        }
    }, []);

    // 進捗状況を計算
    const getProgress = useCallback(() => {
        if (totalTasks === 0) return 0;

        const completed = tasks.filter((task) => task.status === "success" || task.status === "error").length;

        return Math.round((completed / totalTasks) * 100);
    }, [tasks, totalTasks]);

    // コンポーネントマウント時とポーリング間隔でタスク一覧を取得
    useEffect(() => {
        // 初回読み込み
        fetchTasks();

        // ポーリング設定
        const intervalId = setInterval(() => {
            fetchTasks();
        }, POLLING_INTERVAL);

        // クリーンアップ
        return () => clearInterval(intervalId);
    }, [fetchTasks]);

    return {
        tasks,
        loading,
        error,
        totalTasks,
        fetchTasks,
        deleteTask,
        getMarkdown,
        downloadMarkdown,
        progress: getProgress(),
    };
}
