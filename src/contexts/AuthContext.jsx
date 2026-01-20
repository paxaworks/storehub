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

    // Firestore에 사용자 정보 저장 (businessType은 나중에 선택)
    const profile = {
      email,
      storeName,
      ownerName,
      businessType: null, // 업종 선택 전
      createdAt: new Date().toISOString(),
      plan: 'free',
      settings: {
        theme: 'dark',
        currency: 'KRW',
        language: 'ko'
      }
    };

    await setDoc(doc(db, 'users', user.uid), profile);
    setUserProfile(profile);

    return user;
  }

  // 업종 선택 및 데이터 초기화
  async function selectBusinessType(businessType) {
    if (!currentUser) return;

    // 사용자 프로필에 업종 저장
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { businessType }, { merge: true });

    // 업종에 맞는 데이터 초기화
    await initializeStoreData(currentUser.uid, businessType);

    // 프로필 업데이트
    setUserProfile(prev => ({ ...prev, businessType }));
  }

  // 업종별 템플릿 데이터
  const businessTemplates = {
    cafe: {
      products: [
        { id: 1, name: '아메리카노', category: '커피', price: 4500, cost: 800, quantity: 999, minStock: 0, unit: '잔', sales: 0, ingredients: [] },
        { id: 2, name: '카페라떼', category: '커피', price: 5000, cost: 1200, quantity: 999, minStock: 0, unit: '잔', sales: 0, ingredients: [] },
        { id: 3, name: '바닐라라떼', category: '커피', price: 5500, cost: 1400, quantity: 999, minStock: 0, unit: '잔', sales: 0, ingredients: [] },
        { id: 4, name: '아이스티', category: '음료', price: 4000, cost: 600, quantity: 999, minStock: 0, unit: '잔', sales: 0, ingredients: [] },
        { id: 5, name: '크로와상', category: '베이커리', price: 4000, cost: 1800, quantity: 999, minStock: 0, unit: '개', sales: 0, ingredients: [] },
        { id: 101, name: '원두 (에티오피아)', category: '원자재', price: 28000, cost: 28000, quantity: 10, minStock: 5, unit: 'kg', isIngredient: true },
        { id: 102, name: '우유', category: '원자재', price: 2800, cost: 2800, quantity: 20, minStock: 10, unit: '개', isIngredient: true },
      ],
      staff: [
        { id: 1, name: '홍길동', role: '매니저', phone: '010-1234-5678', salary: 3200000, status: 'active' },
        { id: 2, name: '김바리', role: '바리스타', phone: '010-2345-6789', salary: 2400000, status: 'active' },
      ]
    },
    restaurant: {
      products: [
        { id: 1, name: '김치찌개', category: '메인', price: 9000, cost: 3500, quantity: 999, minStock: 0, unit: '인분', sales: 0, ingredients: [] },
        { id: 2, name: '된장찌개', category: '메인', price: 8000, cost: 3000, quantity: 999, minStock: 0, unit: '인분', sales: 0, ingredients: [] },
        { id: 3, name: '제육볶음', category: '메인', price: 10000, cost: 4000, quantity: 999, minStock: 0, unit: '인분', sales: 0, ingredients: [] },
        { id: 4, name: '공기밥', category: '사이드', price: 1000, cost: 300, quantity: 999, minStock: 0, unit: '공기', sales: 0, ingredients: [] },
        { id: 5, name: '계란말이', category: '사이드', price: 5000, cost: 1500, quantity: 999, minStock: 0, unit: '개', sales: 0, ingredients: [] },
        { id: 101, name: '돼지고기', category: '원자재', price: 15000, cost: 15000, quantity: 20, minStock: 5, unit: 'kg', isIngredient: true },
        { id: 102, name: '쌀', category: '원자재', price: 50000, cost: 50000, quantity: 10, minStock: 3, unit: '포', isIngredient: true },
      ],
      staff: [
        { id: 1, name: '박주방', role: '주방장', phone: '010-1234-5678', salary: 3500000, status: 'active' },
        { id: 2, name: '이서빙', role: '홀서빙', phone: '010-2345-6789', salary: 2200000, status: 'active' },
      ]
    },
    retail: {
      products: [
        { id: 1, name: '티셔츠 (화이트)', category: '의류', price: 29000, cost: 12000, quantity: 50, minStock: 10, unit: '개', sales: 0, ingredients: [] },
        { id: 2, name: '청바지', category: '의류', price: 59000, cost: 25000, quantity: 30, minStock: 5, unit: '개', sales: 0, ingredients: [] },
        { id: 3, name: '운동화', category: '신발', price: 89000, cost: 40000, quantity: 20, minStock: 5, unit: '켤레', sales: 0, ingredients: [] },
        { id: 4, name: '모자', category: '액세서리', price: 25000, cost: 8000, quantity: 40, minStock: 10, unit: '개', sales: 0, ingredients: [] },
        { id: 5, name: '가방', category: '액세서리', price: 45000, cost: 18000, quantity: 15, minStock: 3, unit: '개', sales: 0, ingredients: [] },
      ],
      staff: [
        { id: 1, name: '최매니저', role: '매니저', phone: '010-1234-5678', salary: 2800000, status: 'active' },
        { id: 2, name: '정판매', role: '판매원', phone: '010-2345-6789', salary: 2200000, status: 'active' },
      ]
    },
    salon: {
      products: [
        { id: 1, name: '커트 (남성)', category: '커트', price: 18000, cost: 2000, quantity: 999, minStock: 0, unit: '회', sales: 0, ingredients: [] },
        { id: 2, name: '커트 (여성)', category: '커트', price: 25000, cost: 3000, quantity: 999, minStock: 0, unit: '회', sales: 0, ingredients: [] },
        { id: 3, name: '염색', category: '염색/펌', price: 80000, cost: 20000, quantity: 999, minStock: 0, unit: '회', sales: 0, ingredients: [] },
        { id: 4, name: '펌', category: '염색/펌', price: 100000, cost: 25000, quantity: 999, minStock: 0, unit: '회', sales: 0, ingredients: [] },
        { id: 5, name: '클리닉', category: '케어', price: 30000, cost: 8000, quantity: 999, minStock: 0, unit: '회', sales: 0, ingredients: [] },
        { id: 101, name: '염색약', category: '원자재', price: 15000, cost: 15000, quantity: 30, minStock: 10, unit: '개', isIngredient: true },
        { id: 102, name: '펌약', category: '원자재', price: 20000, cost: 20000, quantity: 20, minStock: 5, unit: '개', isIngredient: true },
      ],
      staff: [
        { id: 1, name: '김원장', role: '원장', phone: '010-1234-5678', salary: 4000000, status: 'active' },
        { id: 2, name: '이디자이너', role: '디자이너', phone: '010-2345-6789', salary: 2800000, status: 'active' },
      ]
    },
    empty: {
      products: [],
      staff: []
    }
  };

  // 매장 기본 데이터 초기화
  async function initializeStoreData(userId, businessType = 'empty') {
    const storeRef = doc(db, 'stores', userId);
    const template = businessTemplates[businessType] || businessTemplates.empty;

    await setDoc(storeRef, {
      products: template.products,
      staff: template.staff,
      customers: [],
      reservations: [],
      salesData: [],
      schedules: {},
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
    selectBusinessType,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
