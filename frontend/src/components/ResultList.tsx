import React, { useState } from 'react';
import { MarkdownResponse, Task, TaskStatus } from '../types';

interface ResultListProps {
  tasks: Task[];
  onPreview: (taskId: string) => Promise<MarkdownResponse>;
  onDownload: (taskId: string) => Promise<boolean>;
}

export const ResultList: React.FC<ResultListProps> = ({ 
  tasks, 
  onPreview, 
  onDownload 
}) => {
  const [previewContent, setPreviewContent] = useState<{ taskId: string; content: string } | null>(null);
  
  // 完了済みタスク
  const completedTasks = tasks.filter(task => task.status === TaskStatus.SUCCESS);
  
  // プレビュー表示
  const handlePreview = async (taskId: string) => {
    try {
      const response = await onPreview(taskId);
      setPreviewContent({
        taskId,
        content: response.content
      });
    } catch (err) {
      console.error('Failed to load preview:', err);
    }
  };
  
  // プレビューを閉じる
  const closePreview = () => {
    setPreviewContent(null);
  };
  
  // マークダウンをダウンロード
  const handleDownload = async (taskId: string) => {
    await onDownload(taskId);
  };
  
  return (
    <div className="result-list">
      <div className="section-header">
        <h2 className="section-title">変換結果</h2>
        
        {completedTasks.length > 0 && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              // すべての完了済みタスクをダウンロード
              completedTasks.forEach(task => onDownload(task.id));
            }}
          >
            すべてダウンロード
          </button>
        )}
      </div>
      
      {/* プレビューモーダル */}
      {previewContent && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">マークダウンプレビュー</h3>
              <button onClick={closePreview} className="modal-close">
                <svg xmlns="http://www.w3.org/2000/svg" className="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <pre className="markdown-preview">{previewContent.content}</pre>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => {
                  onDownload(previewContent.taskId);
                  closePreview();
                }}
                className="btn btn-success"
              >
                ダウンロード
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 結果一覧 */}
      <div className="result-content">
        {completedTasks.length === 0 ? (
          <div className="empty-results">
            <svg xmlns="http://www.w3.org/2000/svg" className="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="empty-text">
              変換結果はまだありません。<br />
              ファイルやURLを追加して変換を開始してください。
            </p>
          </div>
        ) : (
          <div className="result-grid">
            {completedTasks.map(task => (
              <div key={task.id} className="result-card">
                <div className="result-card-header" title={task.name}>
                  {task.name.replace(/\.[^/.]+$/, '')}.md
                </div>
                <div className="result-card-actions">
                  <button
                    onClick={() => handlePreview(task.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    プレビュー
                  </button>
                  <button
                    onClick={() => handleDownload(task.id)}
                    className="btn btn-success btn-sm"
                  >
                    ダウンロード
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};