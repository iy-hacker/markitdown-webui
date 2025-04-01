import os
import shutil
import traceback
from pathlib import Path
from typing import List, Optional

import aiofiles
import aiohttp
from fastapi import UploadFile

from ..config import settings
from ..models.task import Task, TaskStatus, TaskType


class FileServiceError(Exception):
    """ファイル処理に関するエラー"""
    pass

async def save_uploaded_file(file: UploadFile) -> str:
    """
    アップロードされたファイルを保存
    
    Args:
        file: アップロードされたファイル
        
    Returns:
        保存されたファイルのパス（BASE_DIRからの相対パス）
    """
    # 一意のファイル名を作成
    file_name = Path(file.filename).stem
    file_ext = Path(file.filename).suffix
    safe_filename = f"{file_name}_{os.urandom(8).hex()}{file_ext}"
    
    file_path = settings.UPLOAD_DIR / safe_filename
    
    try:
        print(f"Saving file: {file.filename} to {file_path}")
        
        # ファイル保存
        content = await file.read()
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)
        
        print(f"File saved successfully: {safe_filename}")
        return str(safe_filename)
    
    except Exception as e:
        print(f"Error saving file: {str(e)}")
        print(traceback.format_exc())
        raise FileServiceError(f"Failed to save file: {str(e)}")

async def download_url_to_file(url: str) -> str:
    """
    URLからファイルをダウンロード
    
    Args:
        url: ダウンロード元URL
        
    Returns:
        保存されたファイルのパス（BASE_DIRからの相対パス）
    """
    # URLからファイル名を取得
    path = Path(url.split('/')[-1])
    file_name = path.stem
    file_ext = path.suffix or '.html'  # 拡張子がない場合はHTMLとして扱う
    
    safe_filename = f"{file_name}_{os.urandom(8).hex()}{file_ext}"
    file_path = settings.UPLOAD_DIR / safe_filename
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise FileServiceError(f"Failed to download URL: HTTP status {response.status}")
                
                # ファイル保存
                async with aiofiles.open(file_path, 'wb') as out_file:
                    content = await response.read()
                    await out_file.write(content)
        
        return str(safe_filename)
    
    except Exception as e:
        if isinstance(e, FileServiceError):
            raise
        raise FileServiceError(f"Failed to download URL: {str(e)}")

def get_markdown_content(file_path: str) -> str:
    """
    マークダウンファイルの内容を取得
    
    Args:
        file_path: マークダウンファイルのパス
        
    Returns:
        マークダウンの内容
    """
    try:
        full_path = Path(settings.BASE_DIR) / file_path
        if not full_path.exists():
            raise FileServiceError(f"File not found: {full_path}")
        
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    except Exception as e:
        if isinstance(e, FileServiceError):
            raise
        raise FileServiceError(f"Failed to read markdown file: {str(e)}")