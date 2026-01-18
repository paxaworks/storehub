import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 회원가입
  async function signup(email, password, storeName, ownerName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 프로필 업데이트
    await updateProfile(user, { displayName: ownerName });

    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'users', user.uid), {
      email,
      storeName,
      ownerName,
      createdAt: new Date().toISOString(),
      plan: 'free', // free, basic, premium
      settings: {
        theme: 'dark',
        currency: 'KRW',
        language: 'ko'
      }
    });

    // 기본 데이터 컬렉션 초기화
    await initializeStoreData(user.uid);

    return user;
  }

  // 매장 기본 데이터 초기화
  async function initializeStoreData(userId) {
    const storeRef = doc(db, 'stores', userId);

    // 기본 샘플 데이터
    const defaultMenu = [
      { id: '1', name: '아메리카노', category: '커피', price: 4500, cost: 800, sales: 0 },
      { id: '2', name: '카페라떼', category: '커피', price: 5000, cost: 1200, sales: 0 },
      { id: '3', name: '바닐라라떼', category: '커피', price: 5500, cost: 1400, sales: 0 },
      { id: '4', name: '아이스티', category: '음료', price: 4000, cost: 600, sales: 0 },
      { id: '5', name: '녹차라떼', category: '음료', price: 5500, cost: 1300, sales: 0 },
      { id: '6', name: '크로와상', category: '베이커리', price: 4000, cost: 1800, sales: 0 },
      { id: '7', name: '치즈케이크', category: '베이커리', price: 6500, cost: 2800, sales: 0 },
    ];

    const defaultInventory = [
      { id: '1', name: '원두 (에티오피아)', category: '원두', quantity: 10, minStock: 5, unit: 'kg', price: 28000 },
      { id: '2', name: '우유', category: '유제품', quantity: 20, minStock: 10, unit: '개', price: 2800 },
      { id: '3', name: '테이크아웃컵', category: '포장재', quantity: 500, minStock: 200, unit: '개', price: 120 },
    ];

    await setDoc(storeRef, {
      inventory: defaultInventory,
      menu: defaultMenu,
      staff: [],
      customers: [],
      reservations: [],
      salesData: [],
      createdAt: new Date().toISOString()
    });
  }

  // 로그인
  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  }

  // 로그아웃
  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  // 비밀번호 재설정
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // 사용자 프로필 불러오기
  async function loadUserProfile(userId) {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserProfile(docSnap.data());
      return docSnap.data();
    }
    return null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user.uid);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    resetPassword,
    loadUserProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
