const ctx = document.querySelector('.activity-chart');
const ctx2 = document.querySelector('.prog-chart');
/*----------------------------------------------------------------------------*/

// Import the new function
import { getCollectionProgress  } from "../backend/firebase/fetch.js";

// Updated event listeners with proper selector
document.querySelectorAll('.tabs .start-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
        e.preventDefault();
        const examCard = this.closest('.tabs');
        const examName = examCard.querySelector('.details h4').innerText;
        openModal(examName);
    });
});

// Make startTest function available globally
window.startTest = function() {
    const numQuestions = document.getElementById('questionCount').value;
    const examTitle = document.getElementById('examTitle').textContent;
    const timeAllowed = document.getElementById('timeAllowed').textContent;
    const collectionId = document.getElementById('testModal').dataset.collection;

    const profileName = document.querySelector('.profile a').textContent;
    const profileImg = document.querySelector('.profile img').src;

    window.location.href = `practice.html?test=${encodeURIComponent(examTitle)}&time=${encodeURIComponent(timeAllowed)}&questions=${numQuestions}&profileName=${encodeURIComponent(profileName)}&profileImg=${encodeURIComponent(profileImg)}&collection=${encodeURIComponent(collectionId)}`;
    closeModal();
};

// Function to get all collections progress
async function getAllCollectionsProgress() {
  const collections = [
    { id: "spot_the_error", name: "Spot the Error" },
    { id: "sentence_improvement", name: "Sentence Improvement" },
    { id: "trigonometry", name: "Trigonometry" },
    { id: "geography", name: "Geography" }
  ];

  try {
    const progressData = await Promise.all(
      collections.map(async (collection) => {
        const progress = await getCollectionProgress(collection.id);
        return {
          ...collection,
          ...progress
        };
      })
    );
    return progressData;
  } catch (error) {
    console.error('Error getting collections progress:', error);
    return [];
  }
}

// Function to update the practice sets with real data
async function updatePracticeSets() {
  try {
    const progressData = await getAllCollectionsProgress();
    const setList = document.querySelector('.set-list');
    
    // Clear existing sets
    setList.innerHTML = '';
    
    // Create new sets based on Firestore data
    progressData.forEach(set => {
      const setHtml = `
        <div class="tabs">
          <div class="left">
            <div class="icon">
              <i class='bx bx-book-alt'></i>
            </div>
            <div class="details">
              <H4>${set.name}</H4>
              <p>${set.answeredQuestions}/${set.totalQuestions} Questions</p>
            </div>
          </div>
          <div class="middle">
            <h5>${set.progress}% Finished</h5>
            <div class="progress-bar">
              <div class="bar" style="width: ${set.progress}%;"></div>
            </div>
          </div>
          <div class="right">
            <button class="start-btn" data-collection="${set.id}">
              <i class='bx bx-play'></i> Start
            </button>
          </div>
        </div>
      `;
      setList.innerHTML += setHtml;
    });

    // Add event listeners to the new buttons
    document.querySelectorAll('.start-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const collectionId = this.dataset.collection;
        const examName = this.closest('.tabs').querySelector('.details h4').innerText;
        openModal(examName, collectionId);
      });
    });
  } catch (error) {
    console.error('Error updating practice sets:', error);
  }
}

// Modified openModal function to include collection ID
function openModal(examName, collectionId) {
    const modal = document.getElementById('testModal');
    modal.querySelector('#examTitle').textContent = examName;
    modal.dataset.collection = collectionId; // Store collection ID in modal
    modal.style.display = 'flex';
    updateTimeAndMarks();
}

// Modified closeModal function
function closeModal() {
    document.getElementById('testModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('testModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Add event listener for dropdown change
document.getElementById('questionCount').addEventListener('change', updateTimeAndMarks);

function updateTimeAndMarks() {
    const questionCount = document.getElementById('questionCount');
    const timeAllowed = document.getElementById('timeAllowed');
    const totalMarks = document.getElementById('totalMarks');
  
    const dataMapping = {
      "25": { time: "15 mins", marks: "50" },
      "50": { time: "25 mins", marks: "100" },
      "75": { time: "40 mins", marks: "150" },
      "100": { time: "50 mins", marks: "200" }
    };
  
    timeAllowed.textContent = dataMapping[questionCount.value].time;
    totalMarks.textContent = dataMapping[questionCount.value].marks;
}

/*------------------------------------------------------------------------------------*/

// Add event listener for the start test button
document.addEventListener('DOMContentLoaded', () => {
    const startTestBtn = document.getElementById('startTestBtn');
    if (startTestBtn) {
        startTestBtn.addEventListener('click', startTest);
    }
    
    updatePracticeSets();
    // ... rest of your existing DOMContentLoaded code ...
});

/*------------------------------------------------------------------------------------*/

new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], // Change to 5 days
        datasets: [{
            label: 'Questions',
            data: [10, 50, 75, 100, 125, 150],
            backgroundColor: 'rgba(255, 166, 0, 0.93)', // Orange color
            /*borderWidth: 3,*/
            borderRadius: 6,
            hoverBackgroundColor: '#60a5fa'
        }]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                border: {
                    display: true
                },
                grid: {
                    display: true,
                    color: '#1e293b'
                }
            },
            y: {
                beginAtZero: true,
                max: 150, // Set max to 150
                ticks: {
                    stepSize: 50 // 50, 100, 150
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuad',
        }
    }
});

new Chart(ctx2, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
            label: 'Class GPA',
            data: [6, 10, 8, 14, 6, 7, 4],
            borderColor: '#0891b2',
            tension: 0.4
        },
        {
            label: 'Aver GPA',
            data: [8, 6, 7, 6, 11, 8, 10],
            borderColor: '#ca8a04',
            tension: 0.4
        }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            x: {
                grid: {
                    display: false,
                }
            },
            y: {
                ticks: {
                    display: false
                },
                border: {
                    display: false,
                    dash: [5, 5]
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuad',
        }
    }
});