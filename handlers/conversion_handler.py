"""
Markitdownを使用してファイルやURLをMarkdownに変換するタスクハンドラ
"""
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, Optional
from urllib.parse import urlparse

# Markitdownライブラリをインポート
from markitdown import MarkItDown
# taskqueueモジュールからインポート
from taskqueue import Task, TaskResult

logger = logging.getLogger(__name__)

def handle_conversion_task(task: Task) -> TaskResult:
    """
    Markitdownを使用してファイルやURLをMarkdownに変換するタスクハンドラ
    
    Args:
        task: 変換タスク (source_type, path|url, folder などのpayloadを含む)
        
    Returns:
        TaskResult: 変換結果
    """
    try:
        # タスクペイロードから情報を取得
        payload: Dict[str, Any] = task.payload
        source_type: str = payload.get('source_type', '')
        folder: str = payload.get('folder', 'default')
        output_dir: str = payload.get('output_dir', f'./output/{folder}')
        
        # 出力ディレクトリが存在することを確認
        os.makedirs(output_dir, exist_ok=True)
        
        # MarkItDownの初期化
        md = MarkItDown(enable_plugins=False)
        
        # 日付文字列を生成（ファイル名に使用）
        date_str = datetime.now().strftime('%Y%m%d')
        
        if source_type == 'file':
            # ファイルパスを取得
            source_path: str = payload.get('source_path', '')
            filename: str = payload.get('filename', 'unknown_file')
            
            # 変換パラメータ
            convert_params: Dict[str, Any] = {}
            
            logger.info(f"ファイル変換開始: {source_path}")
            
            # 変換実行
            result = md.convert(source_path, **convert_params)
            
            # ファイル名作成（拡張子を除く）
            base_filename = os.path.splitext(filename)[0]
            output_filename = f"{base_filename}.{date_str}.md"
            
        elif source_type == 'url':
            url: str = payload.get('url', '')
            
            # YouTubeのURLかチェック
            is_youtube = 'youtube.com' in url or 'youtu.be' in url
            
            # 変換パラメータ
            convert_params: Dict[str, Any] = {}
            if is_youtube:
                convert_params['youtube_transcript_languages'] = ['ja']
            
            logger.info(f"URL変換開始: {url} {'(YouTube)' if is_youtube else ''}")
            
            # 変換実行
            result = md.convert(url, **convert_params)
            
            # URLの場合はサイトのタイトルを取得してファイル名を生成
            title = "webpage"  # デフォルト値
            
            # メタデータからタイトルを取得
            if hasattr(result, 'metadata') and result.metadata:
                if result.metadata.get('title'):
                    title = result.metadata.get('title')
            
            # ファイル名に使えない文字を除去
            title = re.sub(r'[\\/*?:"<>|]', "", title)
            title = title.strip()
            
            # タイトルが空の場合はURLのホスト名を使用
            if not title:
                parsed_url = urlparse(url)
                title = parsed_url.netloc
            
            output_filename = f"{title}.{date_str}.md"
        else:
            return TaskResult.failure(f"未対応のソースタイプ: {source_type}")
        
        # 出力パス
        output_path = os.path.join(output_dir, output_filename)
        
        # Markdownテキストを取得してファイルに保存
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result.text_content)
        
        logger.info(f"変換完了: {output_path}")
        
        return TaskResult.success({
            'output_path': output_path,
            'output_filename': output_filename
        })
    
    except Exception as e:
        logger.exception(f"変換タスクでエラーが発生しました: {str(e)}")
        return TaskResult.failure(f"変換失敗: {str(e)}")