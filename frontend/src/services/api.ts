import axios from "axios";

// APIクライアントの設定
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// リクエスト時のインターセプター
api.interceptors.request.use(
    (config) => {
        // リクエスト前の処理（認証トークンの追加など）
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// レスポンス時のインターセプター
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // エラー処理
        const errorMessage = error.response?.data?.detail || error.message || "サーバーとの通信に失敗しました";

        console.error("API Error:", errorMessage);
        return Promise.reject(error);
    }
);

export default api;
