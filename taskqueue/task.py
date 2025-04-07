"""
シンプルなタスク定義と結果管理
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Generic, Optional, TypeVar
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """タスクの状態"""
    WAITING = "waiting"      # 待機中
    PROCESSING = "processing" # 処理中
    SUCCESS = "success"      # 成功
    ERROR = "error"         # エラー
    CANCELED = "canceled"    # キャンセル済み


# 結果の型パラメータ
R = TypeVar('R')


class Task(BaseModel):
    """タスク定義"""
    id: UUID = Field(default_factory=uuid4)
    type: str
    name: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    status: TaskStatus = Field(default=TaskStatus.WAITING)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    error_message: Optional[str] = None
    result: Optional[Any] = None
    
    class Config:
        arbitrary_types_allowed = True


class TaskResult(Generic[R]):
    """タスク実行結果"""
    def __init__(
        self,
        success: bool,
        result: Optional[R] = None,
        error: Optional[str] = None
    ):
        self.success = success
        self.result = result
        self.error = error

    @classmethod
    def success(cls, result: Optional[R] = None) -> TaskResult[R]:
        """成功結果を作成"""
        return cls(True, result)
    
    @classmethod
    def failure(cls, error: str) -> TaskResult[R]:
        """失敗結果を作成"""
        return cls(False, None, error)