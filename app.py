import argparse
import logging
import os
import shutil
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from flask import (Flask, jsonify, redirect, render_template, request,
                   send_from_directory, url_for)

# 設定ファイルのインポート
from config import (ALLOWED_EXTENSIONS, DEFAULT_FOLDERS, OUTPUT_DIR, TEMP_DIR,
                    Config)
from handlers.conversion_handler import handle_conversion_task
# taskqueueモジュールとハンドラのインポート
from taskqueue import Task, TaskResult, TaskStatus, create_queue


def parse_arguments():
    """コマンドライン引数をパースする関数"""
    parser = argparse.ArgumentParser(description='Markitdown WebUI - ファイルやURLをMarkdownに変換するWebアプリケーション')
    parser.add_argument('output_path', nargs='?', default=None, 
                        help='変換ファイルの保存先ディレクトリのパス (デフォルト: 設定ファイルで指定されたパス)')
    parser.add_argument('-p', '--port', type=int, default=5000,
                        help='サーバーが使用するポート (デフォルト: 5000)')
    parser.add_argument('-H', '--host', default='0.0.0.0',
                        help='サーバーがリクエストを受け付けるホスト (デフォルト: 0.0.0.0)')
    parser.add_argument('-d', '--debug', action='store_true',
                        help='デバッグモードで実行')
    
    return parser.parse_args()

# Flaskアプリケーションの初期化
app = Flask(__name__)
app.config.from_object(Config)

