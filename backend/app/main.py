import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print("\n=== Starting Markitdown WebUI Backend ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

from .api.router import api_router
from .config import settings
from .models.task import TaskType

# FastAPIアプリケーション作成
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

print("=== FastAPI application created ===")

# CORSミドルウェア設定
allowed_origins = [
    "http://localhost:5173",    # Vite開発サーバーのデフォルトポート
    "http://localhost:3000",    # 別のポートの場合
    "http://127.0.0.1:5173",    # IPアドレスでのアクセス
    "http://127.0.0.1:3000",    # IPアドレスでのアクセス
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("=== CORS middleware added ===")

# APIルーター登録
app.include_router(api_router, prefix=settings.API_V1_STR)
print("=== API router registered ===")

# タスクハンドラー登録
print("=== Registering task handlers ===")
from .core.markitdown import run_markitdown
from .core.queue import task_queue

# ハンドラー登録を明示的に
task_queue.register_handler(TaskType.FILE.value, run_markitdown)
task_queue.register_handler(TaskType.URL.value, run_markitdown)
print(f"=== Task handlers registered: {TaskType.FILE.value}, {TaskType.URL.value} ===")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Markitdown WebUI API",
        "docs": "/docs"
    }

# シンプルなヘルスチェックエンドポイント
@app.get("/health")
async def health_check():
    print("Health check called")
    return {"status": "ok"}

print("=== Markitdown WebUI Backend startup completed ===\n")