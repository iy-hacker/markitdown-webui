import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-logo">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="header-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <line x1="9" y1="10" x2="15" y2="10"></line>
            <line x1="12" y1="7" x2="12" y2="13"></line>
          </svg>
          <h1 className="header-title">{title}</h1>
        </div>
        <div>
          <button className="btn btn-secondary">設定</button>
        </div>
      </div>
    </header>
  );
};