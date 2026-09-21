import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc,
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { firestore } from "../../lib/firebaseClient";

export interface ChatMessage {
  id?: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'seller' | 'admin' | 'system';
  message: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'image' | 'file' | 'system_notification';
}

export interface ChatRoom {
  id?: string;
  chatType: 'admin_support' | 'seller_support';
  customerId: string;
  customerName: string;
  sellerId?: string; // สำหรับ seller_support
  sellerName?: string; // สำหรับ seller_support
  orderId?: string; // สำหรับ seller_support
  status: 'active' | 'closed' | 'pending';
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatHistory {
  id?: string;
  userId: string;
  userName: string;
  userRole: 'customer' | 'seller' | 'admin';
  chatRooms: string[]; // Array of chat room IDs
  totalChats: number;
  createdAt: Date;
  updatedAt: Date;
}

const CHAT_ROOMS_COLLECTION = "chatRooms";
const CHAT_MESSAGES_COLLECTION = "chatMessages";
const CHAT_HISTORY_COLLECTION = "chatHistory";

// สร้างห้องแชทใหม่
export async function createChatRoom(
  chatType: 'admin_support' | 'seller_support',
  customerId: string,
  customerName: string,
  sellerId?: string,
  sellerName?: string,
  orderId?: string
): Promise<string> {
  try {
    console.log('🔄 Creating/finding chat room...', { chatType, customerId, sellerId });
    
    // Check if chat room already exists
    const chatRoomsRef = collection(firestore, CHAT_ROOMS_COLLECTION);
    let existingRoomQuery;
    
    if (chatType === 'admin_support') {
      // For admin support, check if customer already has an active admin chat
      existingRoomQuery = query(
        chatRoomsRef,
        where('chatType', '==', 'admin_support'),
        where('customerId', '==', customerId),
        where('status', '==', 'active')
      );
    } else if (chatType === 'seller_support' && sellerId) {
      // For seller support, check if customer already has a chat with this specific seller
      existingRoomQuery = query(
        chatRoomsRef,
        where('chatType', '==', 'seller_support'),
        where('customerId', '==', customerId),
        where('sellerId', '==', sellerId),
        where('status', '==', 'active')
      );
    }
    
    if (existingRoomQuery) {
      const existingSnapshot = await getDocs(existingRoomQuery);
      if (!existingSnapshot.empty) {
        // Return existing chat room ID
        console.log('♻️ Reusing existing chat room:', existingSnapshot.docs[0].id);
        return existingSnapshot.docs[0].id;
      }
    }
    
    // Create new chat room if none exists
    console.log('✨ Creating new chat room');
    const chatRoomData = {
      chatType,
      customerId,
      customerName,
      sellerId: sellerId || null,
      sellerName: sellerName || null,
      orderId: orderId || null,
      status: 'active' as const,
      unreadCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(firestore, CHAT_ROOMS_COLLECTION), chatRoomData);
    console.log('✅ Chat room created successfully:', docRef.id);
    
    // สร้างประวัติแชท
    await createOrUpdateChatHistory(customerId, customerName, 'customer', docRef.id);
    if (sellerId) {
      await createOrUpdateChatHistory(sellerId, sellerName!, 'seller', docRef.id);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating chat room:', error);
    throw new Error(`ไม่สามารถสร้างห้องแชทได้: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ส่งข้อความ
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  senderRole: 'customer' | 'seller' | 'admin',
  message: string,
  messageType: 'text' | 'image' | 'file' = 'text'
): Promise<string> {
  const messageData = {
    chatId,
    senderId,
    senderName,
    senderRole,
    message,
    messageType,
    timestamp: serverTimestamp(),
    isRead: false,
  };

  const docRef = await addDoc(collection(firestore, CHAT_MESSAGES_COLLECTION), messageData);
  
  // อัปเดตห้องแชท
  await updateChatRoomLastMessage(chatId, message);
  
  return docRef.id;
}

// อัปเดตข้อความล่าสุดในห้องแชท
async function updateChatRoomLastMessage(chatId: string, message: string) {
  const chatRoomRef = doc(firestore, CHAT_ROOMS_COLLECTION, chatId);
  await updateDoc(chatRoomRef, {
    lastMessage: message,
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ดึงข้อความในห้องแชท
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const messagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where("chatId", "==", chatId)
  );
  
  const snapshot = await getDocs(q);
  const messages = snapshot.docs
    .filter(doc => !doc.data().deleted) // กรองข้อความที่ถูกลบ
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as ChatMessage[];
  
  // เรียงลำดับข้อความตาม timestamp ใน client-side
  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  return messages;
}

// ดึงห้องแชทของผู้ใช้
export async function getUserChatRooms(
  userId: string, 
  userRole: 'customer' | 'seller' | 'admin',
  chatType?: 'admin_support' | 'seller_support'
): Promise<ChatRoom[]> {
  let q;
  
  if (userRole === 'admin') {
    // แอดมินเห็นทุกห้องแชท
    q = query(
      collection(firestore, CHAT_ROOMS_COLLECTION)
    );
  } else if (userRole === 'customer') {
    // ลูกค้าเห็นห้องแชทของตัวเอง
    q = query(
      collection(firestore, CHAT_ROOMS_COLLECTION),
      where("customerId", "==", userId)
    );
  } else if (userRole === 'seller') {
    // ร้านค้าเห็นห้องแชทที่เกี่ยวข้องกับร้านตัวเอง
    q = query(
      collection(firestore, CHAT_ROOMS_COLLECTION),
      where("sellerId", "==", userId)
    );
  }

  if (chatType && q) {
    q = query(q, where("chatType", "==", chatType));
  }

  const snapshot = await getDocs(q!);
  const chatRooms = snapshot.docs
    .filter(doc => doc.data().status !== 'deleted') // กรองห้องแชทที่ถูกลบ
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      lastMessageTime: doc.data().lastMessageTime?.toDate() || new Date(),
    })) as ChatRoom[];
  
  // เรียงลำดับห้องแชท: แชทที่ยังไม่จบอยู่ด้านบน, แชทที่จบแล้วอยู่ด้านล่าง
  chatRooms.sort((a, b) => {
    // ถ้าสถานะต่างกัน ให้แชทที่ยังไม่จบอยู่ด้านบน
    if (a.status === 'closed' && b.status !== 'closed') return 1;
    if (a.status !== 'closed' && b.status === 'closed') return -1;
    
    // ถ้าสถานะเหมือนกัน ให้เรียงตาม updatedAt
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  
  return chatRooms;
}

// อัปเดตสถานะการอ่านข้อความ
export async function markMessagesAsRead(chatId: string, userId: string) {
  console.log('📖 Marking messages as read for chatId:', chatId, 'userId:', userId);
  
  const messagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION);
  
  // แยก query เพื่อหลีกเลี่ยงการใช้ composite index
  const q = query(
    messagesRef,
    where("chatId", "==", chatId),
    where("isRead", "==", false)
  );
  
  const snapshot = await getDocs(q);
  
  console.log('📊 Total unread messages found:', snapshot.size);
  
  // กรองข้อความที่ไม่ใช่ของตัวเองใน client-side
  const messagesToUpdate = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.senderId !== userId;
  });
  
  console.log('✅ Messages to mark as read (not sent by me):', messagesToUpdate.length);
  
  const updatePromises = messagesToUpdate.map(doc => 
    updateDoc(doc.ref, { isRead: true })
  );
  
  await Promise.all(updatePromises);
  
  // อัปเดตจำนวนข้อความที่ยังไม่ได้อ่านในห้องแชท
  await updateChatRoomUnreadCount(chatId, userId);
}

// อัปเดตจำนวนข้อความที่ยังไม่ได้อ่าน
async function updateChatRoomUnreadCount(chatId: string, forUserId: string) {
  const messagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where("chatId", "==", chatId),
    where("isRead", "==", false)
  );
  
  const snapshot = await getDocs(q);
  
  // Count only messages NOT sent by this user (messages sent TO this user)
  const unreadCount = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.senderId !== forUserId;
  }).length;
  
  console.log('📝 Updating chat room unread count to:', unreadCount, 'for chatId:', chatId);
  
  const chatRoomRef = doc(firestore, CHAT_ROOMS_COLLECTION, chatId);
  await updateDoc(chatRoomRef, {
    unreadCount,
    updatedAt: serverTimestamp(),
  });
}

// ปิดห้องแชท
export async function closeChatRoom(chatId: string, closedBy: string, closedByName: string) {
  const chatRoomRef = doc(firestore, CHAT_ROOMS_COLLECTION, chatId);
  await updateDoc(chatRoomRef, {
    status: 'closed',
    unreadCount: 0, // ลบเลข unread count เมื่อจบสนทนา
    updatedAt: serverTimestamp(),
  });

  // ส่งข้อความแจ้งจบสนทนา
  await addDoc(collection(firestore, CHAT_MESSAGES_COLLECTION), {
    chatId,
    senderId: closedBy,
    senderName: closedByName,
    senderRole: 'system',
    message: 'การสนทนาได้จบลงแล้ว',
    timestamp: serverTimestamp(),
    isRead: false,
    messageType: 'system_notification',
  });
}

// ลบห้องแชท (สำหรับแอดมิน)
export async function deleteChatRoom(chatId: string) {
  // ลบข้อความทั้งหมดในห้องแชท
  const messagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION);
  const messagesQuery = query(messagesRef, where("chatId", "==", chatId));
  const messagesSnapshot = await getDocs(messagesQuery);
  
  const deleteMessagePromises = messagesSnapshot.docs.map(doc => 
    updateDoc(doc.ref, { deleted: true, deletedAt: serverTimestamp() })
  );
  
  await Promise.all(deleteMessagePromises);
  
  // ลบห้องแชท
  const chatRoomRef = doc(firestore, CHAT_ROOMS_COLLECTION, chatId);
  await updateDoc(chatRoomRef, {
    status: 'deleted',
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// ลบข้อความ (สำหรับแอดมิน)
export async function deleteMessage(messageId: string) {
  const messageRef = doc(firestore, CHAT_MESSAGES_COLLECTION, messageId);
  await updateDoc(messageRef, {
    deleted: true,
    deletedAt: serverTimestamp(),
  });
}

// สร้างหรืออัปเดตประวัติแชท
async function createOrUpdateChatHistory(
  userId: string, 
  userName: string, 
  userRole: 'customer' | 'seller' | 'admin',
  chatRoomId: string
) {
  const historyRef = doc(firestore, CHAT_HISTORY_COLLECTION, userId);
  const historyDoc = await getDoc(historyRef);
  
  if (historyDoc.exists()) {
    const existingData = historyDoc.data();
    const chatRooms = existingData.chatRooms || [];
    if (!chatRooms.includes(chatRoomId)) {
      chatRooms.push(chatRoomId);
    }
    
    await updateDoc(historyRef, {
      chatRooms,
      totalChats: chatRooms.length,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(historyRef, {
      userId,
      userName,
      userRole,
      chatRooms: [chatRoomId],
      totalChats: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ดึงประวัติแชทของผู้ใช้
export async function getUserChatHistory(userId: string): Promise<ChatHistory | null> {
  const historyRef = doc(firestore, CHAT_HISTORY_COLLECTION, userId);
  const historyDoc = await getDoc(historyRef);
  
  if (!historyDoc.exists()) {
    return null;
  }
  
  const data = historyDoc.data();
  return {
    id: historyDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as ChatHistory;
}

// Real-time listener สำหรับข้อความใหม่
export function subscribeToChatMessages(
  chatId: string, 
  callback: (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(firestore, CHAT_MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where("chatId", "==", chatId)
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .filter(doc => !doc.data().deleted) // กรองข้อความที่ถูกลบ
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date(),
      })) as ChatMessage[];
    
    // เรียงลำดับข้อความตาม timestamp ใน client-side
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    callback(messages);
  });
}

// Real-time listener สำหรับห้องแชท
export function subscribeToChatRooms(
  userId: string,
  userRole: 'customer' | 'seller' | 'admin',
  callback: (chatRooms: ChatRoom[]) => void
) {
  let q;
  
  if (userRole === 'admin') {
    q = query(
      collection(firestore, CHAT_ROOMS_COLLECTION)
    );
  } else if (userRole === 'customer') {
    q = query(
      collection(firestore, CHAT_ROOMS_COLLECTION),
      where("customerId", "==", userId)
    );
  } else if (userRole === 'seller') {
    q = query(
      collection(firestore, CHAT_ROOMS_COLLECTION),
      where("sellerId", "==", userId)
    );
  }
  
  return onSnapshot(q!, async (snapshot) => {
    console.log('🔄 Chat rooms subscription triggered for userId:', userId);
    
    // Map chat rooms and calculate unread count per user
    const chatRoomsPromises = snapshot.docs
      .filter(doc => doc.data().status !== 'deleted') // กรองห้องแชทที่ถูกลบ
      .map(async (doc) => {
        const chatRoomData = doc.data();
        
        // Calculate unread count for this specific user
        const messagesQuery = query(
          collection(firestore, CHAT_MESSAGES_COLLECTION),
          where("chatId", "==", doc.id),
          where("isRead", "==", false)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        // Count only messages NOT sent by the current user
        const userSpecificUnreadCount = messagesSnapshot.docs.filter(
          msgDoc => msgDoc.data().senderId !== userId
        ).length;
        
        console.log(`💬 Chat room ${doc.id}: ${userSpecificUnreadCount} unread messages for user ${userId}`);
        
        return {
          id: doc.id,
          ...chatRoomData,
          unreadCount: userSpecificUnreadCount, // Override with user-specific count
          createdAt: chatRoomData.createdAt?.toDate() || new Date(),
          updatedAt: chatRoomData.updatedAt?.toDate() || new Date(),
          lastMessageTime: chatRoomData.lastMessageTime?.toDate() || new Date(),
        } as ChatRoom;
      });
    
    const chatRooms = await Promise.all(chatRoomsPromises);
    
    // เรียงลำดับห้องแชท: แชทที่ยังไม่จบอยู่ด้านบน, แชทที่จบแล้วอยู่ด้านล่าง
    chatRooms.sort((a, b) => {
      // ถ้าสถานะต่างกัน ให้แชทที่ยังไม่จบอยู่ด้านบน
      if (a.status === 'closed' && b.status !== 'closed') return 1;
      if (a.status !== 'closed' && b.status === 'closed') return -1;
      
      // ถ้าสถานะเหมือนกัน ให้เรียงตาม updatedAt
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    
    callback(chatRooms);
  });
}
