"""
TaskQueue用の基本例外クラス
"""
from typing import Any, Optional


class TaskQueueError(Exception):
    """TaskQueueの基本例外クラス"""
    def __init__(self, message: str, details: Optional[Any] = None):
        self.message = message
        self.details = details
        super().__init__(message)