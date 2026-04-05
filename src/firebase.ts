import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocFromServer, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user profile exists, if not create it
    const userDocRef = doc(db, 'users', user.uid);
    let userDoc;
    try {
      userDoc = await getDoc(userDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
    
    if (!userDoc?.exists()) {
      try {
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || '',
          mobileNumber: '',
          union: '',
          upazila: 'Sandwip',
          district: 'Chittagong',
          role: user.email === 'shuvojahedurrahman15@gmail.com' ? 'admin' : 'user'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
      }
    }
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const adminLogin = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

export const seedInitialData = async () => {
  const transports = [
    { name: 'এম.ভি. কাপোতাঙ্ক', route: 'Kumira-Guptachhara', time: '১০:০০', price: 150, status: 'সময়মতো ছাড়বে' },
    { name: 'এম.ভি. আইভি রহমান', route: 'Kumira-Guptachhara', time: '১২:৩০', price: 150, status: 'সময়মতো ছাড়বে' },
    { name: 'স্পিড বোট', route: 'Guptachhara-Sitakunda', time: '০৯:০০', price: 300, status: 'সময়মতো ছাড়বে' },
  ];

  const services = [
    { name: 'সন্দ্বীপ থানা', category: 'পুলিশ', contactNumber: '01713373269', location: 'শিবের হাট রোড', officerName: 'ওসি সন্দ্বীপ' },
    { name: 'সরকারি হাসপাতাল', category: 'স্বাস্থ্য', contactNumber: '01711122233', location: 'এনাম নাহার মোড়', officerName: 'উপজেলা স্বাস্থ্য কর্মকর্তা' },
    { name: 'ফায়ার সার্ভিস', category: 'জরুরি', contactNumber: '01711445566', location: 'থানা মোড়', officerName: 'স্টেশন অফিসার' },
  ];

  const market = [
    { productName: 'ইলিশ মাছ', priceRange: '৮০০-১০০০', unit: 'কেজি', imageUrl: 'https://picsum.photos/seed/hilsa/200/150', updatedAt: new Date().toISOString() },
    { productName: 'আলু', priceRange: '৩০-৩২', unit: 'কেজি', imageUrl: 'https://picsum.photos/seed/potato/200/150', updatedAt: new Date().toISOString() },
    { productName: 'পেঁয়াজ', priceRange: '৭০-৮০', unit: 'কেজি', imageUrl: 'https://picsum.photos/seed/onion/200/150', updatedAt: new Date().toISOString() },
  ];

  for (const t of transports) await addDoc(collection(db, 'transports'), t);
  for (const s of services) await addDoc(collection(db, 'emergencyServices'), s);
  for (const m of market) await addDoc(collection(db, 'marketPrices'), m);
  
  alert('Data seeded successfully!');
};

export const logout = () => signOut(auth);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
