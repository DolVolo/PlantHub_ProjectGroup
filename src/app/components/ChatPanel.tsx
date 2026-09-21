'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthContext } from '../providers/AuthProvider';
import { 
  getUserChatRooms,
  subscribeToChatMessages,
  subscribeToChatRooms,
  sendMessage,
  markMessagesAsRead,
  createChatRoom,
  deleteChatRoom,
  type ChatMessage,
  type ChatRoom 
} from '../../services/firebase/chat.service';
import { MessageCircle, X, Send, Search, User, Shield, Store, Clock, Trash2, Sparkles } from 'lucide-react';
import { FirebaseError } from 'firebase/app';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebaseClient';
import { chatTrigger } from '../hooks/useChatTrigger';
import { loadChatReadState, persistChatReadState, clearChatReadState } from '../lib/chatReadStorage';

type Seller = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  shopName?: string;
  role: string;
};

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  triggerData?: {
    sellerId: string;
    sellerName: string;
    orderId?: string;
  } | null;
}

export default function ChatPanel({ isOpen, onClose, onUnreadCountChange, triggerData }: ChatPanelProps) {
  const { firebaseUser, profile } = useAuthContext();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchedSellers, setSearchedSellers] = useState<Seller[]>([]);
  const [isSearchingSellers, setIsSearchingSellers] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const clearedChatMetadataRef = useRef<Map<string, number>>(new Map());

  const isAdmin = profile?.role === 'admin';
  const isSeller = profile?.role === 'seller';
  const manageAvailable = !!profile;
  const manageLabel = isAdmin
    ? 'จัดการห้องแชท'
    : isSeller
      ? 'จัดการแชทร้าน'
      : 'จัดการสนทนา';
  const manageSubtitle = isAdmin
    ? 'ล้างแชทเก่าออกจากมุมมองของคุณ'
    : isSeller
      ? 'ลบแชทที่ปิดงานแล้วเพื่อจัดระเบียบกล่องข้อความ'
      : 'ลบห้องแชทที่ไม่ต้องการออกจากรายการ';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const resolveLastMessageTimestamp = (room: ChatRoom | undefined | null): number => {
    if (!room) {
      return 0;
    }

    const extractTime = (value: Date | undefined): number | null => {
      if (!value) {
        return null;
      }
      return value.getTime();
    };

    const fromLastMessage = extractTime(room.lastMessageTime);
    if (fromLastMessage !== null) {
      return fromLastMessage;
    }

    const fromUpdatedAt = extractTime(room.updatedAt);
    if (fromUpdatedAt !== null) {
      return fromUpdatedAt;
    }

    const fromCreatedAt = extractTime(room.createdAt);
    if (fromCreatedAt !== null) {
      return fromCreatedAt;
    }

    return 0;
  };

  const persistClearedState = useCallback((mapChanged: boolean) => {
    if (!mapChanged) {
      return;
    }

    if (firebaseUser?.uid) {
      persistChatReadState(firebaseUser.uid, clearedChatMetadataRef.current);
    }
  }, [firebaseUser?.uid]);

  const clearUnreadForChat = useCallback((chatId: string | undefined | null) => {
    if (!chatId) {
      return;
    }

    setChatRooms((previousRooms) => {
      let changed = false;
      const lastSeenMessageTime = resolveLastMessageTimestamp(
        previousRooms.find((room) => room.id === chatId)
      );
      const updatedRooms = previousRooms.map((room) => {
        if (room.id === chatId && (room.unreadCount ?? 0) > 0) {
          changed = true;
          return { ...room, unreadCount: 0 };
        }
        return room;
      });

      clearedChatMetadataRef.current.set(chatId, lastSeenMessageTime);
      persistClearedState(true);

      if (changed) {
        const total = updatedRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
        onUnreadCountChange?.(total);
      }

      return updatedRooms;
    });
  }, [onUnreadCountChange, persistClearedState]);

  useEffect(() => {
    if (!firebaseUser) {
      clearedChatMetadataRef.current.clear();
      return;
    }

    const storedMap = loadChatReadState(firebaseUser.uid);
    clearedChatMetadataRef.current = new Map(storedMap);
  }, [firebaseUser]);

  // Consolidate multiple admin support chats into one per customer
  const consolidateAdminChats = (rooms: ChatRoom[]): ChatRoom[] => {
    const consolidated: ChatRoom[] = [];
    const customerGroups: { [customerId: string]: ChatRoom[] } = {};

    // Group admin support chats by customer
    rooms.forEach(room => {
      if (room.chatType === 'admin_support') {
        if (!customerGroups[room.customerId]) {
          customerGroups[room.customerId] = [];
        }
        customerGroups[room.customerId].push(room);
      } else {
        // Keep seller support chats as is
        consolidated.push(room);
      }
    });

    // Consolidate admin support chats per customer
    Object.values(customerGroups).forEach(customerRooms => {
      if (customerRooms.length === 1) {
        consolidated.push(customerRooms[0]);
      } else {
        // Merge multiple admin chats for the same customer
        const latestRoom = customerRooms.reduce((latest, current) => 
          current.updatedAt > latest.updatedAt ? current : latest
        );
        
        // Calculate total unread count
        const totalUnread = customerRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
        
        // Create consolidated room
        const consolidatedRoom: ChatRoom = {
          ...latestRoom,
          unreadCount: totalUnread,
          lastMessage: latestRoom.lastMessage || 'การสนทนากับลูกค้า',
          customerName: `${latestRoom.customerName} (${customerRooms.length} การสนทนา)`
        };
        
        consolidated.push(consolidatedRoom);
      }
    });

    return consolidated;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle external chat trigger (from orders page)
  useEffect(() => {
    if (triggerData && isOpen && firebaseUser && profile) {
      console.log('🎯 Processing chat trigger:', triggerData);
      handleStartChatWithSeller({
        id: triggerData.sellerId,
        email: '',
        firstName: '',
        lastName: '',
        shopName: triggerData.sellerName,
        role: 'seller'
      }, triggerData.orderId);
    }
  }, [triggerData, isOpen]);

  // Listen for global chat triggers
  useEffect(() => {
    const unsubscribe = chatTrigger.subscribe((payload) => {
      console.log('🎯 Received chat trigger:', payload);
      
      // Open chat panel if not already open
      if (!isOpen) {
        // We need to trigger the chat panel to open
        // This will be handled by the FloatingChatButton
        return;
      }
      
      // If chat panel is already open, start chat with seller
      if (firebaseUser && profile) {
        handleStartChatWithSeller({
          id: payload.sellerId,
          email: '',
          firstName: '',
          lastName: '',
          shopName: payload.sellerName,
          role: 'seller'
        }, payload.orderId);
      }
    });

    return unsubscribe;
  }, [isOpen, firebaseUser, profile]);

  // Load chat rooms with real-time updates
  useEffect(() => {
    if (isOpen && firebaseUser && profile) {
      // Determine user role for chat subscription
      let userRole: 'customer' | 'seller' | 'admin' = 'customer';
      if (profile.role === 'admin') {
        userRole = 'admin';
      } else if (profile.role === 'seller') {
        userRole = 'seller';
      }

      console.log('💬 ChatPanel: Setting up subscription for:', firebaseUser.uid, 'role:', userRole);

      const unsubscribe = subscribeToChatRooms(
        firebaseUser.uid,
        userRole,
        (rooms: ChatRoom[]) => {
          console.log('📬 ChatPanel: Received', rooms.length, 'chat rooms');
          
          // For admins, consolidate multiple admin support chats into one
          let processedRooms: ChatRoom[] = rooms;
          if (profile?.role === 'admin') {
            const adminRelatedRooms = rooms.filter((room) =>
              room.chatType === 'admin_support' ||
              room.customerId === firebaseUser.uid ||
              room.sellerId === firebaseUser.uid
            );
            processedRooms = consolidateAdminChats(adminRelatedRooms);
          } else if (profile?.role === 'seller') {
            processedRooms = rooms.filter((room) =>
              room.sellerId === firebaseUser.uid || room.customerId === firebaseUser.uid
            );
          } else {
            processedRooms = rooms.filter((room) => room.customerId === firebaseUser.uid);
          }

          const clearedMap = clearedChatMetadataRef.current;
          let mapChanged = false;
          const normalizedRooms = processedRooms.map((room) => {
            if (!room.id) {
              return room;
            }

            const clearedLastSeen = clearedMap.get(room.id);
            if (clearedLastSeen === undefined) {
              return room;
            }

            const serverUnread = room.unreadCount || 0;
            const lastMessageTime = resolveLastMessageTimestamp(room);

            if (serverUnread === 0) {
              if (clearedMap.delete(room.id)) {
                mapChanged = true;
              }
              return room;
            }

            if (lastMessageTime <= clearedLastSeen) {
              return { ...room, unreadCount: 0 };
            }

            if (clearedMap.delete(room.id)) {
              mapChanged = true;
            }
            return room;
          });

          persistClearedState(mapChanged);

          setChatRooms(normalizedRooms);
          setSelectedChat((previous) => {
            if (!previous) {
              return previous;
            }
            return normalizedRooms.some((room) => room.id === previous.id) ? previous : null;
          });
          
          // Calculate and update unread count
          const total = normalizedRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
          console.log('🔔 ChatPanel: Total unread:', total);
          onUnreadCountChange?.(total);
          if (!processedRooms.length) {
            setIsManageMode((previous) => (previous ? false : previous));
          }
          
          setIsLoading(false);
        }
      );

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [isOpen, firebaseUser, profile]);

  // Subscribe to messages when chat is selected
  useEffect(() => {
    if (selectedChat && firebaseUser) {
      clearUnreadForChat(selectedChat.id!);
      const unsubscribe = subscribeToChatMessages(selectedChat.id!, (newMessages) => {
        setMessages(newMessages);
        markMessagesAsRead(selectedChat.id!, firebaseUser.uid);
        clearUnreadForChat(selectedChat.id!);
        
        // Real-time subscription will automatically update unread count
        // No need to manually reload chat rooms
      });
      
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, [selectedChat, firebaseUser, clearUnreadForChat]);

  // Search for sellers when user types in search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchSellers(searchQuery);
      } else {
        setSearchedSellers([]);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadChatRooms = async () => {
    if (!firebaseUser) return;
    
    setIsLoading(true);
    try {
      const rooms = await getUserChatRooms(firebaseUser.uid, 'customer');
      setChatRooms(rooms);
      
      // Calculate and update unread count
      const total = rooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0);
      onUnreadCountChange?.(total);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchSellers = async (searchText: string) => {
    if (!searchText.trim()) {
      setSearchedSellers([]);
      return;
    }
    
    console.log('🔍 Searching for sellers with query:', searchText);
    setIsSearchingSellers(true);
    try {
      const usersRef = collection(firestore, 'users');
      
      // Allow all authenticated users to search all users (shops, sellers, customers)
      const q = query(usersRef);
      
      const snapshot = await getDocs(q);
      
      console.log('📊 Total users in database:', snapshot.docs.length);
      
      if (snapshot.empty) {
        console.warn('⚠️ No users found in database!');
        setSearchedSellers([]);
        setIsSearchingSellers(false);
        return;
      }
      
      const allUsers = snapshot.docs.map(doc => {
        const data = doc.data() as Partial<Seller>;
        console.log('👤 User data:', {
          id: doc.id,
          shopName: data.shopName,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role
        });
        return {
          id: doc.id,
          email: data.email ?? '',
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          shopName: data.shopName,
          role: data.role ?? 'customer',
        } satisfies Seller;
      });
      
      // Filter users by search query
      const searchLower = searchText.toLowerCase();
      const filtered = allUsers.filter(user => {
        const shopName = user.shopName && user.shopName.trim()
          ? user.shopName.trim()
          : `${user.firstName} ${user.lastName}`.trim();

        const safeShop = shopName.toLowerCase();
        const safeEmail = user.email.toLowerCase();
        const safeFirst = user.firstName.toLowerCase();
        const safeLast = user.lastName.toLowerCase();

        const matches = (
          safeShop.includes(searchLower) ||
          safeEmail.includes(searchLower) ||
          safeFirst.includes(searchLower) ||
          safeLast.includes(searchLower)
        );
        
        if (matches) {
          console.log('✅ Match found:', shopName, 'role:', user.role);
        }
        
        return matches;
      });
      
      console.log('✅ Filtered users found:', filtered.length, filtered);
      setSearchedSellers(filtered);
    } catch (error) {
      console.error('❌ Error searching users:', error);

      if (error instanceof FirebaseError && error.code === 'permission-denied') {
        console.error('🚫 Permission denied! Check Firestore rules for users collection');
      }
      
      setSearchedSellers([]);
    } finally {
      setIsSearchingSellers(false);
    }
  };

  const handleStartChatWithSeller = async (seller: Seller, orderId?: string) => {
    if (!firebaseUser || !profile) return;
    
    try {
      const shopName = seller.shopName || `${seller.firstName} ${seller.lastName}`;
      console.log('🛍️ Starting chat with seller:', { sellerId: seller.id, shopName, orderId, adminRole: profile.role });
      
      // For admins chatting with sellers, create a special admin-seller chat
      let chatId;
      if (profile.role === 'admin') {
        // Admin chatting with seller - create seller_support chat but with admin as customer
        chatId = await createChatRoom(
          'seller_support',
          firebaseUser.uid, // Admin as the "customer" in this context
          `แอดมิน ${profile.firstName} ${profile.lastName}`.trim(),
          seller.id,
          shopName,
          orderId
        );
      } else {
        // Regular customer chatting with seller
        chatId = await createChatRoom(
          'seller_support',
          firebaseUser.uid,
          `${profile.firstName} ${profile.lastName}`.trim(),
          seller.id,
          shopName,
          orderId
        );
      }
      
      // Real-time subscription will automatically update the chat rooms list
      // Wait a bit for the room to be loaded via subscription
      setTimeout(() => {
        const room = chatRooms.find(r => 
          (r.sellerId === seller.id && r.orderId === orderId) || 
          r.id === chatId
        );
        if (room) {
          console.log('✅ Found and selecting chat room:', room.id);
          setSelectedChat(room);
          clearUnreadForChat(room.id!);
        }
      }, 500);
      
      // Clear search
      setSearchQuery('');
      setSearchedSellers([]);
    } catch (error) {
      console.error('Error starting chat with seller:', error);
      alert(`ไม่สามารถเริ่มการสนทนาได้: ${(error instanceof Error && error.message) || 'กรุณาลองอีกครั้ง'}`);
    }
  };

  const handleStartNewChat = async () => {
    if (!firebaseUser || !profile) return;
    
    try {
      const chatId = await createChatRoom(
        'admin_support',
        firebaseUser.uid,
        `${profile.firstName} ${profile.lastName}`.trim()
      );
      
      // Real-time subscription will automatically update the chat rooms list
      // Wait for the subscription to update, then select the chat
      setTimeout(() => {
        const newRoom = chatRooms.find(room => room.id === chatId || room.chatType === 'admin_support');
        if (newRoom) {
          setSelectedChat(newRoom);
          if (newRoom.id) {
            clearUnreadForChat(newRoom.id);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !firebaseUser || !profile || !selectedChat || isSending) return;
    
    setIsSending(true);
    try {
      // Determine sender role based on user role and chat type
      let senderRole: 'customer' | 'seller' | 'admin' = 'customer';
      if (profile.role === 'admin') {
        senderRole = 'admin';
      } else if (profile.role === 'seller') {
        senderRole = 'seller';
      }

      const senderName = profile.role === 'admin' 
        ? `แอดมิน ${profile.firstName} ${profile.lastName}`.trim()
        : `${profile.firstName} ${profile.lastName}`.trim();

      await sendMessage(
        selectedChat.id!,
        firebaseUser.uid,
        senderName,
        senderRole,
        newMessage.trim()
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredChatRooms = chatRooms.filter(room => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      room.customerName?.toLowerCase().includes(searchLower) ||
      room.sellerName?.toLowerCase().includes(searchLower) ||
      room.lastMessage?.toLowerCase().includes(searchLower)
    );
  });

  const selectedChatId = selectedChat?.id ?? null;

  const getChatIcon = (room: ChatRoom) => {
    if (room.chatType === 'admin_support') {
      return <Shield className="h-5 w-5 text-blue-500" />;
    } else if (room.chatType === 'seller_support') {
      return <Store className="h-5 w-5 text-emerald-500" />;
    }
    return <User className="h-5 w-5 text-slate-500" />;
  };

  const getChatTitle = (room: ChatRoom) => {
    let title = '';
    if (room.chatType === 'admin_support') {
      title = 'แอดมิน PlantHub';
    } else if (room.sellerName) {
      title = room.sellerName;
    } else {
      title = 'ผู้ดูแลระบบ';
    }
    
    // Add order ID if available
    if (room.orderId) {
      title += ` #${room.orderId.slice(-8).toUpperCase()}`;
    }
    
    return title;
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'เมื่อวาน';
    } else if (days < 7) {
      return `${days} วันที่แล้ว`;
    } else {
      return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    }
  };

  // Highlight search text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index} className="bg-yellow-200 text-gray-900">{part}</mark> : part
    );
  };

  const handleDeleteChatRoom = async (chatRoomId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the chat
    
    if (!confirm('ต้องการลบการสนทนานี้หรือไม่?')) {
      return;
    }
    
    try {
      clearUnreadForChat(chatRoomId);
  const didDelete = clearedChatMetadataRef.current.delete(chatRoomId);
  persistClearedState(didDelete);
      await deleteChatRoom(chatRoomId);
      console.log('✅ Chat room deleted');
      // The real-time subscription will automatically update the list
    } catch (error) {
      console.error('Error deleting chat room:', error);
      alert('ไม่สามารถลบการสนทนาได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleDeleteAllChatRooms = async () => {
    if (!confirm(`ต้องการลบการสนทนาทั้งหมด (${chatRooms.length} การสนทนา) หรือไม่?`)) {
      return;
    }
    
    if (!confirm('การลบนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่?')) {
      return;
    }
    
    try {
      // Delete all chat rooms
      const deletePromises = chatRooms.map(room => deleteChatRoom(room.id!));
      await Promise.all(deletePromises);
      
      console.log('✅ All chat rooms deleted');
      alert(`ลบการสนทนาทั้งหมด (${chatRooms.length} การสนทนา) เรียบร้อยแล้ว`);
      
      // Clear selected chat if it was deleted
      setSelectedChat(null);
      if (isManageMode) {
        setIsManageMode(false);
      }
      const hadEntries = clearedChatMetadataRef.current.size > 0;
      clearedChatMetadataRef.current.clear();
      if (firebaseUser?.uid) {
        if (hadEntries) {
          persistChatReadState(firebaseUser.uid, clearedChatMetadataRef.current);
        } else {
          clearChatReadState(firebaseUser.uid);
        }
      }
      onUnreadCountChange?.(0);
    } catch (error) {
      console.error('Error deleting all chat rooms:', error);
      alert('ไม่สามารถลบการสนทนาทั้งหมดได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={`fixed right-0 top-0 z-[70] h-full w-full md:w-[400px] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-blue-800">
                {selectedChat ? 'แชท' : 'ข้อความ'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-blue-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {!selectedChat ? (
            // Chat List View
            <>
              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                    searchQuery ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={profile?.role === 'admin' ? "ค้นหาชื่อร้านค้าหรือลูกค้า..." : "ค้นหาชื่อร้านหรือแอดมิน..."}
                    className={`w-full pl-10 pr-10 py-2 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                      searchQuery 
                        ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/30' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition bg-white rounded-full p-0.5"
                      title="ล้างการค้นหา"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-blue-600 font-medium">
                      {isSearchingSellers ? (
                        <span className="flex items-center gap-1">
                          <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></span>
                          กำลังค้นหาร้านค้า...
                        </span>
                      ) : filteredChatRooms.length === 0 && searchedSellers.length === 0 ? (
                        'ไม่พบผลการค้นหา'
                      ) : (
                        `พบ ${filteredChatRooms.length + searchedSellers.length} รายการ ${searchedSellers.length > 0 ? `(ร้านค้า ${searchedSellers.length})` : ''}`
                      )}
                    </p>
                    {(filteredChatRooms.length > 0 || searchedSellers.length > 0) && (
                      <span className="text-xs text-gray-500">
                        กำลังค้นหา: &ldquo;{searchQuery}&rdquo;
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="px-4 py-3 border-b border-gray-200 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    onClick={handleStartNewChat}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400 text-white px-4 py-3 rounded-xl shadow-sm hover:brightness-110 transition"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-medium">ติดต่อเจ้าหน้าที่</span>
                  </button>
                  {manageAvailable && (
                    <button
                      onClick={() => setIsManageMode((prev) => !prev)}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition shadow-sm border ${
                        isManageMode
                          ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 text-white border-transparent hover:brightness-110'
                          : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {isManageMode ? 'ปิดโหมดจัดการ' : manageLabel}
                    </button>
                  )}
                </div>

                {manageAvailable && !isManageMode && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>เปิด {manageLabel} เพื่อเคลียร์การสนทนาที่ไม่ต้องการ</span>
                  </div>
                )}

                {manageAvailable && isManageMode && (
                  <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500/95 via-orange-400/90 to-amber-400/90 p-4 text-white shadow-lg">
                    <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 shadow-inner">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold tracking-wide">โหมด {manageLabel} เปิดใช้งาน</p>
                        <p className="text-xs text-white/85 leading-relaxed">{manageSubtitle}</p>
                      </div>
                    </div>
                  </div>
                )}

                {chatRooms.length > 0 && manageAvailable && isManageMode && (
                  <button
                    onClick={handleDeleteAllChatRooms}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-red-500 to-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>ลบการสนทนาทั้งหมด</span>
                  </button>
                )}
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredChatRooms.length === 0 && searchedSellers.length === 0 ? (
                  <div className="text-center text-gray-500 py-12 px-4">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    {searchQuery ? (
                      <>
                        <p className="text-lg font-medium">ไม่พบผลการค้นหา</p>
                        <p className="text-sm text-gray-400 mt-2">
                          {isSearchingSellers ? 'กำลังค้นหาร้านค้า...' : 'ลองค้นหาด้วยคำอื่น หรือเริ่มการสนทนาใหม่'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium">ยังไม่มีการสนทนา</p>
                        <p className="text-sm text-gray-400 mt-2">คลิกปุ่มด้านบนเพื่อเริ่มต้นการสนทนา</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Existing Chat Rooms */}
                    {filteredChatRooms.map((room: ChatRoom) => {
                      const isSelectedRoom = selectedChatId === room.id;
                      const rowTone = isManageMode
                        ? 'border-rose-200/70 bg-rose-50/70 hover:bg-rose-100'
                        : isSelectedRoom
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-100 hover:bg-blue-50';

                      return (
                        <div
                          key={room.id}
                          className={`relative group w-full flex items-start gap-3 p-4 border-b transition shadow-sm ${rowTone}`}
                        >
                        <button
                          onClick={() => {
                            setSelectedChat(room);
                            // Mark messages as read immediately when clicking
                            if (firebaseUser && room.id) {
                              markMessagesAsRead(room.id, firebaseUser.uid);
                              clearUnreadForChat(room.id);
                              // Real-time subscription will automatically update unread count
                            }
                          }}
                          className="flex-1 flex items-start gap-3 min-w-0"
                        >
                          {/* Avatar */}
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                            {getChatIcon(room)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {searchQuery ? highlightText(getChatTitle(room), searchQuery) : getChatTitle(room)}
                              </h3>
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                {formatTime(room.lastMessageTime)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              {searchQuery && room.lastMessage 
                                ? highlightText(room.lastMessage, searchQuery)
                                : (room.lastMessage || 'ยังไม่มีข้อความ')
                              }
                            </p>
                            {room.status === 'closed' && (
                              <span className="text-xs text-red-500 mt-1 inline-block">
                                (ปิดแล้ว)
                              </span>
                            )}
                          </div>

                          {/* Unread Badge */}
                          {room.unreadCount > 0 && (
                            <div className="flex-shrink-0 bg-rose-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {room.unreadCount > 9 ? '9+' : room.unreadCount}
                            </div>
                          )}
                        </button>
                        
                          {/* Delete Button - Shows on hover */}
                          <button
                            onClick={(e) => handleDeleteChatRoom(room.id!, e)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 transition-opacity p-2 text-white rounded-full shadow-lg z-10 ${
                              isManageMode
                                ? 'opacity-100 bg-rose-500 hover:bg-rose-600'
                                : 'opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600'
                            }`}
                            title="ลบการสนทนา"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    
                    {/* Searched Sellers - Show when searching and there are results */}
                    {(() => {
                      console.log('🎨 Rendering sellers section:', {
                        searchQuery,
                        searchedSellersLength: searchedSellers.length,
                        searchedSellers,
                        shouldShow: searchQuery && searchedSellers.length > 0
                      });
                      return null;
                    })()}
                    {searchQuery && searchedSellers.length > 0 && (
                      <>
                        {filteredChatRooms.length > 0 && (
                          <div className="px-4 py-2 bg-emerald-50 border-y border-emerald-100">
                            <p className="text-xs font-semibold text-emerald-700 uppercase">
                              {profile?.role === 'admin' ? 'ผู้ใช้ที่พบ' : 'ร้านค้าที่พบ'}
                            </p>
                          </div>
                        )}
                        {searchedSellers.map((seller) => {
                          const shopName = seller.shopName || `${seller.firstName} ${seller.lastName}`;
                          return (
                            <button
                              key={seller.id}
                              onClick={() => handleStartChatWithSeller(seller)}
                              className="w-full flex items-start gap-3 p-4 border-b border-gray-100 hover:bg-emerald-50 transition"
                            >
                              {/* Avatar */}
                              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center">
                                <Store className="h-5 w-5 text-emerald-600" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {highlightText(shopName, searchQuery)}
                                  </h3>
                                </div>
                                <p className="text-sm text-gray-600 truncate">
                                  คลิกเพื่อเริ่มการสนทนา
                                </p>
                                <span className="text-xs text-emerald-600 mt-1 inline-block">
                                  {seller.role === 'seller' ? 'ร้านค้า' : seller.role === 'admin' ? 'แอดมิน' : 'ลูกค้า'}
                                </span>
                              </div>

                              {/* Arrow indicator */}
                              <div className="flex-shrink-0 text-gray-400">
                                <MessageCircle className="h-5 w-5" />
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            // Chat Messages View
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setSelectedChat(null)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ← กลับ
                </button>
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                  {getChatIcon(selectedChat)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {getChatTitle(selectedChat)}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedChat.status === 'active' ? 'กำลังให้บริการ' : 'ปิดการสนทนาแล้ว'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>เริ่มต้นการสนทนา</p>
                    <p className="text-sm text-gray-400 mt-2">พิมพ์ข้อความเพื่อเริ่มต้น</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    // System messages
                    if (message.senderRole === 'system') {
                      return (
                        <div key={message.id} className="flex justify-center">
                          <div className="bg-gray-300 text-gray-700 px-4 py-2 rounded-full text-xs">
                            {message.message}
                          </div>
                        </div>
                      );
                    }

                    // Regular messages
                    const isOwnMessage = firebaseUser?.uid === message.senderId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          {!isOwnMessage && (
                            <div className="text-xs font-medium mb-1 text-gray-600">
                              {message.senderRole === 'admin' ? 'แอดมิน' : message.senderName}
                            </div>
                          )}
                          <div className="text-sm break-words">{message.message}</div>
                          <div className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString('th-TH', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                {selectedChat.status === 'closed' ? (
                  <div className="text-center text-gray-500 py-3">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-sm">การสนทนาได้จบลงแล้ว</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="พิมพ์ข้อความ..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
