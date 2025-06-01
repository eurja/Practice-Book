// fetch.js
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

//NUMBER FETCHING START
 
async function getCollectionProgress(collectionName) {
  try {
    const metaDocRef = doc(db, "meta", collectionName);
    const metaSnap = await getDoc(metaDocRef);
    if (!metaSnap.exists()) {
      return { totalQuestions: 0, answeredQuestions: 0, progress: 0 };
    }

    const { totalQuestions, answeredQuestions } = metaSnap.data();
    const progress = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

    return { totalQuestions, answeredQuestions, progress };
  } catch (error) {
    console.error(`Error getting meta for ${collectionName}:`, error);
    return { totalQuestions: 0, answeredQuestions: 0, progress: 0 };
  }
}
//NUMBER FETCHING END

/*
// Function to get progress for a specific collection
async function getCollectionProgress(collectionName) {
  try {
    const questionsCollection = collection(db, collectionName);
    
    // Get total questions count using a limited query
    const totalQuery = query(questionsCollection, limit(1));
    const totalSnapshot = await getDocs(totalQuery);
    const totalQuestions = totalSnapshot.size;

    // Get answered questions count using a limited query
    const answeredQuery = query(
      questionsCollection,
      where("answeredStatus", "in", ["correct", "wrong"]),
      limit(1)
    );
    const answeredSnapshot = await getDocs(answeredQuery);
    const answeredQuestions = answeredSnapshot.size;

    // Calculate progress percentage
    const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return {
      totalQuestions,
      answeredQuestions,
      progress
    };
  } catch (error) {
    console.error(`Error getting progress for ${collectionName}:`, error);
    return { totalQuestions: 0, answeredQuestions: 0, progress: 0 };
  }
}
*/
// Function to update meta collection after test submission
async function updateMetaProgress(collectionName, answeredCount) {
  try {
    const metaDocRef = doc(db, "meta", collectionName);
    await updateDoc(metaDocRef, {
      answeredQuestions: increment(answeredCount)
    });
    return true;
  } catch (error) {
    console.error(`Error updating meta for ${collectionName}:`, error);
    return false;
  }
}

// Function to fetch questions from a specific collection
async function fetchQuestions(collectionName, numQuestionsParam) {
  try {
    console.log(`Fetching unanswered questions from ${collectionName}...`);

    const questionsCollection = collection(db, collectionName);
    const q = query(
      questionsCollection,
      where("answeredStatus", "==", null),
      orderBy("questionNumber", "asc"),
      limit(numQuestionsParam || 50) // Always limit the number of questions
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log(`No unanswered questions found in ${collectionName}.`);
      return [];
    }

    const questions = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    return questions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return [];
  }
}
/*
// Function to get all available collections and their progress
async function getAllCollectionsProgress() {
  const collections = [
    { id: "spot_the_error", name: "Spot the Error" },
    { id: "sentence_improvement", name: "Sentence Improvement" },
    { id: "trigonometry", name: "Trigonometry" },
    { id: "geography", name: "Geography" }
  ];

  // Increase cache duration to 30 minutes for testing
  const cachedData = localStorage.getItem('collectionsProgress');
  const cacheTime = localStorage.getItem('collectionsProgressTime');
  const now = new Date().getTime();
  
  // Use cached data if it's less than 30 minutes old
  if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 30 * 60 * 1000) {
    return JSON.parse(cachedData);
  }

  const progressData = await Promise.all(
    collections.map(async (collection) => {
      const progress = await getCollectionProgress(collection.id);
      return {
        ...collection,
        ...progress
      };
    })
  );

  localStorage.setItem('collectionsProgress', JSON.stringify(progressData));
  localStorage.setItem('collectionsProgressTime', now.toString());

  return progressData;
}*/

export { fetchQuestions, getCollectionProgress, updateMetaProgress };
