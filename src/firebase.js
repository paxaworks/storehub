// Firebase 설정 파일
// 중요: 실제 사용시 .env 파일에서 환경 변수로 관리해야 합니다

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 프로젝트 설정
// TODO: Firebase Console에서 프로젝트 생성 후 아래 값들을 교체하세요
// https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyD5rgDZU7I-IPzjKdrQ_j3ajin5EZ99VJk",
  authDomain: "storehub-a491d.firebaseapp.com",
  projectId: "storehub-a491d",
  storageBucket: "storehub-a491d.firebasestorage.app",
  messagingSenderId: "7938758475",
  appId: "1:7938758475:web:b6d28012b6b9482214face",
  measurementId: "G-BFEVJ6Z5YD"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 인증 서비스
export const auth = getAuth(app);

// Firestore 데이터베이스
export const db = getFirestore(app);

export default app;
