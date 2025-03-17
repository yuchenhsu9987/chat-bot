import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import OpenAI from 'openai';

interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: any;
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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',
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Chat Bot Demo',
  },
});

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 訂閱消息集合的變化
    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData: Message[] = [];
      snapshot.forEach((doc) => {
        messageData.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messageData);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);

    try {
      // 1. 保存用戶消息
      const userMessage: Message = {
        text: input,
        sender: 'user',
        timestamp: serverTimestamp(),
      };

      const userDocRef = await addDoc(collection(db, 'messages'), userMessage);
      console.log('User message saved with ID:', userDocRef.id);

      setInput('');

      // 2. 調用AI API
      console.log('Sending request to OpenRouter API...');
      const completion = await openai.chat.completions.create({
        model: 'google/gemma-3-4b-it:free',
        messages: [
          {
            role: 'user',
            content: input,
          },
        ],
      });

      console.log('OpenRouter API Response:', completion);

      // 3. 保存AI回應
      if (completion.choices && completion.choices[0]?.message?.content) {
        const botMessage: Message = {
          text: completion.choices[0].message.content,
          sender: 'bot',
          timestamp: serverTimestamp(),
        };

        await addDoc(collection(db, 'messages'), botMessage);
        console.log('Bot message saved successfully');
      }
    } catch (error) {
      console.error('Error:', error);
      
      // 添加錯誤消息
      const errorMessage: Message = {
        text: '抱歉，發生了一些錯誤。請稍後再試。',
        sender: 'bot',
        timestamp: serverTimestamp(),
      };
      await addDoc(collection(db, 'chats'), errorMessage);
    }

    setLoading(false);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
        {loading && <div className="message bot">正在思考中...</div>}
      </div>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入訊息..."
        />
        <button type="submit" disabled={loading}>
          發送
        </button>
      </form>
    </div>
  );
};

export default Chat; 