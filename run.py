"""
Markitdown WebUI の Uvicorn を使用した起動スクリプト
"""
import argparse
import os

import uvicorn
from asgiref.wsgi import WsgiToAsgi

# アプリケーションのインポート
from app import app, setup_application


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

if __name__ == "__main__":
    # コマンドライン引数を解析
    args = parse_arguments()
    
    # アプリケーションのセットアップ
    setup_application(args.output_path)
    
    # FlaskアプリをASGIに変換
    asgi_app = WsgiToAsgi(app)
    
    # ログレベルを設定
    log_level = "debug" if args.debug else "info"
    
    # Uvicornで実行
    print(f"Markitdown WebUI サーバーを起動しています（Uvicorn）。http://{args.host}:{args.port}/")
    uvicorn.run(asgi_app, host=args.host, port=args.port, log_level=log_level)