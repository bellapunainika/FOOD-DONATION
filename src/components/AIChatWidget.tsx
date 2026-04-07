import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
}

export default function AIChatWidget() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: 'Hi there! I am the AI assistant for AI Enabled Feed Hunger. How can I help you today?', sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (!currentUser) {
      toast.error("Please login to use the AI Assistant");
      return;
    }

    const newMessage: ChatMessage = { id: Date.now().toString(), text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const askChatbot = httpsCallable(functions, 'askChatbot');
      const result: any = await askChatbot({ message: newMessage.text });
      
      const botResponse: ChatMessage = {
         id: (Date.now() + 1).toString(),
         text: result.data.response,
         sender: 'bot'
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error: any) {
      console.error("Chatbot Error:", error);
      toast.error('AI Service currently unreachable. Error: ' + error.message);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: 'Sorry, I am facing technical difficulties connecting to my cognitive center (Vertex AI).', sender: 'bot'}]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-2xl transition-transform hover:scale-110 z-50 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right z-50 border border-gray-200 ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-brand-600 px-4 py-3 flex items-center justify-between text-white shadow-md">
           <div className="flex items-center gap-2">
             <Bot size={24} />
             <span className="font-bold">Feed Hunger AI</span>
           </div>
           <button onClick={() => setIsOpen(false)} className="text-white hover:bg-brand-700 p-1 rounded transition-colors">
             <X size={20} />
           </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
           {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`flex gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-brand-100 text-brand-600'}`}>
                       {msg.sender === 'user' ? <User size={16}/> : <Bot size={16}/>}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'}`}>
                       {msg.text}
                    </div>
                 </div>
              </div>
           ))}
           {isTyping && (
             <div className="flex justify-start">
                 <div className="flex gap-2 max-w-[80%] flex-row">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-brand-100 text-brand-600">
                       <Bot size={16}/>
                    </div>
                    <div className="px-4 py-3 rounded-2xl bg-white shadow-sm border border-gray-100 rounded-tl-sm flex gap-1 items-center">
                       <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                       <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                 </div>
              </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
           <input
             type="text"
             value={inputValue}
             onChange={e => setInputValue(e.target.value)}
             placeholder={currentUser ? "Type your message..." : "Login to chat"}
             disabled={!currentUser || isTyping}
             className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
           />
           <button 
             type="submit" 
             disabled={!inputValue.trim() || !currentUser || isTyping}
             className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
           >
             <Send size={18} className="ml-1" />
           </button>
        </form>
      </div>
    </>
  );
}
