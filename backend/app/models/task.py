from datetime import datetime
from enum import Enum
from typing import List, Optional, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, HttpUrl


class TaskStatus(str, Enum):
    WAITING = "waiting"
    PROCESSING = "processing"
    SUCCESS = "success"
    ERROR = "error"

class TaskType(str, Enum):
    FILE = "file"
    URL = "url"

class TaskBase(BaseModel):
    name: str
    task_type: TaskType
    source: Union[str, HttpUrl]  # ファイルパスまたはURL
    retry_count: int = 0
    status: TaskStatus = TaskStatus.WAITING
    error_message: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    output_path: Optional[str] = None
    
    class Config:
        json_encoders = {
            UUID: lambda v: str(v),
            datetime: lambda v: v.isoformat(),
        }

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    retry_count: Optional[int] = None
    output_path: Optional[str] = None
    error_message: Optional[str] = None

class TaskList(BaseModel):
    total: int
    tasks: List[Task]