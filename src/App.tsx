/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, logout, db, handleFirestoreError, adminLogin, OperationType } from './firebase';
import { 
  Home, User, Settings, Ship, Heart, ShoppingBasket, 
  Briefcase, Camera, Phone, Search, ArrowLeft, LogOut,
  ChevronRight, MapPin, Info, AlertTriangle, Plus, Edit2, Trash2, Users, Bell, Save, X, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc, getDocs, where, limit, orderBy, setDoc } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const compressed = await compressImage(base64);
        resolve(compressed);
      } catch (err) {
        resolve(base64);
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Constants ---
const UNIONS = [
  'আমানউল্যাহ', 'আজিমপুর', 'বাউরিয়া', 'গাছুয়া', 'হারামিয়া', 
  'হরিশপুর', 'কালাপানিয়া', 'মগধরা', 'মাইটভাঙ্গা', 'মুছাপুর', 
  'রহমতপুর', 'সন্তোষপুর', 'সারিকাইত', 'উড়িরচর'
];

const PROFESSIONS = [
  'ডাক্তার (এমবিবিএস)',
  'পল্লী চিকিৎসক',
  'ফার্মাসিস্ট',
  'নার্স/মিডওয়াইফ',
  'ইলেকট্রিশিয়ান',
  'প্লাম্বার (পাইপ ফিটার)',
  'কম্পিউটার/মোবাইল মেকানিক',
  'রেফ্রিজারেটর/এসি টেকনিশিয়ান',
  'রাজমিস্ত্রি',
  'কাঠমিস্ত্রি (ফার্নিচার)',
  'গ্রিল/লোহা মিস্ত্রি',
  'রঙ মিস্ত্রি (পেইন্টার)',
  'অটো-রিকশা চালক',
  'মোটরসাইকেল চালক (ভাড়ায় চালিত)',
  'মাইক্রোবাস/কার ড্রাইভার',
  'স্পিডবোট/বোট চালক',
  'শিক্ষক/গৃহশিক্ষক',
  'ফ্রিল্যান্সার',
  'গ্রাফিক ডিজাইনার/ভিডিও এডিটর',
  'দর্জি (টেইলর)',
  'নাপিত (হেয়ার ড্রেসার)',
  'ডেকোরেটর কর্মী',
  'সাধারণ শ্রমিক',
  'অন্যান্য'
];

// --- Components ---

const Header = ({ title, showBack = false }: { title: string; showBack?: boolean }) => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<any>(null);
  const [hasNewNotif, setHasNewNotif] = useState(false);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const lastNotif = snap.docs[0].data();
        const lastSeen = localStorage.getItem('lastSeenNotif');
        const currentVersion = `${snap.docs[0].id}_${lastNotif.updatedAt || lastNotif.createdAt}`;
        if (lastSeen !== currentVersion) {
          setHasNewNotif(true);
        }
      }
    });
  }, [user]);

  const handleNotifClick = () => {
    setHasNewNotif(false);
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(1));
    getDocs(q).then(snap => {
      if (!snap.empty) {
        const lastNotif = snap.docs[0].data();
        const currentVersion = `${snap.docs[0].id}_${lastNotif.updatedAt || lastNotif.createdAt}`;
        localStorage.setItem('lastSeenNotif', currentVersion);
      }
    });
    navigate('/notifications');
  };

  return (
    <header className="bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
        )}
        {!showBack && (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Ship className="w-5 h-5 text-white" />
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleNotifClick} className="relative p-1">
          <Bell className="w-6 h-6 text-gray-600" />
          {hasNewNotif && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
        </button>
        {user && (
          <Link to="/profile">
            <div className="w-8 h-8 rounded-full border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-100">
              <img 
                src={profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || user.displayName}&background=random`} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
          </Link>
        )}
      </div>
    </header>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-4 z-10">
      <Link to="/" className={cn("flex flex-col items-center gap-1", isActive('/') ? "text-green-600" : "text-gray-400")}>
        <Home className="w-6 h-6" />
        <span className="text-xs">হোম</span>
      </Link>
      <Link to="/profile" className={cn("flex flex-col items-center gap-1", isActive('/profile') ? "text-green-600" : "text-gray-400")}>
        <User className="w-6 h-6" />
        <span className="text-xs">প্রোফাইল</span>
      </Link>
      <Link to="/settings" className={cn("flex flex-col items-center gap-1", isActive('/settings') ? "text-green-600" : "text-gray-400")}>
        <Settings className="w-6 h-6" />
        <span className="text-xs">সেটিংস</span>
      </Link>
    </nav>
  );
};

const BannedScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত করা হয়েছে</h1>
      <p className="text-gray-600 mb-8">নিয়ম লঙ্ঘনের কারণে আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      <button 
        onClick={() => logout()}
        className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg"
      >
        লগ আউট করুন
      </button>
    </div>
  );
};

// --- Screens ---

const LoginScreen = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('লগইন উইন্ডোটি বন্ধ করা হয়েছে। আবার চেষ্টা করুন।');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore, another request is already in progress
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('এই ডোমেইনটি Firebase-এ অনুমোদিত নয়। দয়া করে এডমিনের সাথে যোগাযোগ করুন।');
      } else {
        setError('লগইন করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      }
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#E0F2F7]">
      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
        <Ship className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">আমার সন্দ্বীপ</h1>
      <p className="text-gray-600 mb-8 text-center">সন্দ্বীপবাসীর জন্য একটি সমন্বিত ডিজিটাল প্ল্যাটফর্ম</p>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-600 text-sm rounded-xl font-medium text-center max-w-xs">{error}</div>}

      <button 
        onClick={handleLogin}
        disabled={isSigningIn}
        className={cn(
          "w-full max-w-xs bg-white text-gray-700 font-semibold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors",
          isSigningIn && "opacity-50 cursor-not-allowed"
        )}
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
        {isSigningIn ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে লগইন করুন'}
      </button>
    </div>
  );
};

const Dashboard = () => {
  const menuItems = [
    { title: 'যাতায়াত', icon: Ship, color: 'bg-blue-500', path: '/transport' },
    { title: 'জরুরি সেবা', icon: Phone, color: 'bg-red-500', path: '/emergency' },
    { title: 'বাজার দর', icon: ShoppingBasket, color: 'bg-green-500', path: '/market' },
    { title: 'রক্তদান', icon: Heart, color: 'bg-rose-700', path: '/blood' },
    { title: 'নিয়োগ', icon: Briefcase, color: 'bg-orange-500', path: '/professionals' },
    { title: 'সন্দ্বীপ গ্যালারি', icon: Camera, color: 'bg-sky-400', path: '/gallery' },
  ];

  return (
    <div className="pb-20">
      <Header title="আমার সন্দ্বীপ" />
      <div className="p-4">
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="কি খুঁজছেন?" 
            className="w-full bg-white border-none rounded-2xl py-3 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => (
            <Link 
              key={item.title} 
              to={item.path}
              className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", item.color)}>
                <item.icon className="w-7 h-7" />
              </div>
              <span className="font-semibold text-gray-800">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const TransportScreen = () => {
  const [activeTab, setActiveTab] = useState('kumira');
  const [transports, setTransports] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser || !db) return;
    const q = collection(db, 'transports');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransports(data);
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'transports');
    });
    return unsubscribe;
  }, []);

  const filteredTransports = transports.filter(t => 
    activeTab === 'kumira' ? t.route === 'Kumira-Guptachhara' : t.route === 'Guptachhara-Sitakunda'
  );

  return (
    <div className="pb-20">
      <Header title="যাতায়াত" showBack />
      <div className="flex bg-white border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('kumira')}
          className={cn("flex-1 py-3 font-semibold text-sm", activeTab === 'kumira' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500")}
        >
          কুমিরা-গুপ্তছড়া
        </button>
        <button 
          onClick={() => setActiveTab('gupta')}
          className={cn("flex-1 py-3 font-semibold text-sm", activeTab === 'gupta' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500")}
        >
          গুপ্তছড়া-সীতাকুণ্ড
        </button>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="জাহাজ বা বোট খুঁজুন" 
            className="w-full bg-white border-none rounded-xl py-2 pl-10 pr-4 shadow-sm outline-none"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>

        <div className="space-y-3">
          {filteredTransports.length > 0 ? filteredTransports.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-900">{t.name}</h3>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                  {t.status || 'সময়মতো ছাড়বে'}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="text-sm">সকাল {t.time}</span>
                </div>
                <div className="font-bold text-blue-600">{t.price} টাকা</div>
              </div>
            </div>
          )) : (
            <div className="text-center py-10 text-gray-500">কোন তথ্য পাওয়া যায়নি</div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmergencyScreen = () => {
  const [selectedService, setSelectedService] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser || !db) return;
    const q = collection(db, 'emergencyServices');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServices(data);
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'emergencyServices');
    });
    return unsubscribe;
  }, []);

  if (selectedService) {
    return (
      <div className="pb-20">
        <Header title={selectedService.name} showBack />
        <div className="p-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold mb-1">{selectedService.officerName || 'ভারপ্রাপ্ত কর্মকর্তা'}</h2>
            <p className="text-gray-500 mb-4 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {selectedService.location}
            </p>
            <div className="text-2xl font-bold text-gray-800 mb-8">{selectedService.contactNumber}</div>
            <a 
              href={`tel:${selectedService.contactNumber}`}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-100"
            >
              <Phone className="w-5 h-5" /> কল করুন
            </a>
          </div>
          <button 
            onClick={() => setSelectedService(null)}
            className="mt-4 w-full py-3 text-gray-500 font-medium"
          >
            তালিকায় ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Header title="জরুরি সেবা" showBack />
      <div className="p-4 space-y-3">
        {services.map((service) => (
          <button 
            key={service.id}
            onClick={() => setSelectedService(service)}
            className="w-full bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <span className="font-bold text-gray-800">{service.name}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

const MarketScreen = () => {
  const [prices, setPrices] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser || !db) return;
    const q = collection(db, 'marketPrices');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrices(data);
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'marketPrices');
    });
    return unsubscribe;
  }, []);

  return (
    <div className="pb-20">
      <Header title="বাজার দর" showBack />
      <div className="p-4">
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="পণ্যের নাম খুঁজুন" 
            className="w-full bg-white border-none rounded-2xl py-3 pl-12 pr-4 shadow-sm outline-none"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {prices.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <img 
                src={item.imageUrl || `https://picsum.photos/seed/${item.productName}/200/150`} 
                alt={item.productName}
                className="w-full h-32 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-3">
                <h3 className="font-bold text-gray-900 mb-1">{item.productName}</h3>
                <div className="text-blue-600 font-bold text-sm">
                  {item.unit}: {item.priceRange} টাকা
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs">
          সর্বশেষ আপডেট সময়: ১০:০০ মান
        </div>
      </div>
    </div>
  );
};

const ProfileScreen = () => {
  const [user] = useAuthState(auth);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    mobileNumber: '',
    union: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setFormData({
            displayName: data.displayName || '',
            mobileNumber: data.mobileNumber || '',
            union: data.union || ''
          });
        }
      });
    }
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const base64String = await fileToBase64(file);
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { photoURL: base64String });
    } catch (err) {
      console.error(err);
      alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, formData);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (user && db) {
      const docRef = doc(db, 'users', user.uid);
      updateDoc(docRef, { 
        isOnline: true, 
        lastActive: new Date().toISOString() 
      });
      
      const handleOffline = () => {
        if (db) updateDoc(docRef, { isOnline: false });
      };
      
      window.addEventListener('beforeunload', handleOffline);
      return () => {
        window.removeEventListener('beforeunload', handleOffline);
        handleOffline();
      };
    }
  }, [user]);

  if (!profile) return null;

  return (
    <div className="pb-20">
      <Header title="প্রোফাইল" />
      <div className="p-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center mb-6 relative overflow-hidden">
          <div className="relative group">
            <img 
              src={profile.photoURL || 'https://via.placeholder.com/150'} 
              alt="Profile" 
              className="w-24 h-24 rounded-full mb-4 border-4 border-blue-50 object-cover"
              referrerPolicy="no-referrer"
            />
            <label className="absolute bottom-4 right-0 bg-blue-600 p-2 rounded-full text-white cursor-pointer shadow-lg hover:bg-blue-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
            {uploading && (
              <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-800">{profile.displayName}</h2>
          <p className="text-sm text-gray-500">{profile.role === 'admin' ? 'অ্যাডমিন' : 'ইউজার'}</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> ব্যক্তিগত তথ্য
              </h3>
              <button 
                onClick={() => isEditing ? handleUpdate() : setIsEditing(true)}
                className="text-blue-600 text-sm font-bold"
              >
                {isEditing ? 'সেভ করুন' : 'এডিট করুন'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold">নাম</label>
                {isEditing ? (
                  <input 
                    value={formData.displayName}
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                    className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <div className="font-medium text-gray-700">{profile.displayName}</div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold">মোবাইল নম্বর</label>
                {isEditing ? (
                  <input 
                    value={formData.mobileNumber}
                    onChange={e => setFormData({...formData, mobileNumber: e.target.value})}
                    className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                  />
                ) : (
                  <div className="font-medium text-gray-700">{profile.mobileNumber || 'যোগ করা হয়নি'}</div>
                )}
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold">ইউনিয়ন</label>
                {isEditing ? (
                  <select 
                    value={formData.union}
                    onChange={e => setFormData({...formData, union: e.target.value})}
                    className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">ইউনিয়ন সিলেক্ট করুন</option>
                    {UNIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : (
                  <div className="font-medium text-gray-700">{profile.union || 'যোগ করা হয়নি'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 opacity-60">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b border-gray-50 pb-2">
              <MapPin className="w-4 h-4 text-gray-400" /> স্থায়ী তথ্য
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold">উপজেলা</label>
                <div className="font-medium text-gray-700">{profile.upazila}</div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold">জেলা</label>
                <div className="font-medium text-gray-700">{profile.district}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsScreen = () => {
  const [showModal, setShowModal] = useState<'about' | 'terms' | null>(null);
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    return onSnapshot(doc(db, 'appSettings', 'general'), (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, []);

  return (
    <div className="pb-20">
      <Header title="সেটিংস" />
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setShowModal('about')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">আমাদের সম্পর্কে</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          <button 
            onClick={() => setShowModal('terms')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-gray-700">শর্তাবলী</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </button>
          <button 
            onClick={logout}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 text-red-600"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">লগআউট</span>
            </div>
          </button>
        </div>

        {auth.currentUser?.email === 'shuvojahedurrahman15@gmail.com' && (
          <div className="mt-8 px-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Admin Actions</h3>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <Link 
                to="/admin/dashboard"
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 text-blue-600"
              >
                <div className="flex items-center gap-3">
                  <Edit2 className="w-5 h-5" />
                  <span className="font-medium">এডমিন ড্যাশবোর্ড</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </Link>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b flex justify-between items-center bg-blue-50">
                <h3 className="font-bold text-blue-800">
                  {showModal === 'about' ? 'আমাদের সম্পর্কে' : 'শর্তাবলী'}
                </h3>
                <button onClick={() => setShowModal(null)} className="p-2 hover:bg-white rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-gray-600 leading-relaxed whitespace-pre-wrap">
                {showModal === 'about' ? (
                  settings.about || "এডমিন এখনো কোনো তথ্য প্রদান করেননি।"
                ) : (
                  settings.terms || "এডমিন এখনো কোনো তথ্য প্রদান করেননি।"
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Admin Components ---

const AdminLogin = () => {
  const [user, loading] = useAuthState(auth);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState('');
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.email === 'shuvojahedurrahman15@gmail.com') {
        setShowPasswordInput(true);
        // Fetch stored password
        const fetchPassword = async () => {
          try {
            const docRef = doc(db, 'adminConfig', 'security');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              setStoredPassword(snap.data().secondaryPassword);
            } else {
              // Initialize if not exists
              await setDoc(docRef, { secondaryPassword: 'Jahedur1*' });
              setStoredPassword('Jahedur1*');
            }
          } catch (err) {
            console.error("Error fetching admin password:", err);
            // Fallback to default if fetch fails (might be permission issue if rules not propagated)
            setStoredPassword('Jahedur1*');
          }
        };
        fetchPassword();
      } else {
        logout().then(() => {
          setError('আপনি এডমিন নন।');
        });
      }
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('লগইন উইন্ডোটি বন্ধ করা হয়েছে।');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('এই ডোমেইনটি Firebase-এ অনুমোদিত নয়।');
      } else {
        setError('লগইন করতে সমস্যা হয়েছে।');
      }
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPassword = storedPassword || 'Jahedur1*';
    if (password === targetPassword) {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('ভুল পাসওয়ার্ড। আপনাকে হোম স্ক্রিনে পাঠানো হচ্ছে...');
      setTimeout(() => navigate('/'), 2000);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-6">এডমিন লগইন</h1>
        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        
        {!user && !showPasswordInput && (
          <button 
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
            className={cn(
              "w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl shadow-sm hover:bg-gray-50 transition-all",
              isSigningIn && "opacity-50 cursor-not-allowed"
            )}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            {isSigningIn ? 'অপেক্ষা করুন...' : 'গুগল দিয়ে লগইন করুন'}
          </button>
        )}

        {showPasswordInput && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4 font-medium">স্বাগতম এডমিন! আপনার পাসওয়ার্ড দিন।</p>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="পাসওয়ার্ড"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg">ভেরিফাই করুন</button>
          </form>
        )}
        <Link to="/" className="block text-center mt-6 text-gray-500 text-sm">ইউজার মোডে ফিরে যান</Link>
      </div>
    </div>
  );
};

const AdminBlood = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'bloodDonors'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleApprove = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'bloodDonors', id), { isApproved: !current });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">রক্তদাতা অনুমোদন</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <div className="font-bold">{item.name} ({item.bloodGroup})</div>
              <div className="text-xs text-gray-500">{item.union} | {item.mobileNumber}</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleApprove(item.id, item.isApproved)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold", item.isApproved ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}
              >
                {item.isApproved ? 'অনুমোদিত' : 'অনুমোদন দিন'}
              </button>
              <button onClick={() => deleteDoc(doc(db, 'bloodDonors', item.id))} className="p-2 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminProfessionals = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'professionals'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleApprove = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'professionals', id), { isApproved: !current });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">পেশাজীবী অনুমোদন</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <div className="font-bold">{item.name} ({item.profession})</div>
              <div className="text-xs text-gray-500">{item.union} | {item.mobileNumber}</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleApprove(item.id, item.isApproved)}
                className={cn("px-3 py-1 rounded-full text-xs font-bold", item.isApproved ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}
              >
                {item.isApproved ? 'অনুমোদিত' : 'অনুমোদন দিন'}
              </button>
              <button onClick={() => deleteDoc(doc(db, 'professionals', item.id))} className="p-2 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminGallery = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'galleryItems'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
      } catch (err) {
        console.error(err);
        alert('ছবি প্রসেস করতে সমস্যা হয়েছে।');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!selectedImage) return;

    try {
      await addDoc(collection(db, 'galleryItems'), {
        imageUrl: selectedImage,
        caption: data.get('caption'),
        isApproved: true,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert('সেভ করতে সমস্যা হয়েছে।');
    }
  };

  const handleApprove = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'galleryItems', id), { isApproved: !current });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">গ্যালারি ব্যবস্থাপনা</h2>
        <button onClick={() => {setIsAdding(true); setSelectedImage(null);}} className="bg-blue-600 text-white p-2 rounded-full">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="relative w-full h-48 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
              {selectedImage ? (
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-10 h-10 text-gray-400" />
              )}
              {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <label className="w-full py-2 bg-gray-100 text-gray-600 text-center rounded-lg cursor-pointer text-sm font-bold hover:bg-gray-200 transition-colors">
              ছবি আপলোড করুন
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
          <input name="caption" placeholder="ক্যাপশন (ঐচ্ছিক)" className="w-full p-2 border rounded-lg" />
          <div className="flex gap-2">
            <button type="submit" disabled={uploading || !selectedImage} className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:opacity-50">সেভ করুন</button>
            <button type="button" onClick={() => {setIsAdding(false); setSelectedImage(null);}} className="flex-1 bg-gray-200 py-2 rounded-lg">বাতিল</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <img src={item.imageUrl} alt="" className="w-full h-24 object-cover" />
            <div className="p-2 space-y-2">
              <button 
                onClick={() => handleApprove(item.id, item.isApproved)}
                className={cn("w-full py-1 rounded-full text-[10px] font-bold", item.isApproved ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}
              >
                {item.isApproved ? 'অনুমোদিত' : 'অনুমোদন দিন'}
              </button>
              <button onClick={() => deleteDoc(doc(db, 'galleryItems', item.id))} className="w-full py-1 bg-red-50 text-red-500 rounded-full text-[10px] font-bold">
                মুছে ফেলুন
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('transport');
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      const isAuthenticated = sessionStorage.getItem('isAdminAuthenticated') === 'true';
      if (!user || user.email !== 'shuvojahedurrahman15@gmail.com' || !isAuthenticated) {
        navigate('/admin');
      }
    }
  }, [user, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!user || user.email !== 'shuvojahedurrahman15@gmail.com' || sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
    return null;
  }

  const tabs = [
    { id: 'transport', label: 'যাতায়াত', icon: Ship },
    { id: 'emergency', label: 'জরুরি', icon: Phone },
    { id: 'market', label: 'বাজার', icon: ShoppingBasket },
    { id: 'blood', label: 'রক্তদান', icon: Heart },
    { id: 'profs', label: 'পেশাজীবী', icon: Briefcase },
    { id: 'gallery', label: 'গ্যালারি', icon: Camera },
    { id: 'users', label: 'ইউজার', icon: Users },
    { id: 'notif', label: 'নোটিশ', icon: Bell },
    { id: 'settings', label: 'সেটিংস', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <h1 className="text-xl font-bold text-blue-600">এডমিন প্যানেল</h1>
        <button onClick={() => logout().then(() => navigate('/'))} className="text-red-500 p-2">
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <div className="p-4">
        {activeTab === 'transport' && <AdminTransport />}
        {activeTab === 'emergency' && <AdminEmergency />}
        {activeTab === 'market' && <AdminMarket />}
        {activeTab === 'blood' && <AdminBlood />}
        {activeTab === 'profs' && <AdminProfessionals />}
        {activeTab === 'gallery' && <AdminGallery />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'notif' && <AdminNotifications />}
        {activeTab === 'settings' && <AdminSettings />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex overflow-x-auto py-2 px-2 z-20 scrollbar-hide">
        {tabs.map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[70px] flex-1",
              activeTab === tab.id ? "text-blue-600" : "text-gray-400"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const AdminTransport = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'transports'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
      } catch (err) {
        console.error(err);
        alert('ছবি প্রসেস করতে সমস্যা হয়েছে।');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      name: data.get('name'),
      route: data.get('route'),
      time: data.get('time'),
      price: Number(data.get('price')),
      status: data.get('status') || 'সময়মতো ছাড়বে',
      imageUrl: selectedImage || editing?.imageUrl || `https://picsum.photos/seed/${data.get('name')}/300/200`
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'transports', editing.id), payload);
        setEditing(null);
      } else {
        await addDoc(collection(db, 'transports'), payload);
        setIsAdding(false);
      }
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert('সেভ করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">যাতায়াত ব্যবস্থাপনা</h2>
        <button onClick={() => {setIsAdding(true); setEditing(null); setSelectedImage(null);}} className="bg-blue-600 text-white p-2 rounded-full">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {(isAdding || editing) && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
              {(selectedImage || editing?.imageUrl) ? (
                <img src={selectedImage || editing?.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-gray-400" />
              )}
              {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <label className="w-full py-2 bg-gray-100 text-gray-600 text-center rounded-lg cursor-pointer text-sm font-bold hover:bg-gray-200 transition-colors">
              ছবি আপলোড করুন
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
          <input name="name" defaultValue={editing?.name} placeholder="জাহাজের নাম" className="w-full p-2 border rounded-lg" required />
          <select name="route" defaultValue={editing?.route || 'Kumira-Guptachhara'} className="w-full p-2 border rounded-lg">
            <option value="Kumira-Guptachhara">কুমিরা-গুপ্তছড়া</option>
            <option value="Guptachhara-Sitakunda">গুপ্তছড়া-সীতাকুণ্ড</option>
          </select>
          <input name="time" defaultValue={editing?.time} placeholder="সময় (উদা: ১০:০০)" className="w-full p-2 border rounded-lg" required />
          <input name="price" type="number" defaultValue={editing?.price} placeholder="ভাড়া" className="w-full p-2 border rounded-lg" required />
          <input name="status" defaultValue={editing?.status} placeholder="স্ট্যাটাস" className="w-full p-2 border rounded-lg" />
          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:opacity-50">সেভ করুন</button>
            <button type="button" onClick={() => {setEditing(null); setIsAdding(false); setSelectedImage(null);}} className="flex-1 bg-gray-200 py-2 rounded-lg">বাতিল</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
            <img src={item.imageUrl || `https://picsum.photos/seed/${item.name}/100/100`} alt="" className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="font-bold">{item.name}</div>
              <div className="text-xs text-gray-500">{item.route} | {item.time} | {item.price}৳</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {setEditing(item); setIsAdding(false); setSelectedImage(null); window.scrollTo(0,0);}} className="p-2 text-blue-600"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteDoc(doc(db, 'transports', item.id))} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminEmergency = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'emergencyServices'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      name: data.get('name'),
      category: data.get('category'),
      contactNumber: data.get('contactNumber'),
      location: data.get('location'),
      officerName: data.get('officerName')
    };

    if (editing) {
      await updateDoc(doc(db, 'emergencyServices', editing.id), payload);
      setEditing(null);
    } else {
      await addDoc(collection(db, 'emergencyServices'), payload);
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">জরুরি সেবা ব্যবস্থাপনা</h2>
        <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white p-2 rounded-full">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {(isAdding || editing) && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-md space-y-3">
          <input name="name" defaultValue={editing?.name} placeholder="সেবার নাম" className="w-full p-2 border rounded-lg" required />
          <input name="category" defaultValue={editing?.category} placeholder="ক্যাটাগরি" className="w-full p-2 border rounded-lg" required />
          <input name="contactNumber" defaultValue={editing?.contactNumber} placeholder="ফোন নম্বর" className="w-full p-2 border rounded-lg" required />
          <input name="location" defaultValue={editing?.location} placeholder="লোকেশন" className="w-full p-2 border rounded-lg" />
          <input name="officerName" defaultValue={editing?.officerName} placeholder="ভারপ্রাপ্ত কর্মকর্তা" className="w-full p-2 border rounded-lg" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg">সেভ করুন</button>
            <button type="button" onClick={() => {setEditing(null); setIsAdding(false)}} className="flex-1 bg-gray-200 py-2 rounded-lg">বাতিল</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <div className="font-bold">{item.name}</div>
              <div className="text-xs text-gray-500">{item.contactNumber}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(item)} className="p-2 text-blue-600"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteDoc(doc(db, 'emergencyServices', item.id))} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminMarket = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'marketPrices'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
      } catch (err) {
        console.error(err);
        alert('ছবি প্রসেস করতে সমস্যা হয়েছে।');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      productName: data.get('productName'),
      priceRange: data.get('priceRange'),
      unit: data.get('unit'),
      imageUrl: selectedImage || editing?.imageUrl || `https://picsum.photos/seed/${data.get('productName')}/200/150`,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editing) {
        await updateDoc(doc(db, 'marketPrices', editing.id), payload);
        setEditing(null);
      } else {
        await addDoc(collection(db, 'marketPrices'), payload);
        setIsAdding(false);
      }
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert('সেভ করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">বাজার দর ব্যবস্থাপনা</h2>
        <button onClick={() => {setIsAdding(true); setEditing(null); setSelectedImage(null);}} className="bg-blue-600 text-white p-2 rounded-full">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {(isAdding || editing) && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
              {(selectedImage || editing?.imageUrl) ? (
                <img src={selectedImage || editing?.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-gray-400" />
              )}
              {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <label className="w-full py-2 bg-gray-100 text-gray-600 text-center rounded-lg cursor-pointer text-sm font-bold hover:bg-gray-200 transition-colors">
              ছবি আপলোড করুন
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
          <input name="productName" defaultValue={editing?.productName} placeholder="পণ্যের নাম" className="w-full p-2 border rounded-lg" required />
          <input name="priceRange" defaultValue={editing?.priceRange} placeholder="দাম (উদা: ৮০-১০০)" className="w-full p-2 border rounded-lg" required />
          <input name="unit" defaultValue={editing?.unit || 'কেজি'} placeholder="ইউনিট" className="w-full p-2 border rounded-lg" required />
          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:opacity-50">সেভ করুন</button>
            <button type="button" onClick={() => {setEditing(null); setIsAdding(false); setSelectedImage(null);}} className="flex-1 bg-gray-200 py-2 rounded-lg">বাতিল</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <img src={item.imageUrl} alt="" className="w-full h-20 object-cover" />
            <div className="p-2">
              <div className="font-bold text-sm truncate">{item.productName}</div>
              <div className="text-xs text-blue-600">{item.priceRange}৳</div>
              <div className="flex justify-end gap-1 mt-1">
                <button onClick={() => setEditing(item)} className="p-1 text-blue-600"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => deleteDoc(doc(db, 'marketPrices', item.id))} className="p-1 text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminJobs = () => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, 'jobCirculars'), (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const payload = {
      title: data.get('title'),
      company: data.get('company'),
      description: data.get('description'),
      deadline: data.get('deadline'),
      postedAt: new Date().toISOString()
    };

    if (editing) {
      await updateDoc(doc(db, 'jobCirculars', editing.id), payload);
      setEditing(null);
    } else {
      await addDoc(collection(db, 'jobCirculars'), payload);
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">নিয়োগ ব্যবস্থাপনা</h2>
        <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white p-2 rounded-full">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {(isAdding || editing) && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-md space-y-3">
          <input name="title" defaultValue={editing?.title} placeholder="পদের নাম" className="w-full p-2 border rounded-lg" required />
          <input name="company" defaultValue={editing?.company} placeholder="প্রতিষ্ঠান" className="w-full p-2 border rounded-lg" required />
          <textarea name="description" defaultValue={editing?.description} placeholder="বিবরণ" className="w-full p-2 border rounded-lg" rows={3} required />
          <input name="deadline" defaultValue={editing?.deadline} placeholder="ডেডলাইন" className="w-full p-2 border rounded-lg" required />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg">সেভ করুন</button>
            <button type="button" onClick={() => {setEditing(null); setIsAdding(false)}} className="flex-1 bg-gray-200 py-2 rounded-lg">বাতিল</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div>
              <div className="font-bold">{item.title}</div>
              <div className="text-xs text-gray-500">{item.company}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(item)} className="p-2 text-blue-600"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteDoc(doc(db, 'jobCirculars', item.id))} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filterUnion, setFilterUnion] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') return;
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
  }, []);

  const filteredUsers = filterUnion 
    ? users.filter(u => u.union === filterUnion)
    : users;

  const onlineCount = users.filter(u => u.isOnline).length;

  const handleDelete = async (userId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই ইউজার প্রোফাইলটি ডিলিট করতে চান?')) {
      await deleteDoc(doc(db, 'users', userId));
    }
  };

  const handleBan = async (userId: string, currentBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentBanned });
      setSelectedUser((prev: any) => prev ? { ...prev, isBanned: !currentBanned } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  const handleApprove = async (userId: string, currentVerified: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified: !currentVerified });
      setSelectedUser((prev: any) => prev ? { ...prev, isVerified: !currentVerified } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg flex justify-between items-center">
        <div>
          <div className="text-xs opacity-80">মোট ইউজার</div>
          <div className="text-2xl font-bold">{users.length} জন</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">অনলাইন</div>
          <div className="text-2xl font-bold flex items-center gap-2 justify-end">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            {onlineCount} জন
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setFilterUnion('')}
          className={cn("px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap", !filterUnion ? "bg-blue-600 text-white" : "bg-white text-gray-500")}
        >
          সব ইউনিয়ন
        </button>
        {UNIONS.map(u => (
          <button 
            key={u}
            onClick={() => setFilterUnion(u)}
            className={cn("px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap", filterUnion === u ? "bg-blue-600 text-white" : "bg-white text-gray-500")}
          >
            {u}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedUser(u)}
                className="relative focus:outline-none"
              >
                <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                {u.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
              </button>
              <div onClick={() => setSelectedUser(u)} className="cursor-pointer">
                <div className="font-bold text-sm">{u.displayName}</div>
                <div className="text-[10px] text-gray-500">{u.role} | {u.union || 'N/A'}</div>
              </div>
            </div>
            {u.role !== 'admin' && (
              <button onClick={() => handleDelete(u.id)} className="p-2 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl relative border border-gray-100"
            >
              {/* Header/Banner */}
              <div className="h-24 bg-gray-50 border-b border-gray-100" />
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-gray-400 shadow-sm transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="px-8 pb-8 -mt-12 text-center">
                {/* Profile Picture */}
                <div className="relative inline-block">
                  <div className="w-28 h-28 rounded-full border-[6px] border-white shadow-xl overflow-hidden bg-white">
                    <img 
                      src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}&background=random`} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Online Indicator */}
                  <div className={cn(
                    "absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white shadow-sm",
                    selectedUser.isOnline ? "bg-[#28A745]" : "bg-gray-300"
                  )} />
                </div>
                
                {/* User Info */}
                <div className="mt-4 space-y-1">
                  <h2 className="text-2xl font-bold text-black flex items-center justify-center gap-2">
                    {selectedUser.displayName}
                    {selectedUser.isVerified && (
                      <div className="bg-blue-500 text-white p-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </h2>
                  <p className="text-gray-500 font-medium text-sm capitalize tracking-wide">
                    {selectedUser.role === 'admin' ? 'অ্যাডমিন' : 'সাধারণ ইউজার'}
                  </p>
                </div>

                {/* Details List */}
                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">মোবাইল নম্বর</div>
                      <a href={`tel:${selectedUser.mobileNumber}`} className="text-gray-700 font-bold text-base">
                        {selectedUser.mobileNumber || 'প্রদান করা হয়নি'}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ইউনিয়ন (ঠিকানা)</div>
                      <div className="text-gray-700 font-bold text-base">{selectedUser.union || 'প্রদান করা হয়নি'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">সর্বশেষ সক্রিয়</div>
                      <div className="text-gray-700 font-bold text-sm">
                        {selectedUser.lastActive ? new Date(selectedUser.lastActive).toLocaleString('bn-BD') : 'অজানা'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedUser.role !== 'admin' && (
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleBan(selectedUser.id, selectedUser.isBanned)}
                      className={cn(
                        "py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95",
                        selectedUser.isBanned ? "bg-gray-400" : "bg-[#FF4444]"
                      )}
                    >
                      {selectedUser.isBanned ? 'আন-ব্যান' : 'ব্যান করুন'}
                    </button>
                    <button 
                      onClick={() => handleApprove(selectedUser.id, selectedUser.isVerified)}
                      className={cn(
                        "py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95",
                        selectedUser.isVerified ? "bg-blue-500" : "bg-[#28A745]"
                      )}
                    >
                      {selectedUser.isVerified ? 'ভেরিফাইড' : 'অনুমোদন'}
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full mt-4 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  বন্ধ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminSettings = () => {
  const [settings, setSettings] = useState<any>({ about: '', terms: '' });
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'appSettings', 'general'), (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'appSettings', 'general'), settings);
      alert('সেটিংস সফলভাবে আপডেট করা হয়েছে!');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">অ্যাপ কন্টেন্ট ম্যানেজমেন্ট</h2>
      <div className="bg-white p-6 rounded-2xl shadow-md space-y-6">
        <div>
          <label className="text-sm font-bold text-gray-500 block mb-2 uppercase tracking-wider">আমাদের সম্পর্কে (About Us)</label>
          <textarea 
            value={settings.about}
            onChange={(e) => setSettings({ ...settings, about: e.target.value })}
            className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-40"
            placeholder="আমাদের সম্পর্কে বিস্তারিত লিখুন..."
          />
        </div>
        <div>
          <label className="text-sm font-bold text-gray-500 block mb-2 uppercase tracking-wider">শর্তাবলী (Terms & Conditions)</label>
          <textarea 
            value={settings.terms}
            onChange={(e) => setSettings({ ...settings, terms: e.target.value })}
            className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-40"
            placeholder="শর্তাবলী বিস্তারিত লিখুন..."
          />
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? 'আপডেট হচ্ছে...' : <><Save className="w-5 h-5" /> আপডেট করুন</>}
        </button>
      </div>

      <h2 className="text-lg font-bold mt-8">নিরাপত্তা সেটিংস</h2>
      <div className="bg-white p-6 rounded-2xl shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-900">সেকেন্ডারি পাসওয়ার্ড</div>
            <div className="text-xs text-gray-500">এডমিন প্যানেলে প্রবেশের জন্য অতিরিক্ত সুরক্ষা</div>
          </div>
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all"
          >
            পরিবর্তন করুন
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPasswordModal && (
          <AdminPasswordChangeModal onClose={() => setShowPasswordModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminPasswordChangeModal = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(1); // 1: Verify, 2: New, 3: Confirm
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'adminConfig', 'security'));
      const stored = snap.exists() ? snap.data().secondaryPassword : 'Jahedur1*';
      
      if (currentPass === stored) {
        setStep(2);
        setError('');
      } else {
        setError('বর্তমান পাসওয়ার্ডটি সঠিক নয়।');
      }
    } catch (err) {
      setError('সার্ভার ত্রুটি। আবার চেষ্টা করুন।');
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (newPass !== confirmPass) {
      setError('পাসওয়ার্ড দুটি মিলছে না।');
      return;
    }
    if (newPass.length < 6) {
      setError('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, 'adminConfig', 'security'), {
        secondaryPassword: newPass
      });
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
      onClose();
    } catch (err) {
      setError('পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl relative border border-gray-100"
      >
        <div className="h-20 bg-blue-50 border-b border-blue-100 flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
            <Edit2 className="w-6 h-6" />
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-gray-400 shadow-sm transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-black mb-2">পাসওয়ার্ড পরিবর্তন</h2>
          <p className="text-gray-500 text-sm mb-8">নিরাপত্তার জন্য আপনার সেকেন্ডারি পাসওয়ার্ড আপডেট করুন।</p>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl font-bold">{error}</div>}

          <div className="space-y-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-2">বর্তমান পাসওয়ার্ড</label>
                  <input 
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full mt-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  onClick={handleVerify}
                  disabled={loading || !currentPass}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'যাচাই করা হচ্ছে...' : 'পরবর্তী ধাপ'}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="text-left">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-2">নতুন পাসওয়ার্ড</label>
                  <input 
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full mt-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                    placeholder="••••••••"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider ml-2">পাসওয়ার্ড নিশ্চিত করুন</label>
                  <input 
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full mt-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  onClick={handleUpdate}
                  disabled={loading || !newPass || !confirmPass}
                  className="w-full py-4 bg-[#28A745] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={onClose}
            className="mt-6 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
          >
            বাতিল করুন
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AdminNotifications = () => {
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [isPopup, setIsPopup] = useState(false);
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<'notif' | 'announcement' | null>(null);

  useEffect(() => {
    const qNotif = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'notifications'));

    const qAnnounce = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubAnnounce = onSnapshot(qAnnounce, (snap) => {
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'announcements'));

    return () => {
      unsubNotif();
      unsubAnnounce();
    };
  }, []);

  const handleSendOrUpdate = async () => {
    if (!title || !msg) return;
    setSending(true);
    try {
      const payload = {
        title,
        message: msg,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const coll = editingType === 'announcement' ? 'announcements' : 'notifications';
        await updateDoc(doc(db, coll, editingId), payload);
        alert('সফলভাবে আপডেট করা হয়েছে!');
        setEditingId(null);
        setEditingType(null);
      } else {
        const newPayload = { ...payload, createdAt: new Date().toISOString() };
        if (isPopup) {
          await addDoc(collection(db, 'announcements'), { ...newPayload, isActive: true });
        } else {
          await addDoc(collection(db, 'notifications'), newPayload);
        }
        alert('সফলভাবে পাঠানো হয়েছে!');
      }
      setTitle('');
      setMsg('');
      setIsPopup(false);
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, editingType === 'announcement' ? 'announcements' : 'notifications');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = (item: any, type: 'notif' | 'announcement') => {
    setTitle(item.title);
    setMsg(item.message);
    setEditingId(item.id);
    setEditingType(type);
    setIsPopup(type === 'announcement');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, type: 'notif' | 'announcement') => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এটি ডিলিট করতে চান?')) return;
    try {
      const coll = type === 'announcement' ? 'announcements' : 'notifications';
      await deleteDoc(doc(db, coll, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, type === 'announcement' ? 'announcements' : 'notifications');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setTitle('');
    setMsg('');
    setIsPopup(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">নোটিফিকেশন কন্ট্রোল</h2>
        {editingId && (
          <button onClick={cancelEdit} className="text-red-500 text-sm font-bold flex items-center gap-1">
            <X className="w-4 h-4" /> এডিট বাতিল করুন
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md space-y-4">
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="শিরোনাম"
          className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea 
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="বিস্তারিত বার্তা..."
          className="w-full p-4 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          rows={5}
        />
        {!editingId && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isPopup}
              onChange={(e) => setIsPopup(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="text-sm font-medium text-gray-700">পপ-আপ হিসেবে পাঠান</span>
          </label>
        )}
        <button 
          onClick={handleSendOrUpdate}
          disabled={sending}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? 'প্রসেস হচ্ছে...' : (
            editingId ? <><Save className="w-5 h-5" /> আপডেট করুন</> : <><Bell className="w-5 h-5" /> পাঠান</>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-700">আগের নোটিফিকেশনসমূহ</h3>
        
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">পপ-আপ অ্যানাউন্সমেন্ট</h4>
          {announcements.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-bold text-sm">{item.title}</h5>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.message}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item, 'announcement')} className="p-2 text-blue-600 bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id, 'announcement')} className="p-2 text-red-600 bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {announcements.length === 0 && <p className="text-xs text-gray-400 italic">কোনো পপ-আপ নেই</p>}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">সাধারণ নোটিফিকেশন</h4>
          {notifications.map(item => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-bold text-sm">{item.title}</h5>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.message}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item, 'notif')} className="p-2 text-blue-600 bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id, 'notif')} className="p-2 text-red-600 bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-xs text-gray-400 italic">কোনো নোটিফিকেশন নেই</p>}
        </div>
      </div>
    </div>
  );
};

const AnnouncementPopup = () => {
  const [announcement, setAnnouncement] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), where('isActive', '==', true), limit(1));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAnnouncement({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setAnnouncement(null);
      }
    });
  }, []);

  if (!announcement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
      >
        <button 
          onClick={() => setAnnouncement(null)}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{announcement.title}</h2>
        <p className="text-gray-600 mb-6 leading-relaxed">{announcement.message}</p>
        <button 
          onClick={() => setAnnouncement(null)}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-100"
        >
          ঠিক আছে
        </button>
      </motion.div>
    </div>
  );
};

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div className="pb-20">
      <Header title="নোটিফিকেশন" showBack />
      <div className="p-4 space-y-3">
        {notifications.length > 0 ? notifications.map((n) => (
          <div key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-900 mb-1">{n.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{n.message}</p>
            <div className="text-[10px] text-gray-400 flex justify-between">
              <span>{new Date(n.createdAt).toLocaleString('bn-BD')}</span>
              {n.updatedAt && <span className="italic text-blue-400">আপডেট করা হয়েছে</span>}
            </div>
          </div>
        )) : (
          <div className="text-center py-20 text-gray-500">কোনো নোটিফিকেশন নেই</div>
        )}
      </div>
    </div>
  );
};

const BloodScreen = () => {
  const [donors, setDonors] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const q = query(collection(db, 'bloodDonors'), where('isApproved', '==', true));
    return onSnapshot(q, (snap) => {
      setDonors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'bloodDonors'), {
        uid: user?.uid,
        name: data.get('name'),
        bloodGroup: data.get('bloodGroup'),
        mobileNumber: data.get('mobileNumber'),
        union: data.get('union'),
        isApproved: false,
        createdAt: new Date().toISOString()
      });
      alert('আপনার আবেদনটি জমা হয়েছে। এডমিন যাচাই করে অনুমোদন দিলে তা তালিকায় দেখা যাবে।');
      setIsRegistering(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pb-20">
      <Header title="রক্তদান" showBack />
      <div className="p-4">
        <button 
          onClick={() => setIsRegistering(true)}
          className="w-full bg-rose-600 text-white font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 mb-6"
        >
          <Heart className="w-5 h-5 fill-current" /> রক্তদাতা হিসেবে রেজিস্ট্রেশন করুন
        </button>

        <div className="space-y-3">
          {donors.length > 0 ? donors.map((donor) => (
            <div key={donor.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 font-bold text-lg">
                  {donor.bloodGroup}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{donor.name}</h3>
                  <p className="text-xs text-gray-500">{donor.union}</p>
                </div>
              </div>
              <a href={`tel:${donor.mobileNumber}`} className="p-3 bg-green-100 text-green-600 rounded-full">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          )) : (
            <div className="text-center py-10 text-gray-500">কোনো অনুমোদিত রক্তদাতা পাওয়া যায়নি</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isRegistering && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">রক্তদাতা রেজিস্ট্রেশন</h2>
                <button onClick={() => setIsRegistering(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <input name="name" placeholder="আপনার নাম" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required />
                <select name="bloodGroup" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required>
                  <option value="">রক্তের গ্রুপ নির্বাচন করুন</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input name="mobileNumber" placeholder="মোবাইল নম্বর" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required />
                <select name="union" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required>
                  <option value="">ইউনিয়ন নির্বাচন করুন</option>
                  {UNIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button type="submit" className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg">সাবমিট করুন</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProfessionalScreen = () => {
  const [profs, setProfs] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [user] = useAuthState(auth);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterProfession, setFilterProfession] = useState('');
  const [filterUnion, setFilterUnion] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'professionals'), where('isApproved', '==', true));
    return onSnapshot(q, (snap) => {
      setProfs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const filteredProfs = profs.filter(p => {
    const matchProf = filterProfession ? p.profession === filterProfession : true;
    const matchUnion = filterUnion ? p.union === filterUnion : true;
    return matchProf && matchUnion;
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
      } catch (err) {
        console.error(err);
        alert('ছবি প্রসেস করতে সমস্যা হয়েছে।');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'professionals'), {
        uid: user?.uid,
        name: data.get('name'),
        profession: data.get('profession'),
        mobileNumber: data.get('mobileNumber'),
        union: data.get('union'),
        description: data.get('description'),
        photoURL: selectedImage || 'https://via.placeholder.com/150',
        isApproved: false,
        createdAt: new Date().toISOString()
      });
      alert('আপনার তথ্য জমা হয়েছে। এডমিন যাচাই করে অনুমোদন দিলে তা ডিরেক্টরিতে দেখা যাবে।');
      setIsRegistering(false);
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert('রেজিস্ট্রেশন করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="pb-20">
      <Header title="পেশাজীবী ডিরেক্টরি" showBack />
      <div className="p-4">
        <button 
          onClick={() => {setIsRegistering(true); setSelectedImage(null);}}
          className="w-full bg-orange-500 text-white font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 mb-4"
        >
          <Briefcase className="w-5 h-5" /> আপনার তথ্য যোগ করুন
        </button>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <select 
            value={filterProfession} 
            onChange={(e) => setFilterProfession(e.target.value)}
            className="p-2 bg-white border rounded-xl text-xs outline-none"
          >
            <option value="">সকল পেশা</option>
            {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select 
            value={filterUnion} 
            onChange={(e) => setFilterUnion(e.target.value)}
            className="p-2 bg-white border rounded-xl text-xs outline-none"
          >
            <option value="">সকল ইউনিয়ন</option>
            {UNIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {filteredProfs.length > 0 ? filteredProfs.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-3">
                  <img src={p.photoURL || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">{p.profession}</span>
                  </div>
                </div>
                <a href={`tel:${p.mobileNumber}`} className="p-2 bg-green-100 text-green-600 rounded-full">
                  <Phone className="w-4 h-4" />
                </a>
              </div>
              <p className="text-xs text-gray-500 mb-1">{p.union}</p>
              <p className="text-xs text-gray-400 line-clamp-2">{p.description}</p>
            </div>
          )) : (
            <div className="text-center py-10 text-gray-500">কোনো অনুমোদিত পেশাজীবী পাওয়া যায়নি</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isRegistering && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ডিরেক্টরি রেজিস্ট্রেশন</h2>
                <button onClick={() => setIsRegistering(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="relative w-24 h-24 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {selectedImage ? (
                      <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400" />
                    )}
                    {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                  </div>
                  <label className="text-blue-600 text-sm font-bold cursor-pointer">
                    প্রোফাইল ছবি সিলেক্ট করুন
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
                <input name="name" placeholder="আপনার নাম" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required />
                <select name="profession" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required>
                  <option value="">পেশা নির্বাচন করুন</option>
                  {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input name="mobileNumber" placeholder="মোবাইল নম্বর" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required />
                <select name="union" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" required>
                  <option value="">ইউনিয়ন নির্বাচন করুন</option>
                  {UNIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <textarea name="description" placeholder="আপনার কাজের সংক্ষিপ্ত বিবরণ" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" rows={3} />
                <button type="submit" disabled={uploading} className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50">সাবমিট করুন</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GalleryScreen = () => {
  const [items, setItems] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [user] = useAuthState(auth);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'galleryItems'), where('isApproved', '==', true));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const base64 = await fileToBase64(file);
        setSelectedImage(base64);
      } catch (err) {
        console.error(err);
        alert('ছবি প্রসেস করতে সমস্যা হয়েছে।');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!selectedImage) {
      alert('দয়া করে একটি ছবি সিলেক্ট করুন।');
      return;
    }

    try {
      await addDoc(collection(db, 'galleryItems'), {
        uid: user?.uid,
        imageUrl: selectedImage,
        caption: data.get('caption'),
        isApproved: false,
        createdAt: new Date().toISOString()
      });
      alert('আপনার ছবিটি জমা হয়েছে। এডমিন অনুমোদন দিলে তা গ্যালারিতে দেখা যাবে।');
      setIsUploading(false);
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
      alert('আপলোড করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="pb-20">
      <Header title="সন্দ্বীপ গ্যালারি" showBack />
      <div className="p-4">
        <button 
          onClick={() => {setIsUploading(true); setSelectedImage(null);}}
          className="w-full bg-sky-400 text-white font-bold py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 mb-6"
        >
          <Camera className="w-5 h-5" /> ছবি পাঠান
        </button>

        <div className="grid grid-cols-2 gap-4">
          {items.length > 0 ? items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <img 
                src={item.imageUrl} 
                alt={item.caption}
                className="w-full h-40 object-cover"
                referrerPolicy="no-referrer"
              />
              {item.caption && <div className="p-2 text-xs text-gray-600 truncate">{item.caption}</div>}
            </div>
          )) : (
            <div className="col-span-2 text-center py-10 text-gray-500">গ্যালারিতে কোনো ছবি নেই</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ছবি আপলোড</h2>
                <button onClick={() => setIsUploading(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="relative w-full h-48 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                    {selectedImage ? (
                      <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-10 h-10 text-gray-400" />
                    )}
                    {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                  </div>
                  <label className="w-full py-3 bg-gray-100 text-gray-600 text-center rounded-xl cursor-pointer font-bold hover:bg-gray-200 transition-colors">
                    গ্যালারি থেকে ছবি সিলেক্ট করুন
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
                <input name="caption" placeholder="ছবির ক্যাপশন (ঐচ্ছিক)" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" />
                <button type="submit" disabled={uploading || !selectedImage} className="w-full bg-sky-400 text-white font-bold py-4 rounded-2xl shadow-lg disabled:opacity-50">আপলোড করুন</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const JobsScreen = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = collection(db, 'jobCirculars');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(data);
    }, (error) => {
      handleFirestoreError(error, 'get' as any, 'jobCirculars');
    });
    return unsubscribe;
  }, []);

  return (
    <div className="pb-20">
      <Header title="নিয়োগ" showBack />
      <div className="p-4 space-y-4">
        {jobs.length > 0 ? jobs.map((job) => (
          <div key={job.id} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-orange-500">
            <h3 className="font-bold text-lg text-gray-900 mb-1">{job.title}</h3>
            <div className="text-orange-600 font-semibold text-sm mb-3">{job.company}</div>
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{job.description}</p>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>ডেডলাইন: {job.deadline}</span>
              <span>পোস্ট করা হয়েছে: {new Date(job.postedAt).toLocaleDateString('bn-BD')}</span>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 text-gray-500">বর্তমানে কোনো নিয়োগ বিজ্ঞপ্তি নেই</div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      return onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setProfile(snap.data());
        }
      });
    } else {
      setProfile(null);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0F2F7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (profile?.isBanned) {
    return <BannedScreen />;
  }

  return (
    <Router>
      <div className="max-w-md mx-auto min-h-screen bg-[#E0F2F7] relative font-sans">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transport" element={<TransportScreen />} />
            <Route path="/emergency" element={<EmergencyScreen />} />
            <Route path="/market" element={<MarketScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="/blood" element={<BloodScreen />} />
            <Route path="/jobs" element={<JobsScreen />} />
            <Route path="/gallery" element={<GalleryScreen />} />
            <Route path="/professionals" element={<ProfessionalScreen />} />
          </Routes>
        </AnimatePresence>
        <AnnouncementPopup />
        <BottomNav />
      </div>
    </Router>
  );
}
