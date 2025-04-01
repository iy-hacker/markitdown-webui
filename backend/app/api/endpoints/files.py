from pathlib import Path
from typing import List, Optional

from fastapi import (APIRouter, BackgroundTasks, Depends, File, Form,
                     HTTPException, UploadFile)
from pydantic import HttpUrl

from ...core.queue import task_queue
from ...models.task import Task, TaskCreate, TaskType
from ...services import file_service

router = APIRouter()


@router.post("/upload/", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """ファイルをアップロードしてタスクを作成"""
    try:
        # デバッグ情報を出力
        print(f"Received file upload: {file.filename}")
        
        # ファイルを保存
        file_path = await file_service.save_uploaded_file(file)
        print(f"File saved at: {file_path}")
        
        # タスクを作成
        task_create = TaskCreate(
            name=file.filename,
            task_type=TaskType.FILE,
            source=file_path
        )
        
        # タスクをキューに追加
        task = Task(**task_create.dict())
        task = task_queue.add_task(task)
        print(f"Task created with ID: {task.id}")
        
        # キューのサイズを確認
        print(f"Current queue size: {task_queue.queue.qsize()}")
        print(f"Total tasks: {len(task_queue.tasks)}")
        
        return {"task_id": str(task.id), "message": "File uploaded and processing queued"}
    
    except Exception as e:
        print(f"Error in upload_file: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/url/", status_code=201)
async def process_url(url: HttpUrl = Form(...)):
    """URLを処理するタスクを作成"""
    try:
        # URLからファイル名を抽出
        file_name = Path(str(url).split('/')[-1]).name or "webpage"
        
        # タスクを作成
        task_create = TaskCreate(
            name=file_name, 
            task_type=TaskType.URL,
            source=str(url)
        )
        
        # タスクをキューに追加
        task = Task(**task_create.dict())
        task = task_queue.add_task(task)
        
        return {"task_id": str(task.id), "message": "URL processing queued"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{task_id}")
async def download_markdown(task_id: str):
    """マークダウンファイルの内容を取得"""
    try:
        # タスクを取得
        task = task_queue.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        if not task.output_path:
            raise HTTPException(status_code=404, detail="Output file not available")
        
        # マークダウン内容を取得
        content = file_service.get_markdown_content(task.output_path)
        
        return {
            "filename": f"{Path(task.name).stem}.md",
            "content": content
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))