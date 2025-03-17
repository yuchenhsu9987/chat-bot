import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAursqg7KkQzzIv2_p7dUiJYZBe4IKNMC4",
  authDomain: "chat-bot-39815.firebaseapp.com",
  databaseURL: "https://chat-bot-39815-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-bot-39815",
  storageBucket: "chat-bot-39815.firebasestorage.app",
  messagingSenderId: "892011993607",
  appId: "1:892011993607:web:cfc80c1f71aa9159f2e8a2",
  measurementId: "G-2R6H436GWM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, analytics }; 