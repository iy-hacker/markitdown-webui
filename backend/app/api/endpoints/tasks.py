import sys
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Path

from ...core.queue import task_queue
from ...models.task import Task, TaskList, TaskStatus, TaskUpdate

router = APIRouter()

@router.get("/", response_model=TaskList)
async def get_tasks():
    """タスク一覧を取得"""
    # print("\n>>> get_tasks API called")
    try:
        tasks = task_queue.get_all_tasks()
        # print(f">>> Retrieved {len(tasks)} tasks")
        
        # 詳細な情報をログに出力
        for i, task in enumerate(tasks):
            print(f">>>   Task {i+1}: id={task.id}, name={task.name}, status={task.status}, retry={task.retry_count}")
            if task.output_path:
                print(f">>>     output_path={task.output_path}")
            if task.error_message:
                print(f">>>     error={task.error_message}")
        
        response = {
            "total": len(tasks),
            "tasks": tasks
        }
        print(f">>> Returning response with {len(tasks)} tasks\n")
        return response
    except Exception as e:
        print(f">>> ERROR in get_tasks: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tasks: {str(e)}")