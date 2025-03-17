import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import ChatMessage from './components/ChatMessage';
import LoadingDots from './components/LoadingDots';
import AboutPage from './components/AboutPage';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './App.css';

interface Message {
  id?: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
}

// API 配置
const API_CONFIG = {
  MODEL: "gemini-1.5-flash",
  API_KEY: 'AIzaSyDncL2oPZLpA66fasmDkTeMen3c1byYnR8',
  SYSTEM_PROMPT: '你是一個有幫助的 AI 助手。請用中文回答問題。回答要簡潔、專業、有禮貌。',
  DEFAULT_PARAMS: {
    temperature: 0.7,
    maxOutputTokens: 2048,
    topP: 0.8,
    topK: 40
  }
};

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(API_CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: API_CONFIG.MODEL });

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  // 檢查環境變量
  useEffect(() => {
    console.log('Environment Variables:', {
      OPENROUTER_API_KEY: process.env.REACT_APP_OPENROUTER_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    });
  }, []);

  // 監聽聊天列表
  useEffect(() => {
    const q = query(collection(db, 'chats'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newChats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '新對話',
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });
      setChats(newChats);
      
      // 如果沒有當前聊天，設置最新的聊天為當前聊天
      if (!currentChatId && newChats.length > 0) {
        setCurrentChatId(newChats[0].id);
      }
    });

    return () => unsubscribe();
  }, [currentChatId]);

  // 監聽當前聊天的消息
  useEffect(() => {
    if (!currentChatId) return;

    const q = query(
      collection(db, 'chats', currentChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp = new Date();

        try {
          if (data.timestamp) {
            if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp.seconds) {
              timestamp = new Date(data.timestamp.seconds * 1000);
            } else if (data.timestamp.toDate && typeof data.timestamp.toDate === 'function') {
              timestamp = data.timestamp.toDate();
            }
          }
        } catch (error) {
          console.warn('時間戳解析錯誤:', error);
          timestamp = new Date();
        }
        
        return {
          id: doc.id,
          text: data.text || '',
          isBot: !!data.isBot,
          timestamp: timestamp
        };
      });
      setMessages(newMessages);
      // 切換對話時自動滾動到底部
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [currentChatId]);

  // 創建新聊天
  const createNewChat = async () => {
    try {
      const docRef = await addDoc(collection(db, 'chats'), {
        title: '新對話',
        createdAt: serverTimestamp()
      });
      setCurrentChatId(docRef.id);
      // 創建新對話時自動滾動到底部
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('創建新對話失敗:', error);
    }
  };

  // 重命名對話
  const handleRename = async (chatId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        title: newTitle.trim()
      });
      setEditingChatId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('重命名失敗:', error);
    }
  };

  // 刪除對話
  const handleDelete = async (chatId: string) => {
    if (!window.confirm('確定要刪除這個對話嗎？')) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('刪除失敗:', error);
    }
  };

  // API 調用
  const callGeminiAPI = async (userMessage: string) => {
    try {
      console.log('開始 API 調用...');
      
      // 生成回應
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: userMessage }]
        }],
        generationConfig: {
          temperature: API_CONFIG.DEFAULT_PARAMS.temperature,
          maxOutputTokens: API_CONFIG.DEFAULT_PARAMS.maxOutputTokens,
          topP: API_CONFIG.DEFAULT_PARAMS.topP,
          topK: API_CONFIG.DEFAULT_PARAMS.topK
        }
      });

      const response = await result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('API 響應格式錯誤：未收到有效回應');
      }

      return text;
    } catch (error: any) {
      console.error('API 調用錯誤:', error);
      
      if (error.message.includes('API key not valid')) {
        throw new Error('API 密鑰無效，請確保使用正確的 Google AI API Key');
      } else if (error.message.includes('quota exceeded')) {
        throw new Error('API 請求配額超限，請稍後再試');
      } else if (error.message.includes('permission denied')) {
        throw new Error('API 授權錯誤，請檢查 API 密鑰');
      }
      
      throw error;
    }
  };

  // 消息處理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChatId) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // 添加用戶消息
      await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
        text: userMessage,
        isBot: false,
        timestamp: serverTimestamp()
      });

      // 獲取 AI 回應
      const botResponse = await callGeminiAPI(userMessage);
      
      // 添加 AI 回應
      await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
        text: botResponse || "抱歉，我現在無法回應。請稍後再試。",
        isBot: true,
        timestamp: serverTimestamp()
      });
    } catch (error: any) {
      console.error('Error:', error);
      let errorMessage = "抱歉，發生錯誤。請稍後再試。";
      
      if (error.message.includes('API 密鑰未設置')) {
        errorMessage = "系統配置錯誤：API 密鑰未正確設置，請聯繫管理員。";
      }

      await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
        text: errorMessage,
        isBot: true,
        timestamp: serverTimestamp()
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  // 處理對話切換
  const handleChatSwitch = (chatId: string) => {
    setCurrentChatId(chatId);
    setShowAbout(false);  // 關閉關於頁面
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="new-chat-button" onClick={createNewChat}>
          + 新對話
        </button>
        <div className="chat-list">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
            >
              {editingChatId === chat.id ? (
                <div className="chat-title-edit">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id, editingTitle)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(chat.id, editingTitle);
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <div 
                  className="chat-item-content" 
                  onClick={() => handleChatSwitch(chat.id)}
                >
                  <span className="chat-title">{chat.title}</span>
                  <span className="chat-date">
                    {chat.createdAt.toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="chat-actions">
                <button
                  className="chat-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingChatId(chat.id);
                    setEditingTitle(chat.title);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="chat-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(chat.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
        <button 
          className="about-button"
          onClick={() => setShowAbout(true)}
        >
          ℹ️ 關於
        </button>
      </aside>

      <main className="main-content">
        {showAbout ? (
          <div className="about-container">
            <button 
              className="close-about-button"
              onClick={() => setShowAbout(false)}
            >
              ← 返回聊天
            </button>
            <AboutPage />
          </div>
        ) : (
          <>
            <header className="app-header">
              <h1>AI 助手</h1>
            </header>
            
            <div className="chat-container">
              <div className="messages">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id || index}
                    message={message.text}
                    isBot={message.isBot}
                    timestamp={message.timestamp}
                  />
                ))}
                {isLoading && (
                  <div className="message-container bot">
                    <div className="message-content">
                      <div className="message-avatar">
                        <img 
                          src="/chat-bot.png" 
                          alt="AI" 
                          className="avatar-image"
                        />
                      </div>
                      <div className="message-bubble">
                        <LoadingDots />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="input-form" onSubmit={handleSubmit}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="輸入訊息..."
                  rows={1}
                />
                <button type="submit" disabled={!input.trim() || isLoading}>
                  發送
                </button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
