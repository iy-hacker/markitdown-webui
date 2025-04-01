import asyncio
import queue
import threading
import time
import traceback  # トレースバック情報取得用
import uuid
from datetime import datetime
from typing import Callable, Dict, List, Optional

from ..config import settings
from ..models.task import Task, TaskStatus


# シンプルなインメモリキューの実装
class TaskQueue:
    def __init__(self):
        self.queue = queue.Queue()
        self.tasks: Dict[uuid.UUID, Task] = {}
        self.current_task: Optional[Task] = None
        self.lock = threading.Lock()
        self.processing_event = threading.Event()
        print("TaskQueue initializing...")
        self.task_handlers: Dict[str, Callable] = {}
        # ワーカースレッドは最後に初期化
        self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()
        print("Worker thread started")
        
    def register_handler(self, task_type: str, handler: Callable):
        """タスクタイプに対応するハンドラーを登録"""
        print(f"Registering handler for task type: {task_type}")
        self.task_handlers[task_type] = handler
    
    def add_task(self, task: Task) -> Task:
        """新しいタスクをキューに追加"""
        with self.lock:
            self.tasks[task.id] = task
            self.queue.put(task.id)
            print(f"Task added to queue: {task.id} - {task.name}, queue size now: {self.queue.qsize()}")
        return task
    
    def get_task(self, task_id: uuid.UUID) -> Optional[Task]:
        """タスクIDからタスクを取得"""
        with self.lock:
            return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> List[Task]:
        """全タスクを取得"""
        with self.lock:
            return list(self.tasks.values())
    
    def update_task(self, task_id: uuid.UUID, **kwargs) -> Optional[Task]:
        """タスクを更新"""
        with self.lock:
            if task_id not in self.tasks:
                print(f"Task {task_id} not found during update")
                return None
            
            task = self.tasks[task_id]
            
            # 更新フィールドを適用
            for key, value in kwargs.items():
                if hasattr(task, key):
                    setattr(task, key, value)
                else:
                    print(f"Warning: Task has no attribute {key}")
            
            task.updated_at = datetime.now()
            print(f"Task {task_id} updated with {kwargs}")
            return task

    def _process_queue(self):
        """キューからタスクを処理するワーカースレッド"""
        current_thread = threading.current_thread()
        print(f">>> WORKER THREAD STARTED: name={current_thread.name}, id={current_thread.ident}")
        
        while True:
            try:
                print("\n>>> --- Worker cycle start ---")
                
                # キューからタスクを取得
                print(">>> Waiting for a task...")
                try:
                    task_id = self.queue.get(block=True, timeout=2.0)
                    print(f">>> Got task from queue: {task_id}")
                except queue.Empty:
                    continue
                
                # タスクの処理部分を1つの大きなtry-exceptで囲む
                try:
                    # タスクの存在確認とステータス更新
                    print(">>> Step 1: Checking task")
                    with self.lock:
                        if task_id not in self.tasks:
                            print(f">>> Task {task_id} not found")
                            self.queue.task_done()
                            continue
                        
                        task = self.tasks[task_id]
                        print(f">>> Step 2: Found task: {task.name}")
                    
                    # 各ステップを別々のロックで処理（デッドロック防止）
                    print(">>> Step 3: Updating status")
                    with self.lock:
                        task = self.tasks[task_id]
                        task.status = TaskStatus.PROCESSING
                        task.updated_at = datetime.now()
                        print(f">>> Status updated to PROCESSING")
                    
                    # タスク処理はロックの外で
                    print(">>> Step 4: Processing task")
                    handler = self.task_handlers.get(task.task_type.value)
                    result = None
                    
                    if handler:
                        print(f">>> Step 5: Found handler")
                        result = handler(task)
                        print(f">>> Step 6: Handler completed: {result}")
                    else:
                        print(f">>> Step 5: No handler found")
                    
                    # 結果更新
                    print(">>> Step 7: Updating result")
                    with self.lock:
                        if result:
                            self.tasks[task_id].status = TaskStatus.SUCCESS
                            self.tasks[task_id].output_path = result
                        else:
                            self.tasks[task_id].status = TaskStatus.ERROR
                            self.tasks[task_id].error_message = "No handler or processing failed"
                        
                        self.tasks[task_id].updated_at = datetime.now()
                        print(f">>> Result updated")
                    
                    print(f">>> Step 8: Task completed")
                
                except Exception as task_error:
                    print(f">>> ERROR processing task: {task_error}")
                    print(traceback.format_exc())
                    
                    try:
                        with self.lock:
                            if task_id in self.tasks:
                                task = self.tasks[task_id]
                                retry_count = task.retry_count + 1
                                
                                if retry_count < settings.MAX_RETRY_COUNT:
                                    print(f">>> Retrying task")
                                    task.status = TaskStatus.WAITING
                                    task.retry_count = retry_count
                                    task.error_message = str(task_error)
                                    task.updated_at = datetime.now()
                                    self.queue.put(task_id)
                                else:
                                    print(f">>> Task failed permanently")
                                    task.status = TaskStatus.ERROR
                                    task.retry_count = retry_count
                                    task.error_message = str(task_error)
                                    task.updated_at = datetime.now()
                    except Exception as update_error:
                        print(f">>> ERROR updating task after failure: {update_error}")
                
                finally:
                    # タスクが完了したことをマーク
                    try:
                        self.queue.task_done()
                        print(">>> Queue task_done called")
                    except Exception as e:
                        print(f">>> ERROR in task_done: {e}")
                
                print(">>> --- Worker cycle end ---\n")
                
            except Exception as cycle_error:
                # サイクル全体のエラー
                print(f">>> CRITICAL: Cycle error: {cycle_error}")
                print(traceback.format_exc())
                # 短い遅延を入れて無限ループを防止
                time.sleep(0.5)

# シングルトンインスタンス
task_queue = TaskQueue()
print("TaskQueue singleton instance created")