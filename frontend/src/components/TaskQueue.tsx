import React from 'react';
import { Task, TaskStatus } from '../types';

interface TaskQueueProps {
  tasks: Task[];
  progress: number;
  onDelete: (taskId: string) => Promise<boolean>;
  onDownload: (taskId: string) => Promise<boolean>;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({ 
  tasks, 
  progress, 
  onDelete, 
  onDownload 
}) => {
  // ステータスに応じたスタイルを取得
  const getStatusClass = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.SUCCESS:
        return 'status-success';
      case TaskStatus.ERROR:
        return 'status-error';
      case TaskStatus.PROCESSING:
        return 'status-processing';
      default:
        return 'status-waiting';
    }
  };

  // ステータスに応じた表示テキストを取得
  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.SUCCESS:
        return '完了';
      case TaskStatus.ERROR:
        return '失敗';
      case TaskStatus.PROCESSING:
        return '処理中';
      default:
        return '待機中';
    }
  };

  // タスクを削除
  const handleDelete = async (taskId: string) => {
    if (window.confirm('このタスクを削除してもよろしいですか？')) {
      await onDelete(taskId);
    }
  };

  // マークダウンをダウンロード
  const handleDownload = async (taskId: string) => {
    await onDownload(taskId);
  };
  
  return (
    <div className="task-queue">
      <div className="section-header">
        <h2 className="section-title">タスクキュー</h2>
        
        {/* 進捗バー */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-value" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {tasks.filter(t => t.status === TaskStatus.SUCCESS || t.status === TaskStatus.ERROR).length}/{tasks.length} タスク完了
          </div>
        </div>
      </div>
      
      {/* タスク一覧のヘッダー */}
      <div className="task-header">
        <div className="task-col-index">#</div>
        <div className="task-col-name">名前</div>
        <div className="task-col-status">ステータス</div>
        <div className="task-col-retry">リトライ</div>
        <div className="task-col-action">アクション</div>
      </div>
      
      {/* タスク一覧 */}
      <div className="task-list">
        {tasks.length === 0 ? (
          <div className="empty-tasks">
            タスクはありません
          </div>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id} className="task-item">
              <div className="task-col-index">{index + 1}</div>
              <div className="task-col-name" title={task.name}>
                {task.name}
              </div>
              <div className={`task-col-status ${getStatusClass(task.status)}`}>
                {getStatusText(task.status)}
              </div>
              <div className="task-col-retry">
                {task.retry_count}/{3}
              </div>
              <div className="task-col-action">
                {task.status === TaskStatus.SUCCESS ? (
                  <button
                    onClick={() => handleDownload(task.id)}
                    className="btn btn-success btn-sm"
                  >
                    ダウンロード
                  </button>
                ) : task.status === TaskStatus.PROCESSING ? (
                  <span className="btn-disabled btn-sm">
                    処理中
                  </span>
                ) : (
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="btn btn-danger btn-sm"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};