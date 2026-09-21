import { doc, setDoc, collection, query, orderBy, limit, getDocs, where, serverTimestamp } from "firebase/firestore";
import { firestore } from "../../lib/firebaseClient";

export interface LogEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  details: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export const LOG_ACTIONS = {
  // Authentication
  LOGIN: "เข้าสู่ระบบ",
  LOGOUT: "ออกจากระบบ",
  REGISTER: "สมัครสมาชิก",
  EMAIL_VERIFIED: "ยืนยันอีเมล",
  PASSWORD_RESET: "รีเซ็ตรหัสผ่าน",
  
  // User Management
  USER_CREATED: "สร้างผู้ใช้",
  USER_UPDATED: "อัปเดตข้อมูลผู้ใช้",
  USER_DELETED: "ลบผู้ใช้",
  ROLE_CHANGED: "เปลี่ยนสิทธิ์ผู้ใช้",
  
  // Product Management
  PRODUCT_CREATED: "เพิ่มสินค้า",
  PRODUCT_UPDATED: "แก้ไขสินค้า",
  PRODUCT_DELETED: "ลบสินค้า",
  
  // Order Management
  ORDER_CREATED: "สร้างออเดอร์",
  ORDER_UPDATED: "อัปเดตออเดอร์",
  ORDER_CANCELLED: "ยกเลิกออเดอร์",
  
  // Coupon Management
  COUPON_CREATED: "สร้างคูปอง",
  COUPON_UPDATED: "แก้ไขคูปอง",
  COUPON_DELETED: "ลบคูปอง",
  
  // Admin Actions
  ADMIN_LOGIN: "แอดมินเข้าสู่ระบบ",
  SYSTEM_SETTINGS_UPDATED: "อัปเดตการตั้งค่าระบบ",
} as const;

export type LogAction = keyof typeof LOG_ACTIONS;

export const createLog = async (
  userId: string,
  userEmail: string,
  userName: string,
  action: LogAction,
  details: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await setDoc(doc(firestore, "logs", logId), {
      id: logId,
      userId,
      userEmail,
      userName,
      action: LOG_ACTIONS[action],
      details,
      timestamp: serverTimestamp(),
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("Error creating log:", error);
  }
};

export const getLogs = async (
  limitCount: number = 100,
  userId?: string
): Promise<LogEntry[]> => {
  try {
    let q = query(
      collection(firestore, "logs"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    if (userId) {
      // ใช้ query แบบง่ายก่อน (ไม่ใช้ composite index)
      q = query(
        collection(firestore, "logs"),
        where("userId", "==", userId),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const logs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    })) as LogEntry[];

    // ถ้าเป็น query แบบ userId ให้ sort เอง
    if (userId) {
      return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    return logs;
  } catch (error) {
    console.error("Error fetching logs:", error);
    // ถ้าเกิด error เกี่ยวกับ index ให้ลองดึงข้อมูลแบบง่าย
    try {
      const querySnapshot = await getDocs(collection(firestore, "logs"));
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      })) as LogEntry[];

      // Filter และ sort เอง
      let filteredLogs = logs;
      if (userId) {
        filteredLogs = logs.filter(log => log.userId === userId);
      }
      
      return filteredLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limitCount);
    } catch (fallbackError) {
      console.error("Fallback error fetching logs:", fallbackError);
      return [];
    }
  }
};

export const getUserLogs = async (userId: string, limitCount: number = 50): Promise<LogEntry[]> => {
  return getLogs(limitCount, userId);
};
