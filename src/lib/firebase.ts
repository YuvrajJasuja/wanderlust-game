import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDaKetBkR-dOmpcUWymyfDWKPdnXoLeiSA",
  authDomain: "game-testing-623dc.firebaseapp.com",
  projectId: "game-testing-623dc",
  storageBucket: "game-testing-623dc.firebasestorage.app",
  messagingSenderId: "658705967475",
  appId: "1:658705967475:web:670b356494099bdd817d06",
  measurementId: "G-NGMP3ZFNPH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
