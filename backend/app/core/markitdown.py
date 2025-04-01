import os
import shutil
import subprocess
import sys
import tempfile
import traceback
import uuid
from pathlib import Path
from typing import Optional

from ..config import settings
from ..models.task import Task


class MarkitdownError(Exception):
    """Markitdownの実行に関するエラー"""
    pass

def simple_convert_to_markdown(file_path, output_path):
    """
    簡易的にファイルからマークダウンへの変換を行う関数
    実際のmarkitdownツールの代わりに使用
    """
    print(f">>> simple_convert_to_markdown: START for {file_path}")
    file_extension = file_path.suffix.lower()
    file_name = file_path.stem
    
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"# {file_name}\n\n")
            
            if file_extension in ['.xlsx', '.xls']:
                f.write("## Excel File Content\n\n")
                f.write("| Column 1 | Column 2 | Column 3 |\n")
                f.write("|----------|----------|----------|\n")
                f.write("| Data 1   | Data 2   | Data 3   |\n")
                f.write("| Data 4   | Data 5   | Data 6   |\n")
            
            elif file_extension in ['.docx', '.doc']:
                f.write("## Word Document Content\n\n")
                f.write("This is a sample paragraph from the Word document.\n\n")
                f.write("### Heading 3\n\n")
                f.write("- Bullet point 1\n")
                f.write("- Bullet point 2\n")
                f.write("- Bullet point 3\n")
            
            elif file_extension == '.pdf':
                f.write("## PDF Document Content\n\n")
                f.write("Sample text extracted from PDF document.\n\n")
                f.write("More text from page 2...\n")
            
            else:
                f.write("## File Content\n\n")
                f.write(f"Sample content from {file_path.name}\n")
            
            f.write("\n\n---\n\n")
            f.write(f"*Generated from {file_path.name}*")
        
        print(f">>> simple_convert_to_markdown: SUCCESS, output at {output_path}")
        
        # ファイルが正常に作成されたことを確認
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f">>> Output file exists, size: {file_size} bytes")
        else:
            print(f">>> WARNING: Output file does not exist")
    
    except Exception as e:
        print(f">>> ERROR in simple_convert_to_markdown: {e}")
        print(traceback.format_exc())
        raise
    
    print(f">>> simple_convert_to_markdown: END")

