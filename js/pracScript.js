// pracScript.js

// ─── Firestore Imports ────────────────────────────────────────────────────────────────────
import { doc, updateDoc, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { db } from "../backend/firebase/firebase.js";
import { fetchQuestions, updateMetaProgress } from "../backend/firebase/fetch.js";

// ─── Globals & Timer Variables ─────────────────────────────────────────────────────────────
let isPaused = false;
let timerTimeout;
let remainingTime = 10 * 60; // default 10 minutes (will be overwritten by URL param)
let currentQuestionIndex = 0;
let questions = []; // Will hold the array from Firestore

// Cache the current question set
let currentQuestions = [];

/*------------------------------------------ Date & Time Setup -------------------------------------------*/
document.addEventListener("DOMContentLoaded", function () {
  // Display today's date
  const dateText = document.querySelector(".date-text");
  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  dateText.textContent = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]}, ${today.getFullYear()}`;

  // Retrieve URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const examTitle = urlParams.get("test");
  const profileName = urlParams.get("profileName");
  const profileImg = decodeURIComponent(urlParams.get("profileImg"));
  const timeAllowed = urlParams.get("time");
  const numQuestionsParam = parseInt(urlParams.get("questions"), 10);
  const collectionId = urlParams.get("collection"); // Get collection ID from URL

  // Set exam title and profile info
  document.querySelector(".test-title").textContent = examTitle;
  document.querySelector(".username").textContent = profileName;
  console.log("Decoded Profile Image URL:", profileImg);
  document.querySelector(".profile-icon").style.backgroundImage = `url(${profileImg})`;
  document.querySelector(".test-label").textContent = "TEST NAME :";

  // Configure the timer based on the "time" URL param (e.g. "25 mins")
  const timeParts = timeAllowed.split(" ");
  const timeInMinutes = parseInt(timeParts[0], 10);
  remainingTime = timeInMinutes * 60;

  const timerDisplay = document.querySelector(".timer-display");
  function updateTimer() {
    if (!isPaused) {
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      if (remainingTime > 0) {
        remainingTime--;
        timerTimeout = setTimeout(updateTimer, 1000);
      } else {
        timerDisplay.textContent = "00:00";
      }
    }
  }
  updateTimer();

  /*------------------------------------------ Pause / Resume Logic -------------------------------------*/
  const rightContainer = document.querySelector(".right-container");
  const pauseBtn = document.querySelector(".pause-btn");
  const pauseText = document.querySelector(".pause-txt");

  rightContainer.addEventListener("click", function () {
    isPaused = !isPaused;
    const pauseModal = document.getElementById("pauseModal");

    if (isPaused) {
      document.getElementById("pausedTestTitle").textContent = document.querySelector(".test-title").textContent;
      clearTimeout(timerTimeout);
      pauseBtn.src = "assets/img/play-btn.png";
      pauseText.textContent = "Resume";
      rightContainer.classList.add("paused");

      pauseModal.style.display = "flex";
      document.body.classList.add("quiz-paused");
    } else {
      updateTimer();
      pauseBtn.src = "assets/img/pause-btn.png";
      pauseText.textContent = "Pause";
      rightContainer.classList.remove("paused");

      pauseModal.style.display = "none";
      document.body.classList.remove("quiz-paused");
    }
  });

  document.getElementById("resumeBtn").addEventListener("click", function () {
    isPaused = false;
    document.getElementById("pauseModal").style.display = "none";
    document.body.classList.remove("quiz-paused");
    pauseBtn.src = "assets/img/pause-btn.png";
    pauseText.textContent = "Pause";
    rightContainer.classList.remove("paused");
    updateTimer();
  });

 

  /*------------------------------------------ Load Questions From Firestore --------------------------------*/
  loadQuestions(numQuestionsParam, collectionId); // Pass collectionId to loadQuestions
 /*-------------------------------Submit Button --------------------------------------*/
 // Find your custom "Submit" div by its class:
const quickSubmitDiv = document.querySelector(".quickSubmitBtn");
if (quickSubmitDiv) {
  quickSubmitDiv.addEventListener("click", () => {
    const submitModal = document.getElementById("submitModal");
    if (submitModal) {
      submitModal.style.display = "flex";
      // Pause the quiz (so timer stops) while the modal is open:
      document.body.classList.add("quiz-paused");
    }
  });
}

// (Optional) Keep your "click outside to close" logic, so that clicking outside the modal hides it:
window.addEventListener("click", (event) => {
  const submitModal = document.getElementById("submitModal");
  if (submitModal && event.target === submitModal) {
    submitModal.style.display = "none";
    document.body.classList.remove("quiz-paused");
  }
});

  /*------------------------------------------ Submit Button Logic -------------------------------------------*/
  const finalSubmitBtn = document.getElementById("finalSubmitBtn");
  finalSubmitBtn.addEventListener("click", async function () {
    const resultStats = document.querySelector(".result-stats");
    const submitBtn = this;

    // 1) First click: show correct/wrong breakdown
    if (!submitBtn.dataset.showResults) {
      const correctCount = questions.filter((q) => q.answeredStatus === "correct").length;
      const wrongCount = questions.filter((q) => q.answeredStatus === "wrong").length;

      document.getElementById("correctCount").textContent = correctCount;
      document.getElementById("wrongCount").textContent = wrongCount;
      resultStats.style.display = "block";

      submitBtn.textContent = "Confirm Submission";
      submitBtn.dataset.showResults = "true";
      return;
    }

    // 2) Second click: update Firestore for each answered question using batch
    try {
      const collectionId = new URLSearchParams(window.location.search).get("collection");
      const batch = writeBatch(db);
      let answeredCount = 0;

      for (const q of questions) {
        if (q.answeredStatus === "correct" || q.answeredStatus === "wrong") {
          const questionDocRef = doc(db, collectionId, q.id);
          batch.update(questionDocRef, { answeredStatus: q.answeredStatus });
          answeredCount++;
        }
      }
      await batch.commit();

      // Update meta collection with the new answered count
      await updateMetaProgress(collectionId, answeredCount);

      window.location.href = "index.html";
    } catch (error) {
      console.error("Error submitting test:", error);
      alert("There was an error saving your progress. Please try again.");
    }
  });
});



/*------------------------------------------ Fetch & Slice Questions --------------------------------------*/
async function loadQuestions(numQuestionsParam, collectionId) {
  try {
    // Check if we already have questions loaded
    if (currentQuestions.length > 0) {
      displayQuestion(currentQuestions[currentQuestionIndex]);
      return;
    }

    console.log(`Loading questions from collection: ${collectionId}`);
    questions = await fetchQuestions(collectionId, numQuestionsParam);
    currentQuestions = questions;

    if (questions.length === 0) {
      console.log("No questions available to display.");
      return;
    }

    console.log("Questions loaded successfully:", questions);
    displayQuestion(questions[currentQuestionIndex]);
  } catch (error) {
    console.error("Error loading questions:", error);
    if (error.code === 'resource-exhausted') {
      alert('Service temporarily unavailable. Please try again in a few minutes.');
    } else {
      alert("There was an error loading questions. Please try again.");
    }
  }
}

/*------------------------------------------ Display a Single Question --------------------------------------*/
function displayQuestion(question = {}) {
  const questionNumberEl = document.querySelector(".question-number");
  const questionTextEl = document.querySelector(".question-text");
  const examNameEl = document.querySelector(".exam-name");
  const optionsWrapper = document.getElementById("options-wrapper");
  const correctAnswerText = document.querySelector(".correct-answer-text");
  const explanationText = document.querySelector(".explanation-text");
  const solutionBox = document.querySelector(".solution-box");

  // Show or hide the solution box depending on answeredStatus
  solutionBox.style.display = question.answeredStatus ? "block" : "none";

  // Clear previous content
  questionNumberEl.textContent = "";
  questionTextEl.textContent = "";
  examNameEl.textContent = "";
  optionsWrapper.innerHTML = "";
  correctAnswerText.textContent = "";
  explanationText.textContent = "";

  // Set question details (display the real Firestore questionNumber)
  if (question.questionNumber !== undefined) {
    questionNumberEl.textContent = `Question No: ${question.questionNumber}`;
  }
  if (question.questionText) {
    questionTextEl.textContent = question.questionText;
  }
  if (question.examName) {
    examNameEl.textContent = question.examName;
  }

  // If already answered, restore solution box contents
  if (question.answeredStatus) {
    const correctIdx = question.correctAnswer.charCodeAt(0) - 65;
    correctAnswerText.textContent = `(${question.correctAnswer}) ${question.options[correctIdx]}`;
    explanationText.textContent = question.explanation;
  }

  // Track whether an option has been selected
  let optionSelected = !!question.answeredStatus;

  /*------------------------------------------ Build Option Buttons ---------------------------------*/
  if (question.options) {
    question.options.forEach((optionText, index) => {
      const optionLetter = String.fromCharCode(65 + index); // "A", "B", "C", "D"
      const optionContainer = document.createElement("div");
      optionContainer.className = "options-container";
      optionContainer.dataset.option = optionLetter;

      const letterDiv = document.createElement("div");
      letterDiv.className = "option";
      letterDiv.textContent = optionLetter;

      const textDiv = document.createElement("div");
      textDiv.className = "option-text";
      textDiv.textContent = optionText;

      optionContainer.appendChild(letterDiv);
      optionContainer.appendChild(textDiv);
      optionsWrapper.appendChild(optionContainer);

      // Hover effects (only if not yet answered)
      optionContainer.addEventListener("mouseover", () => {
        if (!optionSelected) optionContainer.style.backgroundColor = "#ccc";
      });
      optionContainer.addEventListener("mouseout", () => {
        if (!optionSelected) optionContainer.style.backgroundColor = "white";
      });

      // Click handler to select an option
      optionContainer.addEventListener("click", () => {
        if (optionSelected) return; // Prevent re‐click
        optionSelected = true;

        // Disable all option clicks
        document.querySelectorAll(".options-container").forEach((opt) => {
          opt.style.pointerEvents = "none";
          opt.classList.remove("correct-answer", "wrong-answer");
        });

        // Check the answer and show solution
        checkAnswer(optionContainer, question.correctAnswer, question);
        solutionBox.style.display = "block";
      });

      // If question was already answered, immediately highlight correct/wrong
      if (question.answeredStatus) {
        const isCorrect = optionLetter === question.correctAnswer;
        const wasSelected = optionLetter === question.selectedAnswer;
        if (wasSelected || isCorrect) {
          optionContainer.classList.add(isCorrect ? "correct-answer" : wasSelected ? "wrong-answer" : "");
        }
        optionContainer.style.pointerEvents = "none";
      }
    });
  }

  /*------------------------------------------ Build Footer Navigation ----------------------------------*/
  const footerNav = document.querySelector(".footer-nav");
  footerNav.innerHTML = "";

  // Determine a sliding window of up to 25 nav bullets
  let startIndex = Math.max(0, currentQuestionIndex - 12);
  if (currentQuestionIndex + 12 >= questions.length) {
    startIndex = Math.max(0, questions.length - 25);
  }
  const endIndex = Math.min(startIndex + 25, questions.length);

  questions.forEach((q, idx) => {
    if (idx >= startIndex && idx < endIndex) {
      const numberBtn = document.createElement("div");
      numberBtn.className = `nav-question-number ${idx === currentQuestionIndex ? "current" : ""}`;
      numberBtn.dataset.questionIndex = idx;

      if (q.answeredStatus) {
        numberBtn.classList.add(q.answeredStatus);
      }

      // Show the array-index + 1 in the bullet (you could also show q.questionNumber if you prefer)
      numberBtn.textContent = idx + 1;

      numberBtn.addEventListener("click", () => {
        currentQuestionIndex = idx;
        displayQuestion(questions[currentQuestionIndex]);
      });

      footerNav.appendChild(numberBtn);
    }
  });

  // Auto‐scroll the footer nav so the current question is centered
  const containerWidth = footerNav.offsetWidth;
  const scrollPosition = (currentQuestionIndex - startIndex) * (containerWidth / 25);
  footerNav.scrollTo({
    left: scrollPosition,
    behavior: "smooth"
  });
}

/*------------------------------------------ Answer Checking ----------------------------------------------*/
function checkAnswer(selectedOption, correctAnswer, question) {
  question.selectedAnswer = selectedOption.dataset.option;

  // Show correct answer + explanation
  document.querySelector(".correct-answer-text").textContent = `(${correctAnswer}) ${
    question.options[correctAnswer.charCodeAt(0) - 65]
  }`;
  document.querySelector(".explanation-text").textContent = question.explanation;

  if (selectedOption.dataset.option === correctAnswer) {
    selectedOption.classList.add("correct-answer");
    question.answeredStatus = "correct";
  } else {
    selectedOption.classList.add("wrong-answer");
    document.querySelectorAll(".options-container").forEach((opt) => {
      if (opt.dataset.option === correctAnswer) {
        opt.classList.add("correct-answer");
      }
    });
    question.answeredStatus = "wrong";
  }

  updateNavIndicator(currentQuestionIndex);

  // If this was the last question in the batch, show the submit modal
  if (currentQuestionIndex === questions.length - 1) {
    const submitModal = document.getElementById("submitModal");
    submitModal.style.display = "flex";
    document.body.classList.add("quiz-paused");
  }
}

/*------------------------------------------ Update Footer Bullet Color --------------------------------*/
function updateNavIndicator(index) {
  const navNumbers = document.querySelectorAll(".nav-question-number");
  const q = questions[index];

  navNumbers.forEach((nav) => {
    if (parseInt(nav.dataset.questionIndex, 10) === index) {
      nav.classList.remove("correct", "wrong");
      if (q.answeredStatus) {
        nav.classList.add(q.answeredStatus);
      }
    }
  });
}

/*------------------------------------------ Prev / Next Buttons -------------------------------------------*/
document.querySelector(".back-btn").addEventListener("click", () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion(questions[currentQuestionIndex]);
  }
});
document.querySelector(".next-btn").addEventListener("click", () => {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    displayQuestion(questions[currentQuestionIndex]);
  }
});
