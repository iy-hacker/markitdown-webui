"""
TaskQueue - concurrent.futures.ThreadPoolExecutorを使ったシンプルなタスク処理
"""

from .exceptions import TaskQueueError
from .queue import TaskHandler, TaskQueue, create_queue
from .task import Task, TaskResult, TaskStatus

__version__ = "1.0.0"
__all__ = [
    "TaskQueueError",
    "Task",
    "TaskStatus",
    "TaskResult",
    "TaskQueue",
    "TaskHandler",
    "create_queue",
]