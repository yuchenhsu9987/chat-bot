import React from 'react';
import './ChatMessage.css';

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: Date;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isBot, timestamp }) => {
  return (
    <div className={`message-container ${isBot ? 'bot' : 'user'}`}>
      <div className="message-content">
        <div className="message-avatar">
          <img 
            src={isBot ? '/chat-bot.png' : '/chat-user.png'} 
            alt={isBot ? 'AI' : '用戶'} 
            className="avatar-image"
          />
        </div>
        <div className="message-bubble">
          <div className="message-text">{message}</div>
          <div className="message-time">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 