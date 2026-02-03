// -----------------------------
// Firebase Config (replace with yours)
// -----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyAbP4ha6KeJZz3CLRF3mMjesxsMwi4ku-w",
  authDomain: "smart-parking-system-3706c.firebaseapp.com",
  databaseURL: "https://smart-parking-system-3706c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-parking-system-3706c",
  storageBucket: "smart-parking-system-3706c.firebasestorage.app",
  messagingSenderId: "865604086970",
  appId: "1:865604086970:web:eef7c292c097b2414f6683",
  measurementId: "G-78GQPXRFLC"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ✅ Skip login page if already signed in
auth.onAuthStateChanged(user => {
  if (user) {
    window.location.href = "booking.html";
  }
});

// -----------------------------
// Helpers
// -----------------------------
function showStatus(message, type = "info") {
  const statusEl = document.getElementById("auth-status");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = type === "error" ? "red" : "limegreen";
  }
}

function validateForm(email, password) {
  if (!email || !password) {
    showStatus("⚠ Please enter email and password.", "error");
    return false;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    showStatus("⚠ Enter a valid email address.", "error");
    return false;
  }
  if (password.length < 6) {
    showStatus("⚠ Password must be at least 6 characters.", "error");
    return false;
  }
  return true;
}

// -----------------------------
// Authentication Handlers
// -----------------------------
document.getElementById("email-signup-btn")?.addEventListener("click", () => {
  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value.trim();

  if (!validateForm(email, password)) return;

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCred => {
      showStatus("✅ Account created! Redirecting...");
      setTimeout(() => window.location.href = "booking.html", 1200); // ✅ redirect
    })
    .catch(err => showStatus(`❌ ${err.message}`, "error"));
});

document.getElementById("email-signin-btn")?.addEventListener("click", () => {
  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("password-input").value.trim();

  if (!validateForm(email, password)) return;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCred => {
      showStatus("✅ Logged in successfully! Redirecting...");
      setTimeout(() => window.location.href = "booking.html", 1200); // ✅ redirect
    })
    .catch(err => showStatus(`❌ ${err.message}`, "error"));
});

document.getElementById("google-signin-btn")?.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      showStatus("✅ Google login successful! Redirecting...");
      setTimeout(() => window.location.href = "booking.html", 1200); // ✅ redirect
    })
    .catch(err => showStatus(`❌ ${err.message}`, "error"));
});

document.getElementById("anon-signin-btn")?.addEventListener("click", () => {
  auth.signInAnonymously()
    .then(() => {
      showStatus("✅ Guest login successful! Redirecting...");
      setTimeout(() => window.location.href = "booking.html", 1200); // ✅ redirect
    })
    .catch(err => showStatus(`❌ ${err.message}`, "error"));
});

// -----------------------------
// Auth State Listener
// -----------------------------
auth.onAuthStateChanged(user => {
  const statusEl = document.getElementById("auth-status");
  if (!statusEl) return;

  if (user) {
    statusEl.textContent = `👤 Logged in as: ${user.email || "Guest"}`;
    statusEl.style.color = "limegreen";
  } else {
    statusEl.textContent = "Not logged in";
    statusEl.style.color = "red";
  }
});
