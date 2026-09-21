'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../providers/AuthProvider';
import { 
  getUserChatRooms,
  getChatMessages,
  sendMessage,
  subscribeToChatMessages,
  subscribeToChatRooms,
  markMessagesAsRead,
  closeChatRoom,
  deleteChatRoom,
  type ChatMessage,
  type ChatRoom 
} from '../../../services/firebase/chat.service';
import { MessageCircle, Send, CheckCircle, Clock, AlertCircle, Trash2, Package, User, CreditCard, ArrowLeft } from 'lucide-react';

export default function AdminSellerChatPage() {
  const { firebaseUser, profile } = useAuthContext();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'pending'>('all');
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (firebaseUser && profile?.role === 'admin') {
      // ไม่เรียก loadChatRooms() เพราะมี real-time listener แล้ว
      
      // เพิ่ม real-time listener สำหรับ chat rooms
      const unsubscribeRooms = subscribeToChatRooms(firebaseUser.uid, 'admin', (newChatRooms) => {
        // กรองเฉพาะแชทร้านค้า
        const sellerChatRooms = newChatRooms.filter(room => room.chatType === 'seller_support');
        setChatRooms(sellerChatRooms);
        setIsLoading(false); // หยุดการหมุนเมื่อได้ข้อมูลแล้ว
      });
      
      return () => {
        unsubscribeRooms();
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, [firebaseUser, profile]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id!);
      
      // เพิ่ม real-time listener สำหรับข้อความใหม่
      const unsubscribe = subscribeToChatMessages(selectedChat.id!, (newMessages) => {
        setMessages(newMessages);
        // mark messages as read
        if (firebaseUser) {
          markMessagesAsRead(selectedChat.id!, firebaseUser.uid);
        }
      });
      
      // เก็บ unsubscribe function
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, [selectedChat, firebaseUser]);


  const loadMessages = async (chatId: string) => {
    try {
      const msgs = await getChatMessages(chatId);
      setMessages(msgs);
      
      // Mark messages as read
      if (firebaseUser) {
        await markMessagesAsRead(chatId, firebaseUser.uid);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !firebaseUser || !profile || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(
        selectedChat.id!,
        firebaseUser.uid,
        `${profile.firstName} ${profile.lastName}`.trim(),
        'admin',
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
    if (selectedChat && firebaseUser && profile) {
      await closeChatRoom(
        selectedChat.id!, 
        firebaseUser.uid, 
        `${profile.firstName} ${profile.lastName}`.trim()
      );
      // ไม่ต้องเรียก loadChatRooms() เพราะ real-time listener จะอัปเดตให้เอง
      setSelectedChat(null);
    }
  };

  const handleDeleteChat = async () => {
    if (selectedChat && confirm('คุณแน่ใจหรือไม่ที่จะลบการสนทนานี้?')) {
      await deleteChatRoom(selectedChat.id!);
      // ไม่ต้องเรียก loadChatRooms() เพราะ real-time listener จะอัปเดตให้เอง
      setSelectedChat(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'กำลังดำเนินการ';
      case 'closed':
        return 'จบการสนทนา';
      case 'pending':
        return 'รอการตอบกลับ';
      default:
        return 'ไม่ทราบสถานะ';
    }
  };

  const filteredChatRooms = chatRooms.filter(room => {
    if (filter === 'all') return true;
    return room.status === filter;
  });

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] md:h-[650px]">
            {/* Chat Rooms List */}
            <div
              className={`flex flex-col border-gray-200 ${
                isMobileView ? 'w-full border-b' : 'md:w-1/3 md:border-r'
              } ${isMobileView && selectedChat ? 'hidden' : ''}`}
            >
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">แชทร้านค้า</h2>
                
                {/* Filter Buttons */}
                <div className="flex gap-2 mb-4">
                  {[
                    { key: 'all', label: 'ทั้งหมด' },
                    { key: 'active', label: 'กำลังดำเนินการ' },
                    { key: 'pending', label: 'รอตอบกลับ' },
                    { key: 'closed', label: 'จบแล้ว' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as typeof filter)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filter === key
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Rooms */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredChatRooms.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>ไม่มีแชทร้านค้าในหมวดนี้</p>
                  </div>
                ) : (
                  filteredChatRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedChat(room)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedChat?.id === room.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {room.customerName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ออเดอร์: {room.orderId || 'ไม่ระบุ'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(room.status)}
                          {room.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate flex-1 mr-2">
                          {room.lastMessage || 'ยังไม่มีข้อความ'}
                        </span>
                        <span>
                          {room.lastMessageTime?.toLocaleDateString('th-TH')}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          room.status === 'active' ? 'bg-green-100 text-green-700' :
                          room.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getStatusIcon(room.status)}
                          {getStatusText(room.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div
              className={`flex-1 flex flex-col ${isMobileView && !selectedChat ? 'hidden' : ''}`}
            >
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {isMobileView && (
                          <button
                            onClick={() => setSelectedChat(null)}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium text-blue-600 shadow md:hidden"
                          >
                            <ArrowLeft className="h-4 w-4" /> รายการแชท
                          </button>
                        )}
                        <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedChat.customerName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          ออเดอร์: {selectedChat.orderId || 'ไม่ระบุ'}
                        </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          selectedChat.status === 'active' ? 'bg-green-100 text-green-700' :
                          selectedChat.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getStatusIcon(selectedChat.status)}
                          {getStatusText(selectedChat.status)}
                        </span>
                        {selectedChat.status === 'active' && (
                          <button
                            onClick={handleCloseChat}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                          >
                            จบการสนทนา
                          </button>
                        )}
                        <button
                          onClick={handleDeleteChat}
                          className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          ลบแชท
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="p-4 border-b border-gray-200 bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">รายละเอียดออเดอร์</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">เลขออเดอร์:</span>
                        <span className="ml-2 font-medium">#{selectedChat.orderId?.slice(-8).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">ลูกค้า:</span>
                        <span className="ml-2 font-medium">{selectedChat.customerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message) => {
                      // ข้อความระบบ
                      if (message.senderRole === 'system') {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm">
                              {message.message}
                            </div>
                          </div>
                        );
                      }

                      // ข้อความปกติ
                      return (
                        <div
                          key={message.id}
                          className={`flex ${message.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 relative group ${
                              message.senderRole === 'admin'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <div className="text-sm font-medium mb-1">
                              {message.senderRole === 'admin' ? 'แอดมิน' : 'ลูกค้า'}
                            </div>
                            <div className="text-sm">{message.message}</div>
                            <div className={`text-xs mt-1 ${
                              message.senderRole === 'admin' ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {message.timestamp.toLocaleTimeString('th-TH', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="พิมพ์ข้อความ..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSending || selectedChat.status === 'closed'}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending || selectedChat.status === 'closed'}
                        className="bg-blue-500 text-white p-2 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">เลือกการสนทนา</h3>
                    <p>เลือกการสนทนาจากรายการด้านซ้ายเพื่อเริ่มต้นการตอบกลับ</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