# ロギングの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 変換タスクハンドラの登録用関数
def setup_application(custom_output_dir=None):
    """アプリケーションのセットアップを行う関数"""
    global OUTPUT_DIR, task_queue, tasks_store
    
    # カスタム出力ディレクトリが指定された場合、グローバルの出力ディレクトリを更新
    if custom_output_dir:
        OUTPUT_DIR = os.path.abspath(custom_output_dir)
        logger.info(f"カスタム出力ディレクトリが指定されました: {OUTPUT_DIR}")
    
    # 出力ディレクトリの作成
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    # デフォルトフォルダの作成
    for folder in DEFAULT_FOLDERS:
        folder_path = os.path.join(OUTPUT_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
    
    # タスクキューの初期化
    task_queue = create_queue(default_max_workers=4, auto_start=True, logger=logger)
    
    # 変換タスクハンドラの登録
    task_queue.register_handler('conversion', handle_conversion_task)
    
    # タスクのストレージ（本番ではDBにするべき）
    tasks_store = {}
    
    logger.info("アプリケーションのセットアップが完了しました")

# タスクのストレージ（本番ではDBにするべき）
tasks_store: Dict[str, Dict[str, Any]] = {}

def allowed_file(filename: str) -> bool:
    """
    アップロードされたファイルの拡張子が許可されているかチェック
    
    Args:
        filename: チェックするファイル名
        
    Returns:
        bool: 許可されている場合はTrue、そうでない場合はFalse
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """メインページの表示"""
    # フォルダ一覧を取得してテンプレートにレンダリング
    folders = get_folders()
    return render_template('index.html', folders=folders, output_dir=OUTPUT_DIR)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """ファイルアップロード処理API"""
    # ファイルの存在確認
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルがアップロードされていません'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    # ファイル種別チェック
    if not allowed_file(file.filename):
        return jsonify({'error': 'このファイル形式はサポートされていません'}), 400
    
    # 保存先フォルダの取得
    folder = request.form.get('folder', 'default')
    folder_path = os.path.join(OUTPUT_DIR, folder)
    
    # フォルダの存在確認
    if not os.path.exists(folder_path):
        os.makedirs(folder_path, exist_ok=True)
    
    # 一時ファイルに保存
    temp_filename = str(uuid.uuid4()) + '_' + file.filename
    temp_path = os.path.join(TEMP_DIR, temp_filename)
    file.save(temp_path)
    
    # タスクの作成と追加
    task_id = str(uuid.uuid4())
    task = Task(
        id=uuid.UUID(task_id),
        type='conversion',
        name=f"{file.filename} の変換",
        payload={
            'source_type': 'file',
            'source_path': temp_path,
            'filename': file.filename,
            'folder': folder,
            'output_dir': folder_path
        }
    )
    
    task_queue.add_task(task)
    
    # タスク情報の保存
    tasks_store[task_id] = {
        'id': task_id,
        'added_at': datetime.now().isoformat(),
        'filename': file.filename,
        'status': TaskStatus.WAITING,
        'folder': folder
    }
    
    # タスクのコールバック設定
    def task_callback(task_result):
        if task_result and task_result.success and task_result.result:
            try:
                # 結果が成功でかつ出力パスがある場合
                # task_result.result は辞書型であることを確認
                if isinstance(task_result.result, dict) and 'output_path' in task_result.result:
                    output_path = task_result.result['output_path']
                    
                    # すでに相対パスの場合は変換不要
                    if not os.path.isabs(output_path):
                        relative_path = output_path
                    else:
                        # 絶対パスの場合は相対パスに変換
                        relative_path = os.path.relpath(output_path, OUTPUT_DIR).replace('\\', '/')
                    
                    # タスク情報に出力パスを追加
                    if task_id in tasks_store:
                        tasks_store[task_id]['output_path'] = relative_path
                        logger.info(f"タスク {task_id} の出力パスを設定: {relative_path}")
            except Exception as e:
                logger.error(f"タスク結果処理エラー: {str(e)}")
    
    # コールバックを設定
    task.callback = task_callback
    
    return jsonify({
        'task_id': task_id,
        'status': TaskStatus.WAITING,
        'message': 'ファイルがアップロードされ、処理キューに追加されました'
    })

@app.route('/api/url', methods=['POST'])
def process_url():
    """URL処理API"""
    data = request.json
    if not data or 'url' not in data:
        return jsonify({'error': 'URLが指定されていません'}), 400
    
    url = data['url']
    folder = data.get('folder', 'default')
    folder_path = os.path.join(OUTPUT_DIR, folder)
    
    # フォルダの存在確認
    if not os.path.exists(folder_path):
        os.makedirs(folder_path, exist_ok=True)
    
    # タスクの作成と追加
    task_id = str(uuid.uuid4())
    task = Task(
        id=uuid.UUID(task_id),
        type='conversion',
        name=f"URL変換: {url}",
        payload={
            'source_type': 'url',
            'url': url,
            'folder': folder,
            'output_dir': folder_path
        }
    )
    
    task_queue.add_task(task)
    
    # タスク情報の保存
    tasks_store[task_id] = {
        'id': task_id,
        'added_at': datetime.now().isoformat(),
        'filename': url,
        'status': TaskStatus.WAITING,
        'folder': folder
    }
    
    # タスクのコールバック設定
    def task_callback(task_result):
        if task_result and task_result.success and task_result.result:
            try:
                # 結果が成功でかつ出力パスがある場合
                # task_result.result は辞書型であることを確認
                if isinstance(task_result.result, dict) and 'output_path' in task_result.result:
                    output_path = task_result.result['output_path']
                    
                    # すでに相対パスの場合は変換不要
                    if not os.path.isabs(output_path):
                        relative_path = output_path
                    else:
                        # 絶対パスの場合は相対パスに変換
                        relative_path = os.path.relpath(output_path, OUTPUT_DIR).replace('\\', '/')
                    
                    # タスク情報に出力パスを追加
                    if task_id in tasks_store:
                        tasks_store[task_id]['output_path'] = relative_path
                        logger.info(f"タスク {task_id} の出力パスを設定: {relative_path}")
            except Exception as e:
                logger.error(f"タスク結果処理エラー: {str(e)}")
    
    # コールバックを設定
    task.callback = task_callback
    
    return jsonify({
        'task_id': task_id,
        'status': TaskStatus.WAITING,
        'message': 'URLの処理がキューに追加されました'
    })

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """タスク一覧の取得API"""
    tasks = []
    for task_id, task_info in tasks_store.items():
        # タスクキューからの最新状態の取得を試みる
        queue_task = task_queue.get_task(uuid.UUID(task_id))
        if queue_task:
            task_info['status'] = queue_task.status
        
        tasks.append(task_info)
    
    return jsonify(tasks)

@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    """特定のタスク情報の取得API"""
    if task_id not in tasks_store:
        return jsonify({'error': 'タスクが見つかりません'}), 404
    
    task_info = tasks_store[task_id].copy()
    
    # タスクキューからの最新状態の取得を試みる
    queue_task = task_queue.get_task(uuid.UUID(task_id))
    if queue_task:
        task_info['status'] = queue_task.status
    
    return jsonify(task_info)

def get_folders() -> List[Dict[str, str]]:
    """
    フォルダ一覧の取得
    
    Returns:
        List[Dict[str, str]]: フォルダ情報のリスト
    """
    folders = []
    for folder_name in os.listdir(OUTPUT_DIR):
        folder_path = os.path.join(OUTPUT_DIR, folder_name)
        if os.path.isdir(folder_path):
            folders.append({
                'id': folder_name,
                'name': folder_name
            })
    return folders

@app.route('/api/folders', methods=['GET'])
def api_get_folders():
    """フォルダ一覧のAPI"""
    return jsonify(get_folders())

@app.route('/api/folders', methods=['POST'])
def create_folder():
    """新しいフォルダの作成API"""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({'error': 'フォルダ名が指定されていません'}), 400
    
    folder_name = data['name'].strip()
    if not folder_name:
        return jsonify({'error': 'フォルダ名を入力してください'}), 400
    
    # フォルダIDを作成（スペースをハイフンに置き換えて小文字化）
    folder_id = folder_name.lower().replace(' ', '-')
    folder_path = os.path.join(OUTPUT_DIR, folder_id)
    
    # フォルダが既に存在するかチェック
    if os.path.exists(folder_path):
        return jsonify({'error': '同じ名前のフォルダが既に存在します'}), 400
    
    # フォルダ作成
    os.makedirs(folder_path, exist_ok=True)
    
    return jsonify({
        'id': folder_id,
        'name': folder_name,
        'message': 'フォルダが作成されました'
    })

@app.route('/api/folders/<folder_id>', methods=['PUT'])
def update_folder(folder_id):
    """フォルダ名の更新API"""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({'error': 'フォルダ名が指定されていません'}), 400
    
    folder_path = os.path.join(OUTPUT_DIR, folder_id)
    
    # フォルダが存在するかチェック
    if not os.path.exists(folder_path):
        return jsonify({'error': 'フォルダが見つかりません'}), 404
    
    # 新しいフォルダ名
    new_name = data['name'].strip()
    if not new_name:
        return jsonify({'error': 'フォルダ名を入力してください'}), 400
    
    new_id = new_name.lower().replace(' ', '-')
    new_path = os.path.join(OUTPUT_DIR, new_id)
    
    # 新しいフォルダ名が既に存在するかチェック
    if new_id != folder_id and os.path.exists(new_path):
        return jsonify({'error': '同じ名前のフォルダが既に存在します'}), 400
    
    # フォルダ名変更
    os.rename(folder_path, new_path)
    
    return jsonify({
        'id': new_id,
        'name': new_name,
        'message': 'フォルダ名が更新されました'
    })

@app.route('/api/folders/<folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    """フォルダの削除API"""
    # デフォルトフォルダは削除不可
    if folder_id in DEFAULT_FOLDERS:
        return jsonify({'error': 'デフォルトフォルダは削除できません'}), 400
    
    folder_path = os.path.join(OUTPUT_DIR, folder_id)
    
    # フォルダが存在するかチェック
    if not os.path.exists(folder_path):
        return jsonify({'error': 'フォルダが見つかりません'}), 404
    
    # フォルダと内容物を削除
    shutil.rmtree(folder_path)
    
    return jsonify({
        'message': 'フォルダが削除されました'
    })

@app.route('/api/config', methods=['GET'])
def get_config():
    """設定情報の取得API"""
    return jsonify({
        'output_dir': OUTPUT_DIR,
        'allowed_extensions': list(ALLOWED_EXTENSIONS),
        'default_folders': DEFAULT_FOLDERS
    })

@app.route('/output/<path:filename>')
def download_file(filename):
    """変換されたファイルのダウンロード"""
    # ファイルパスの検証と安全対策が必要
    directory = os.path.dirname(filename)
    file = os.path.basename(filename)
    return send_from_directory(os.path.join(OUTPUT_DIR, directory), file)

@app.route('/explore/<path:folder_path>')
def explore_folder(folder_path):
    """フォルダ内のファイル一覧を表示"""
    try:
        full_path = os.path.join(OUTPUT_DIR, folder_path)
        
        # パスのバリデーション（ディレクトリトラバーサル対策）
        if not os.path.realpath(full_path).startswith(os.path.realpath(OUTPUT_DIR)):
            return jsonify({'error': '無効なパスです'}), 400
        
        if not os.path.exists(full_path):
            return jsonify({'error': 'フォルダが見つかりません'}), 404
        
        if not os.path.isdir(full_path):
            return jsonify({'error': 'このパスはフォルダではありません'}), 400
        
        files = []
        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            is_dir = os.path.isdir(item_path)
            
            # 最終更新日時
            modified_time = os.path.getmtime(item_path)
            modified_date = datetime.fromtimestamp(modified_time).strftime('%Y-%m-%d %H:%M:%S')
            
            file_info = {
                'name': item,
                'is_directory': is_dir,
                'path': os.path.join(folder_path, item).replace('\\', '/'),
                'modified_date': modified_date
            }
            
            # ファイルサイズ（ディレクトリの場合は0）
            if not is_dir:
                file_info['size'] = os.path.getsize(item_path)
                
                # ファイル拡張子
                _, ext = os.path.splitext(item)
                file_info['extension'] = ext[1:] if ext else ''
            
            files.append(file_info)
        
        # ディレクトリを先に、その後にファイルをアルファベット順で並べる
        files.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
        
        return jsonify({
            'path': folder_path,
            'files': files
        })
    except Exception as e:
        logger.exception(f"フォルダ探索エラー: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    """ファイルサイズ超過エラーハンドラ"""
    return jsonify({'error': 'ファイルサイズが大きすぎます'}), 413

@app.errorhandler(404)
def page_not_found(error):
    """404エラーハンドラ"""
    return jsonify({'error': 'ページが見つかりません'}), 404

@app.errorhandler(500)
def internal_server_error(error):
    """500エラーハンドラ"""
    return jsonify({'error': 'サーバー内部エラーが発生しました'}), 500


if __name__ == '__main__':
    # コマンドライン引数のパース
    args = parse_arguments()
    
    # アプリケーションのセットアップ
    setup_application(args.output_path)
    
    # サーバーの起動
    print(f"Markitdown WebUI サーバーを起動しています。http://{args.host}:{args.port}/")
    print(f"保存先ディレクトリ: {OUTPUT_DIR}")
    app.run(debug=args.debug, host=args.host, port=args.port)