import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

// 단일 문서 실시간 동기화
export function useFirestoreDoc(collectionName, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionName, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, docId]);

  const updateData = useCallback(async (newData) => {
    if (!docId) return;
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, newData);
  }, [collectionName, docId]);

  return { data, loading, error, updateData };
}

// 매장 데이터 전용 훅 (실시간 동기화)
export function useStoreData(userId, dataType, defaultValue = []) {
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const storeRef = doc(db, 'stores', userId);
    const unsubscribe = onSnapshot(
      storeRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const storeData = docSnap.data();
          setData(storeData[dataType] || defaultValue);
          setInitialized(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Store data error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, dataType]);

  const setStoreData = useCallback(async (newData) => {
    if (!userId) return;
    const storeRef = doc(db, 'stores', userId);

    // 함수로 전달된 경우 현재 데이터를 기반으로 새 데이터 생성
    const dataToSave = typeof newData === 'function' ? newData(data) : newData;

    await updateDoc(storeRef, {
      [dataType]: dataToSave
    });
  }, [userId, dataType, data]);

  return [data, setStoreData, { loading, error, initialized }];
}

// 판매 데이터 훅 (날짜별 정렬)
export function useSalesData(userId) {
  const [salesData, setSalesData, status] = useStoreData(userId, 'salesData', []);

  const addSale = useCallback(async (sale) => {
    const newSale = {
      ...sale,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await setSalesData((prev) => [...prev, newSale]);
    return newSale;
  }, [setSalesData]);

  const updateSale = useCallback(async (saleId, updates) => {
    await setSalesData((prev) =>
      prev.map(sale => sale.id === saleId ? { ...sale, ...updates } : sale)
    );
  }, [setSalesData]);

  return { salesData, setSalesData, addSale, updateSale, ...status };
}

// 재고 관리 훅
export function useInventory(userId) {
  const [inventory, setInventory, status] = useStoreData(userId, 'inventory', []);

  const addItem = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await setInventory((prev) => [...prev, newItem]);
    return newItem;
  }, [setInventory]);

  const updateItem = useCallback(async (itemId, updates) => {
    await setInventory((prev) =>
      prev.map(item => item.id === itemId ? { ...item, ...updates } : item)
    );
  }, [setInventory]);

  const deleteItem = useCallback(async (itemId) => {
    await setInventory((prev) => prev.filter(item => item.id !== itemId));
  }, [setInventory]);

  return { inventory, setInventory, addItem, updateItem, deleteItem, ...status };
}

// 메뉴 관리 훅
export function useMenu(userId) {
  const [menu, setMenu, status] = useStoreData(userId, 'menu', []);

  const addMenuItem = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await setMenu((prev) => [...prev, newItem]);
    return newItem;
  }, [setMenu]);

  const updateMenuItem = useCallback(async (itemId, updates) => {
    await setMenu((prev) =>
      prev.map(item => item.id === itemId ? { ...item, ...updates } : item)
    );
  }, [setMenu]);

  const deleteMenuItem = useCallback(async (itemId) => {
    await setMenu((prev) => prev.filter(item => item.id !== itemId));
  }, [setMenu]);

  return { menu, setMenu, addMenuItem, updateMenuItem, deleteMenuItem, ...status };
}

// 직원 관리 훅
export function useStaff(userId) {
  const [staff, setStaff, status] = useStoreData(userId, 'staff', []);

  const addStaffMember = useCallback(async (member) => {
    const newMember = {
      ...member,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await setStaff((prev) => [...prev, newMember]);
    return newMember;
  }, [setStaff]);

  const updateStaffMember = useCallback(async (memberId, updates) => {
    await setStaff((prev) =>
      prev.map(member => member.id === memberId ? { ...member, ...updates } : member)
    );
  }, [setStaff]);

  const deleteStaffMember = useCallback(async (memberId) => {
    await setStaff((prev) => prev.filter(member => member.id !== memberId));
  }, [setStaff]);

  return { staff, setStaff, addStaffMember, updateStaffMember, deleteStaffMember, ...status };
}

// 고객 관리 훅
export function useCustomers(userId) {
  const [customers, setCustomers, status] = useStoreData(userId, 'customers', []);

  const addCustomer = useCallback(async (customer) => {
    const newCustomer = {
      ...customer,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  }, [setCustomers]);

  const updateCustomer = useCallback(async (customerId, updates) => {
    await setCustomers((prev) =>
      prev.map(customer => customer.id === customerId ? { ...customer, ...updates } : customer)
    );
  }, [setCustomers]);

  const deleteCustomer = useCallback(async (customerId) => {
    await setCustomers((prev) => prev.filter(customer => customer.id !== customerId));
  }, [setCustomers]);

  return { customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, ...status };
}

// 예약 관리 훅
export function useReservations(userId) {
  const [reservations, setReservations, status] = useStoreData(userId, 'reservations', []);

  const addReservation = useCallback(async (reservation) => {
    const newReservation = {
      ...reservation,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    await setReservations((prev) => [...prev, newReservation]);
    return newReservation;
  }, [setReservations]);

  const updateReservation = useCallback(async (reservationId, updates) => {
    await setReservations((prev) =>
      prev.map(res => res.id === reservationId ? { ...res, ...updates } : res)
    );
  }, [setReservations]);

  const deleteReservation = useCallback(async (reservationId) => {
    await setReservations((prev) => prev.filter(res => res.id !== reservationId));
  }, [setReservations]);

  return { reservations, setReservations, addReservation, updateReservation, deleteReservation, ...status };
}
