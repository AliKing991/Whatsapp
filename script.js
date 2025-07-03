// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEnL-jzxZ89rT9vdqHHNcgjSrFXtGz6ho",
  authDomain: "whats-app-4f3d7.firebaseapp.com",
  projectId: "whats-app-4f3d7",
  databaseURL: "https://whats-app-4f3d7-default-rtdb.firebaseio.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const usersRef = database.ref("users");
const messagesRef = database.ref("messages");

const submitUserButton = document.getElementById("submitUser");
const displayNameInput = document.getElementById("displayName");
const usersList = document.getElementById("users");
const chatHeader = document.getElementById("chatHeader");
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMessageButton = document.getElementById("sendMessage");

let currentUser = null;
let currentChatUser = null;

// Join chat
submitUserButton.addEventListener("click", async () => {
  const displayName = displayNameInput.value.trim();

  if (displayName) {
    currentUser = { displayName };
    await usersRef.child(displayName).set({ displayName });

    document.getElementById("currentUserName").textContent = displayName;

    displayNameInput.value = "";
    document.querySelector(".login-screen").style.display = "none";
    document.querySelector(".chat-interface").style.display = "flex";

    loadUsers();
  }
});

// Load users
function loadUsers() {
  usersRef.on("value", (snapshot) => {
    usersList.innerHTML = "";
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      if (user.displayName !== currentUser.displayName) {
        const li = document.createElement("li");
        li.textContent = user.displayName;
        li.onclick = () => openChat(user);
        usersList.appendChild(li);
      }
    });
  });
}

// Open chat
function openChat(user) {
  currentChatUser = user;
  document.getElementById("chatPartnerName").textContent = user.displayName;
  chatHeader.querySelector(".status").textContent = "Online";

  messagesContainer.innerHTML = "";
  messageInput.disabled = false;
  sendMessageButton.disabled = false;

  loadMessages();
}

// Load messages
function loadMessages() {
  const chatId = getChatId(currentUser.displayName, currentChatUser.displayName);
  messagesRef.child(chatId).on("value", (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      displayMessage(message);
    });
  });
}

// Helper to generate unique chat ID (same for both users)
function getChatId(user1, user2) {
  return [user1, user2].sort().join("_");
}

// Display message
function displayMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.classList.add(
    message.sender === currentUser.displayName ? "outgoing" : "incoming"
  );
  messageDiv.innerHTML = `
    <p>${message.text}</p>
    <span>${new Date(message.timestamp).toLocaleTimeString()}</span>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
sendMessageButton.addEventListener("click", () => {
  const messageText = messageInput.value.trim();
  if (messageText && currentChatUser) {
    const message = {
      text: messageText,
      sender: currentUser.displayName,
      timestamp: Date.now(),
    };

    const chatId = getChatId(currentUser.displayName, currentChatUser.displayName);
    messagesRef.child(chatId).push(message);
    messageInput.value = "";
  }
});
