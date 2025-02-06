// firebaseConfig.js

// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAynHrr2...", // Thay bằng apiKey thực tế của bạn
  authDomain: "socialnetworkapp-6156e.firebaseapp.com",
  projectId: "socialnetworkapp-6156e",
  storageBucket: "socialnetworkapp-6156e.appspot.com",
  messagingSenderId: "698634990991",
  appId: "1:698634990991:web:dca093fae23e2291c287fa"
};

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Firestore
const db = getFirestore(app);

// Xuất đối tượng db để sử dụng ở nơi khác
export { db };
