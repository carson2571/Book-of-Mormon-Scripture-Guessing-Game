import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDOw34K_9Ru8IhgvuV8nobFmOFjWI_XArU",
    authDomain: "bom-scripture-guessing-game.firebaseapp.com",
    projectId: "bom-scripture-guessing-game",
    storageBucket: "bom-scripture-guessing-game.firebasestorage.app",
    messagingSenderId: "365815623531",
    appId: "1:365815623531:web:a2bb1268d47f9a6626e62e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Saves one finished games to the "score" collection.
export async function saveScore(name, score) {
    await addDoc(collection(db, "scores"), {
        name: name,
        score: score,
        createdAt: serverTimestamp()
    });
}

// Gets the top scores, highest first.
export async function getTopScores(count = 10) {
    const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
}