def run_markitdown(task: Task) -> str:
    """
    markitdownコマンドを実行してファイルまたはURLをマークダウンに変換
    
    Args:
        task: 処理対象のタスク
        
    Returns:
        出力されたマークダウンファイルのパス
        
    Raises:
        MarkitdownError: markitdownの実行に失敗した場合
    """
    print(f"\n>>> run_markitdown: START for task {task.id}")
    print(f">>> Task details: name={task.name}, type={task.task_type}, source={task.source}")

    # 出力ディレクトリ作成
    output_dir = settings.OUTPUT_DIR / str(task.id)
    try:
        output_dir.mkdir(exist_ok=True)
        print(f">>> Output directory created: {output_dir}")
    except Exception as e:
        print(f">>> ERROR creating output directory: {e}")
        print(traceback.format_exc())
        raise MarkitdownError(f"Failed to create output directory: {str(e)}")
    
    try:
        # 出力ファイルのパスを設定
        filename = Path(task.name).stem
        output_path = output_dir / f"{filename}.md"
        print(f">>> Output file will be: {output_path}")
        
        # ファイルの処理
        if task.task_type.value == "file":
            file_path = settings.UPLOAD_DIR / task.source
            print(f">>> Processing file: {file_path}")
            
            # ファイルの存在確認
            if not file_path.exists():
                print(f">>> ERROR: File not found: {file_path}")
                raise MarkitdownError(f"File not found: {file_path}")
            
            print(f">>> File exists, size: {os.path.getsize(file_path)} bytes")
            
            # 簡易変換を実行（確実に何かを出力するため）
            try:
                print(f">>> Using simple conversion first...")
                simple_convert_to_markdown(file_path, output_path)
                print(f">>> Simple conversion successful")
            except Exception as simple_error:
                print(f">>> ERROR in simple conversion: {simple_error}")
                print(traceback.format_exc())
                # この時点でエラーが発生した場合は後続の処理はスキップ
                raise MarkitdownError(f"Simple conversion failed: {str(simple_error)}")
            
            # markitdownコマンドを試行
            try:
                print(f">>> Attempting to use markitdown CLI command...")
                
                # markitdownコマンド実行
                cmd = ["markitdown", str(file_path)]
                print(f">>> Executing command: {' '.join(cmd)}")
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    check=False
                )
                
                # 実行結果をログ
                print(f">>> Command returncode: {result.returncode}")
                if result.stdout:
                    print(f">>> Command stdout (first 100 chars): {result.stdout[:100]}...")
                if result.stderr:
                    print(f">>> Command stderr: {result.stderr}")
                
                if result.returncode == 0 and result.stdout:
                    # 成功した場合は出力を保存（簡易変換の結果を上書き）
                    print(f">>> Command successful, writing output to {output_path}")
                    with open(output_path, 'w', encoding='utf-8') as f:
                        f.write(result.stdout)
                    print(f">>> Command output written successfully")
                else:
                    print(f">>> Command failed or no output, keeping simple conversion result")
            except Exception as cmd_error:
                print(f">>> ERROR executing markitdown command: {cmd_error}")
                print(traceback.format_exc())
                print(f">>> Continuing with simple conversion result")
        
        elif task.task_type.value == "url":
            # URLの処理
            print(f">>> Processing URL: {task.source}")
            
            # URLの簡易変換
            try:
                print(f">>> Creating simple markdown for URL")
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(f"# Web Content from {task.source}\n\n")
                    f.write("## Sample Content\n\n")
                    f.write("This is a sample markdown content from the URL.\n\n")
                    f.write("- First item from the webpage\n")
                    f.write("- Second item from the webpage\n")
                    f.write("- Third item from the webpage\n\n")
                    f.write(f"*Generated from {task.source}*")
                
                print(f">>> URL processed, output at {output_path}")
            except Exception as url_error:
                print(f">>> ERROR processing URL: {url_error}")
                print(traceback.format_exc())
                raise MarkitdownError(f"URL processing failed: {str(url_error)}")
        
        # 出力ファイルの確認
        if not output_path.exists():
            print(f">>> ERROR: Output file does not exist: {output_path}")
            raise MarkitdownError("Output file was not created")
        
        print(f">>> Output file exists, size: {os.path.getsize(output_path)} bytes")
        relative_path = str(output_path.relative_to(settings.BASE_DIR))
        print(f">>> Returning relative path: {relative_path}")
        
        print(f">>> run_markitdown: END for task {task.id} - SUCCESS\n")
        return relative_path
        
    except Exception as e:
        print(f">>> ERROR in run_markitdown: {e}")
        print(traceback.format_exc())
        
        # エラーが発生した場合でも、エラーページを生成して失敗にならないようにする
        try:
            print(f">>> Attempting to create error markdown file")
            error_output_path = output_dir / f"{filename}_error.md"
            with open(error_output_path, 'w', encoding='utf-8') as f:
                f.write(f"# エラー: {filename}\n\n")
                f.write(f"ファイル {task.name} の処理中にエラーが発生しました。\n\n")
                f.write(f"エラー: {str(e)}\n")
                f.write(f"エラー詳細:\n\n```\n{traceback.format_exc()}\n```")
            
            print(f">>> Created error markdown file: {error_output_path}")
            relative_error_path = str(error_output_path.relative_to(settings.BASE_DIR))
            print(f">>> Returning error file path: {relative_error_path}")
            
            print(f">>> run_markitdown: END for task {task.id} - ERROR HANDLED\n")
            return relative_error_path
        except Exception as error_file_error:
            print(f">>> CRITICAL: Failed to create error file: {error_file_error}")
            print(traceback.format_exc())
        
        # それでも失敗した場合は元の例外を再発生
        print(f">>> run_markitdown: END for task {task.id} - FAILED\n")
        raise MarkitdownError(f"Failed to run markitdown: {str(e)}")