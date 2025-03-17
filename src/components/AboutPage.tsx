import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="about-page">
      <h2>關於 AI 聊天助手</h2>
      
      <section className="about-section">
        <h3>使用的模型</h3>
        <div className="model-info">
          <h4>Google Gemini 1.5 Flash</h4>
          <p>本應用程序使用 Google 最新的 Gemini 1.5 Flash 模型：</p>
          <ul>
            <li>
              <strong>Gemini 1.5 Flash</strong>
              <p>Google 最新推出的高效能語言模型，具備：</p>
              <ul>
                <li>快速響應速度</li>
                <li>優秀的中文理解和生成能力</li>
                <li>免費使用</li>
                <li>支持長文本對話</li>
                <li>高度可靠性</li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section className="about-section">
        <h3>開發者信息</h3>
        <div className="developer-info">
          <p><strong>作者：</strong>許育宸</p>
          <p><strong>Email：</strong><a href="mailto:rufushsu9987@gmail.com">rufushsu9987@gmail.com</a></p>
          <p><strong>個人網站：</strong><a href="https://yuchenhsu9987.github.io/personal-profile/" target="_blank" rel="noopener noreferrer">個人主頁</a></p>
        </div>
      </section>

      <section className="about-section">
        <h3>技術棧</h3>
        <ul>
          <li>React + TypeScript</li>
          <li>Firebase Firestore</li>
          <li>Google Generative AI</li>
        </ul>
      </section>
    </div>
  );
};

export default AboutPage; 