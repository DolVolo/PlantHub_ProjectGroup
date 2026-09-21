'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { 
  createChatRoom, 
  sendMessage, 
  getChatMessages, 
  subscribeToChatMessages,
  markMessagesAsRead,
  closeChatRoom,
  type ChatMessage,
  type ChatRoom 
} from '../../services/firebase/chat.service';
import { MessageCircle, X, Send, Store } from 'lucide-react';

interface ChatWithSellerProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  orderId?: string;
}

export default function ChatWithSeller({ 
  isOpen, 
  onClose, 
  sellerId, 
  sellerName, 
  orderId 
}: ChatWithSellerProps) {
  const { firebaseUser, profile } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && firebaseUser && profile) {
      initializeChat();
    }
  }, [isOpen, firebaseUser, profile, sellerId]);

  const initializeChat = async () => {
    if (!firebaseUser || !profile) return;
    
    setIsLoading(true);
    try {
      // สร้างห้องแชทใหม่หรือใช้ห้องเดิม
      const chatId = await createChatRoom(
        'seller_support',
        firebaseUser.uid,
        `${profile.firstName} ${profile.lastName}`.trim(),
        sellerId,
        sellerName,
        orderId
      );
      setChatRoomId(chatId);
      
      // ดึงข้อความเก่า
      const existingMessages = await getChatMessages(chatId);
      setMessages(existingMessages);
      
      // ตั้งค่า real-time listener
      const unsubscribe = subscribeToChatMessages(chatId, (newMessages) => {
        setMessages(newMessages);
        // mark messages as read
        markMessagesAsRead(chatId, firebaseUser.uid);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chatRoomId || !firebaseUser || !profile || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(
        chatRoomId,
        firebaseUser.uid,
        `${profile.firstName} ${profile.lastName}`.trim(),
        'customer',
        newMessage.trim()
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseChat = async () => {
    if (chatRoomId && firebaseUser && profile) {
      await closeChatRoom(chatRoomId, firebaseUser.uid, `${profile.firstName} ${profile.lastName}`.trim());
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-96 h-[500px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">ติดต่อร้านค้า</h3>
                <p className="text-sm text-white/80">{sellerName}</p>
              </div>
            </div>
            <button
              onClick={handleCloseChat}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>เริ่มต้นการสนทนากับร้านค้า</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.senderRole === 'customer'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.senderRole === 'customer' ? 'คุณ' : sellerName}
                  </div>
                  <div className="text-sm">{message.message}</div>
                  <div className={`text-xs mt-1 ${
                    message.senderRole === 'customer' ? 'text-white/70' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('th-TH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {orderId && (
            <div className="mt-2 text-xs text-gray-500">
              ออเดอร์: {orderId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
