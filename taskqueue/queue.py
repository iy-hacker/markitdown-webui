"""
concurrent.futures.ThreadPoolExecutorを使った極小のタスクキュー
即時実行とタスク単位のワーカー数指定をサポート
"""
import concurrent.futures
import logging
from concurrent.futures import Future, ThreadPoolExecutor
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union
from uuid import UUID

from .task import Task, TaskResult, TaskStatus

# タスクハンドラーの型定義
TaskHandler = Callable[[Task], Any]


class TaskQueue:
    """最小限のタスクキュー実装"""
    
    def __init__(
        self,
        default_max_workers: int = 4,
        auto_start: bool = True,
        logger: Optional[logging.Logger] = None
    ):
        """
        タスクキューの初期化
        
        Args:
            default_max_workers: デフォルトのワーカー数（タスク単位で上書き可能）
            auto_start: True=タスク追加時に自動実行、False=start()で一括実行
            logger: カスタムロガー（省略可）
        """
        self.default_max_workers = max(1, default_max_workers)
        self.auto_start = auto_start
        self.logger = logger or logging.getLogger(__name__)
        
        # タスク処理用ハンドラー
        self._handlers: Dict[str, TaskHandler] = {}
        
        # タスク管理
        self._tasks: Dict[UUID, Task] = {}
        self._futures: Dict[UUID, Future] = {}
        
        # メインの実行環境
        self._executor = ThreadPoolExecutor(max_workers=self.default_max_workers)
    
    def register_handler(self, task_type: str, handler: TaskHandler) -> None:
        """タスクタイプに対応するハンドラーを登録"""
        self.logger.debug(f"ハンドラー登録: {task_type}")
        self._handlers[task_type] = handler
    
    def add_task(
        self,
        task: Task,
        workers: Optional[int] = None,
        execute_now: Optional[bool] = None
    ) -> Task:
        """
        タスクを追加して実行（設定による）
        
        Args:
            task: 追加するタスク
            workers: このタスク専用のワーカー数（省略時はデフォルト値）
            execute_now: 即時実行するかどうか（省略時はauto_startの値）
        
        Returns:
            追加されたタスク
            
        Raises:
            ValueError: タスクタイプにハンドラーが登録されていない場合
        """
        if task.type not in self._handlers:
            raise ValueError(f"未登録のタスクタイプ: {task.type}")
        
        # タスク登録
        self._tasks[task.id] = task
        self.logger.debug(f"タスク追加: {task.id} - {task.name}")
        
        # 即時実行するかどうか
        should_execute = self.auto_start if execute_now is None else execute_now
        
        if should_execute:
            self._execute_task(task, workers)
        
        return task
    
    def execute_task(self, task_id: UUID, workers: Optional[int] = None) -> None:
        """
        特定のタスクを実行
        
        Args:
            task_id: 実行するタスクID
            workers: このタスク専用のワーカー数（省略時はデフォルト値）
            
        Raises:
            KeyError: 指定されたタスクIDが存在しない場合
        """
        if task_id not in self._tasks:
            raise KeyError(f"タスクが見つかりません: {task_id}")
        
        # すでに実行中/完了済みのタスクは再実行しない
        task = self._tasks[task_id]
        if task.status in (TaskStatus.PROCESSING, TaskStatus.SUCCESS):
            return
        
        self._execute_task(task, workers)
    
    def start(self, workers: Optional[int] = None) -> None:
        """
        待機中のすべてのタスクを実行
        
        Args:
            workers: 実行に使用するワーカー数（省略時はデフォルト値）
        """
        # 待機中のタスクを取得
        waiting_tasks = [
            task for task in self._tasks.values() 
            if task.status == TaskStatus.WAITING
        ]
        
        # すべて実行
        for task in waiting_tasks:
            self._execute_task(task, workers)
    
    def get_task(self, task_id: UUID) -> Optional[Task]:
        """タスクIDによりタスクを取得"""
        return self._tasks.get(task_id)
    
    def is_done(self, task_id: UUID) -> bool:
        """タスクが完了しているかどうかを確認"""
        if task_id not in self._tasks:
            return False
        
        task = self._tasks[task_id]
        return task.status in (TaskStatus.SUCCESS, TaskStatus.ERROR, TaskStatus.CANCELED)
    
    def wait(self, task_id: UUID, timeout: Optional[float] = None) -> bool:
        """
        タスクの完了を待機
        
        Args:
            task_id: 待機するタスクID
            timeout: タイムアウト秒数（省略時は無制限）
            
        Returns:
            True=タスク完了、False=タイムアウト
        """
        if task_id not in self._futures:
            # すでに実行が終わっているか、まだ実行されていない
            return self.is_done(task_id)
        
        try:
            # Futureの完了を待機
            self._futures[task_id].result(timeout=timeout)
            return True
        except concurrent.futures.TimeoutError:
            return False
    
    def shutdown(self, wait: bool = True) -> None:
        """
        実行環境をシャットダウン
        
        Args:
            wait: 実行中のタスクの終了を待つかどうか
        """
        self._executor.shutdown(wait=wait)
    
    def _execute_task(self, task: Task, workers: Optional[int] = None) -> None:
        """
        実際のタスク実行処理（内部メソッド）
        
        Args:
            task: 実行するタスク
            workers: このタスク専用のワーカー数（省略時はデフォルト値）
        """
        # すでに実行中なら何もしない
        if task.id in self._futures and not self._futures[task.id].done():
            return
        
        # ワーカー数を決定
        max_workers = workers or self.default_max_workers
        
        # タスク状態を処理中に更新
        task.status = TaskStatus.PROCESSING
        task.updated_at = datetime.now()
        
        # 専用のエグゼキュータを作成（タスクごとにワーカー数を分離）
        if workers:
            executor = ThreadPoolExecutor(max_workers=max_workers)
        else:
            executor = self._executor
        
        # ハンドラーを取得して実行
        handler = self._handlers[task.type]
        
        # タスクを実行（処理をFutureに委任）
        future = executor.submit(self._process_task, task, handler)
        self._futures[task.id] = future
        
        # コールバック設定
        future.add_done_callback(
            lambda f: self._task_completed(task.id, f, executor if workers else None)
        )
    
    def _process_task(self, task: Task, handler: TaskHandler) -> TaskResult:
        """
        タスク処理実行（ワーカースレッドで実行）
        
        Args:
            task: 処理するタスク
            handler: 処理ハンドラー
            
        Returns:
            TaskResult: 処理結果
        """
        try:
            self.logger.debug(f"タスク処理開始: {task.id} ({task.name})")
            result = handler(task)
            return TaskResult.success(result)
        except Exception as e:
            error_msg = f"タスク処理エラー: {str(e)}"
            self.logger.exception(error_msg)
            return TaskResult.failure(error_msg)
    
    def _task_completed(
        self,
        task_id: UUID,
        future: Future,
        executor: Optional[ThreadPoolExecutor] = None
    ) -> None:
        """
        タスク完了時の処理（コールバック）
        
        Args:
            task_id: 完了したタスクのID
            future: タスク実行のFutureオブジェクト
            executor: タスク専用のエグゼキュータ（あれば）
        """
        # Futureの登録解除
        self._futures.pop(task_id, None)
        
        # タスク専用のエグゼキュータがあればシャットダウン
        if executor:
            executor.shutdown(wait=False)
        
        # タスクが削除されていないか確認
        if task_id not in self._tasks:
            return
        
        task = self._tasks[task_id]
        
        try:
            # キャンセルされたかチェック
            if future.cancelled():
                task.status = TaskStatus.CANCELED
                task.updated_at = datetime.now()
                self.logger.debug(f"タスクがキャンセルされました: {task_id}")
                return
            
            # 結果を取得
            result = future.result()
            
            # 成功/失敗に基づいて状態を更新
            if result.success:
                task.status = TaskStatus.SUCCESS
                task.result = result.result
            else:
                task.status = TaskStatus.ERROR
                task.error_message = result.error
            
            task.updated_at = datetime.now()
            self.logger.debug(f"タスク完了: {task_id} - 状態: {task.status}")
            
            # タスクにコールバックがある場合は実行
            if task.callback:
                try:
                    task.callback(result)
                except Exception as e:
                    self.logger.exception(f"タスクコールバック実行中のエラー: {str(e)}")
        
        except Exception as e:
            # 想定外のエラー
            task.status = TaskStatus.ERROR
            task.error_message = f"内部エラー: {str(e)}"
            task.updated_at = datetime.now()
            self.logger.exception(f"タスク完了処理中のエラー: {str(e)}")


def create_queue(
    default_max_workers: int = 4,
    auto_start: bool = True,
    logger: Optional[logging.Logger] = None
) -> TaskQueue:
    """タスクキューを簡単に作成するヘルパー関数"""
    return TaskQueue(
        default_max_workers=default_max_workers,
        auto_start=auto_start,
        logger=logger
    )