// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js"; 
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// 🔥 Replace this with your Firebase Config (Get this from Firebase Console)
//const firebaseConfig = {
//    apiKey: "YOUR_API_KEY",
//    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
//    projectId: "YOUR_PROJECT_ID",
//    storageBucket: "YOUR_PROJECT_ID.appspot.com",
//    messagingSenderId: "YOUR_SENDER_ID",
//    appId: "YOUR_APP_ID"
//};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6TbvrqGAHWCq8sBcQfN-2OSB4S0kVCjU",
  authDomain: "practice-book-kd.firebaseapp.com",
  projectId: "practice-book-kd",
  storageBucket: "practice-book-kd.firebasestorage.app",
  messagingSenderId: "71803901879",
  appId: "1:71803901879:web:0885e6ae4df607deb7ba32",
  measurementId: "G-K9LMY9XSNC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
enableIndexedDbPersistence(db)
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Export Firestore so other scripts can use it
export { db };



