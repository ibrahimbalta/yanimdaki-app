// Yanımdaki - Firebase Configuration (Case Sensitivity Fixed)
const firebaseConfig = {
    apiKey: "AIzaSyAnRdv4snlLgT6pDq-ye6Ljy3LbT8Bd45c",
    authDomain: "yanimdaki.firebaseapp.com",
    projectId: "yanimdaki",
    storageBucket: "yanimdaki.firebasestorage.app",
    messagingSenderId: "231861965178",
    appId: "1:231861965178:web:0cdbf3e51878ae1d7c06c3",
    measurementId: "G-H7SJNNPLQV"
};

// Initialize Firebase carefully
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully! 🔥");
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let messaging = null;
try {
    // isSupported() returns a Promise, but in most cases we can just try to init
    // and catch if it's not supported by the environment.
    messaging = firebase.messaging();
} catch (e) {
    console.warn("Firebase Messaging is not supported in this environment.");
}

// Önemli: E-posta dilini Türkçe yap
auth.languageCode = 'tr';
