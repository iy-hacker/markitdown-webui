import os
from pathlib import Path
from typing import Optional


class Settings:
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Markitdown WebUI"
    
    # ディレクトリパス設定
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "app" / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "app" / "outputs"
    TEMP_DIR: Path = BASE_DIR / "app" / "temp"
    
    # リトライ設定
    MAX_RETRY_COUNT: int = 3
    
    # CORSの許可オリジン
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite開発サーバーのデフォルトポート
        "http://localhost:3000",
    ]

    def __init__(self):
        # 必要なディレクトリを作成
        self.UPLOAD_DIR.mkdir(exist_ok=True)
        self.OUTPUT_DIR.mkdir(exist_ok=True)
        self.TEMP_DIR.mkdir(exist_ok=True)

settings = Settings()