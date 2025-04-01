from fastapi import APIRouter

from .endpoints import files, tasks

api_router = APIRouter()
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(files.router, prefix="/files", tags=["files"])