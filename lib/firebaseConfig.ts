// lib/firebaseConfig.ts

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage'


const firebaseConfig = {
  apiKey: "AIzaSyC5SjEU2tEH85gKrXrX79yAu1cCeZugOi4",
  authDomain: "mkspam-c824d.firebaseapp.com",
  databaseURL: "https://mkspam-c824d-default-rtdb.firebaseio.com",
  projectId: "mkspam-c824d",
  storageBucket: "mkspam-c824d.appspot.com",
  messagingSenderId: "640689755066",
  appId: "1:640689755066:web:9ad4b790ba104667e70383",
  measurementId: "G-QBDQW01MBP"
};

// Initialize Firebase
let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const database = getDatabase(app);
const storage = getStorage(app)
export { database , storage  };
