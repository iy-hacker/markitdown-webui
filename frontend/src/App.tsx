import React from 'react';
import { DropZone } from './components/DropZone';
import { Header } from './components/Header';
import { ResultList } from './components/ResultList';
import { TaskQueue } from './components/TaskQueue';
import { useTaskQueue } from './hooks/useTaskQueue';

const App: React.FC = () => {
  const { 
    tasks, 
    loading, 
    error, 
    fetchTasks, 
    deleteTask, 
    getMarkdown, 
    downloadMarkdown, 
    progress 
  } = useTaskQueue();

  return (
    <div className="app">
      <Header title="Markitdown WebUI" />
      
      <main className="main">
        {/* ファイル/URL入力セクション */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">ファイルまたはURLを追加</h2>
          </div>
          <div className="card-body">
            <DropZone onUploadSuccess={fetchTasks} />
          </div>
        </div>
        
        {/* タスクキュー */}
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">タスク情報を読み込み中...</p>
          </div>
        ) : (
          <TaskQueue 
            tasks={tasks} 
            progress={progress}
            onDelete={deleteTask}
            onDownload={downloadMarkdown}
          />
        )}
        
        {/* 変換結果 */}
        <ResultList 
          tasks={tasks}
          onPreview={getMarkdown}
          onDownload={downloadMarkdown}
        />
        
        {/* エラー表示 */}
        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}
      </main>
      
      <footer className="footer">
        <div className="container">
          <p className="footer-text">Markitdown WebUI - 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default App;