import { 
  collection, 
  doc, 
  addDoc,
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../../lib/firebaseClient';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  sellerId: string;
  sellerName?: string;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  specifications?: Record<string, unknown>;
}

const PRODUCTS_COLLECTION = 'products';

export async function getAllProducts(): Promise<Product[]> {
  console.log('getAllProducts called');
  
  // Simple query without complex filters to avoid index requirements
  const q = query(
    collection(firestore, PRODUCTS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const allProducts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Product));
  
  console.log('getAllProducts - All products loaded:', allProducts.length);
  console.log('getAllProducts - All products:', allProducts.map(p => ({ 
    id: p.id, 
    name: p.name, 
    sellerId: p.sellerId, 
    isActive: p.isActive 
  })));
  
  const activeProducts = allProducts.filter(product => product.isActive);
  console.log('getAllProducts - Active products:', activeProducts.length);
  
  return activeProducts;
}

export async function getProductsBySellerId(sellerId: string): Promise<Product[]> {
  console.log('getProductsBySellerId called with sellerId:', sellerId);
  
  try {
    // Simple query without complex filters to avoid index requirements
    const q = query(
      collection(firestore, PRODUCTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    console.log('getProductsBySellerId - Snapshot size:', snapshot.size);
    
    const allProducts = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`Document ${doc.id}:`, data);
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Product;
    });
    
    console.log('All products loaded:', allProducts.length);
    console.log('All products:', allProducts.map(p => ({ id: p.id, name: p.name, sellerId: p.sellerId, isActive: p.isActive })));
    
    const filteredProducts = allProducts.filter(product => {
      const matchesSeller = product.sellerId === sellerId;
      const isActive = product.isActive === true;
      console.log(`Product ${product.name}: sellerId=${product.sellerId}, isActive=${isActive}, matches=${matchesSeller}`);
      return matchesSeller && isActive;
    });
    
    console.log('Filtered products:', filteredProducts.length);
    return filteredProducts;
  } catch (error) {
    console.error('Error in getProductsBySellerId:', error);
    return [];
  }
}

export async function getProductById(productId: string): Promise<Product | null> {
  const productRef = doc(firestore, PRODUCTS_COLLECTION, productId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    return null;
  }
  
  return {
    id: productSnap.id,
    ...productSnap.data(),
    createdAt: productSnap.data().createdAt?.toDate() || new Date(),
    updatedAt: productSnap.data().updatedAt?.toDate() || new Date(),
  } as Product;
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  // Simple query without complex filters to avoid index requirements
  const q = query(
    collection(firestore, PRODUCTS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    } as Product))
    .filter(product => product.category === category && product.isActive);
}

export async function searchProducts(searchTerm: string): Promise<Product[]> {
  // Simple query without complex filters to avoid index requirements
  const q = query(
    collection(firestore, PRODUCTS_COLLECTION),
    orderBy('name')
  );
  
  const snapshot = await getDocs(q);
  const allProducts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
  } as Product));
  
  // Client-side filtering for search and active status
  return allProducts.filter(product => 
    product.isActive &&
    (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
     product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );
}

// Helper function to create test products
export async function createTestProduct(sellerId: string, sellerName: string): Promise<string> {
  console.log('=== CREATE TEST PRODUCT ===');
  console.log('Seller ID:', sellerId);
  console.log('Seller Name:', sellerName);
  
  const testProduct = {
    name: `สินค้าทดสอบ - ${sellerName}`,
    description: 'สินค้าทดสอบสำหรับ Flash Sale',
    price: 100,
    category: 'พืช',
    images: ['https://via.placeholder.com/300x300?text=Test+Product'],
    sellerId: sellerId,
    sellerName: sellerName,
    isActive: true,
    stock: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log('Test product data:', testProduct);
  
  try {
    const docRef = await addDoc(collection(firestore, PRODUCTS_COLLECTION), testProduct);
    console.log('Test product created with ID:', docRef.id);
    console.log('========================');
    return docRef.id;
  } catch (error) {
    console.error('Error creating test product:', error);
    throw error;
  }
}
