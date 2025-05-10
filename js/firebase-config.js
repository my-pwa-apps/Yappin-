// Firebase Configuration

const firebaseConfig = {
    apiKey: "AIzaSyC9Uq8vj0-b7vgwqHcqKuLAPcZW5QlPpOw",
    authDomain: "yappin-d355d.firebaseapp.com",
    databaseURL: "https://yappin-d355d-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "yappin-d355d",
    storageBucket: "yappin-d355d.firebasestorage.app",
    messagingSenderId: "703937348268",
    appId: "1:703937348268:web:dab16bf3f6ea68f4745509",
    measurementId: "G-74H0280Q4F"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase references to use in other scripts
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Function to generate unique IDs (similar to Firebase's push IDs)
function generateId() {
    const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
    let id = '';
    for (let i = 0; i < 20; i++) {
        id += PUSH_CHARS.charAt(Math.floor(Math.random() * 64));
    }
    return id;
}
