import os

# バージョン情報
VERSION = "1.0.1"

# 基本設定
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
TEMP_DIR = os.path.join(BASE_DIR, 'temp')

# デフォルトフォルダ
DEFAULT_FOLDERS = ['default', 'report', 'document']

# ファイルアップロードの許可拡張子
ALLOWED_EXTENSIONS = {
    'pdf', 'pptx', 'docx', 'doc', 'txt', 'log', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'html', 'htm', 'csv', 'json', 'xml', 'zip', 'url', 'md', 'markdown',
}

# Flaskの設定
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-for-markitdown-app'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB制限
    DEBUG = True