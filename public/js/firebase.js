// Firebase Configuration
// Your Firebase credentials
const firebaseConfig = {
    apiKey: "AIzaSyBNspOA45UjSVPal1r96bqfIuoyZ4RX9jY",
    authDomain: "blogging-platform-6fc44.firebaseapp.com",
    projectId: "blogging-platform-6fc44",
    storageBucket: "blogging-platform-6fc44.firebasestorage.app",
    messagingSenderId: "850137845839",
    appId: "1:850137845839:web:ddeb79194b5fef001a9a3a",
    measurementId: "G-9JDYTBHNCE"
};

// Initialize Firebase
let firebaseApp = null;
let db = null;
let auth = null;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith('AIzaSy');
};

// Check if user is logged in
const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        if (auth) {
            auth.onAuthStateChanged((user) => {
                resolve(user);
            }, reject);
        } else {
            resolve(null);
        }
    });
};

// Get current user synchronously - use function to get the latest value
const getCurrentAuthUser = () => {
    return auth ? auth.currentUser : null;
};

// Sign out function
const signOutUser = () => {
    if (auth) {
        return auth.signOut();
    }
    return Promise.reject(new Error('Auth not initialized'));
};

// Utility function to show loading
const showLoading = (element) => {
    if (element) {
        element.innerHTML = '<div class="loading-spinner">Loading...</div>';
    }
};

// Utility function to show error
const showError = (element, message) => {
    if (element) {
        element.innerHTML = '<div class="error-message">' + message + '</div>';
    }
};

