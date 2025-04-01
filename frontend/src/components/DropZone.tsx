import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '../hooks/useFileUpload';

interface DropZoneProps {
  onUploadSuccess: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onUploadSuccess }) => {
  const [url, setUrl] = useState('');
  const { 
    uploading, 
    error, 
    onDropAccepted, 
    onDropRejected, 
    processUrl 
  } = useFileUpload(onUploadSuccess);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted,
    onDropRejected,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/pdf': ['.pdf'],
      'text/html': ['.html', '.htm'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-powerpoint': ['.ppt'],
    },
  });

  const handleUrlSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    try {
      await processUrl(url);
      setUrl('');
    } catch (err) {
      console.error('URL processing failed:', err);
    }
  }, [url, processUrl]);

  return (
    <div className="dropzone-container">
      <div 
        {...getRootProps({
          className: `drop-area ${isDragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`,
        })}
      >
        <input {...getInputProps()} />
        
        <div className="drop-icon">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        
        <p className="drop-title">
          ファイルをドラッグ＆ドロップまたはクリックしてファイルを選択
        </p>
        <p className="drop-subtitle">
          サポートされているファイル: .docx, .xlsx, .pptx, .pdf, .html, .txt など
        </p>
        
        {uploading && (
          <div className="uploading-indicator">
            <div className="uploading-text">アップロード中...</div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="url-form-container">
        <form onSubmit={handleUrlSubmit} className="url-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/document.pdf"
            className="url-input"
            disabled={uploading}
            required
          />
          <button
            type="submit"
            className={`btn btn-primary ${uploading ? 'disabled' : ''}`}
            disabled={uploading}
          >
            追加
          </button>
        </form>
        <p className="url-form-help">
          または、URLを入力して処理することもできます
        </p>
      </div>
    </div>
  );
};