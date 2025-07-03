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

// 🔐 Login or Register
submitUserButton.addEventListener("click", async () => {
  const displayName = displayNameInput.value.trim();
  if (!displayName) return;

  const userSnapshot = await usersRef.child(displayName).get();
  if (userSnapshot.exists()) {
    // ✅ Existing user — login
    currentUser = userSnapshot.val();
  } else {
    // 🆕 New user — register
    currentUser = { displayName };
    await usersRef.child(displayName).set(currentUser);
  }

  document.getElementById("currentUserName").textContent = currentUser.displayName;
  displayNameInput.value = "";
  document.querySelector(".login-screen").style.display = "none";
  document.querySelector(".chat-interface").style.display = "flex";
  loadUsers();
});

// 📥 Load all other users
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

// 📤 Open chat with selected user
function openChat(user) {
  currentChatUser = user;
  document.getElementById("chatPartnerName").textContent = user.displayName;
  chatHeader.querySelector(".status").textContent = "Online";

  messagesContainer.innerHTML = "";
  messageInput.disabled = false;
  sendMessageButton.disabled = false;
  loadMessages();
}

// 🔄 Load messages from database
function loadMessages() {
  const chatId = getChatId(currentUser, currentChatUser);
  if (chatId === "invalid_chat_id") return;

  messagesRef.child(chatId).on("value", (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      displayMessage(message);
    });
  });
}

// 🔑 Create unique chat ID for both users
function getChatId(user1, user2) {
  if (!user1 || !user2 || !user1.displayName || !user2.displayName) {
    console.error("❌ Chat ID Error:", user1, user2);
    return "invalid_chat_id";
  }
  return [user1.displayName, user2.displayName].sort().join("_");
}

// 💬 Display single message in UI
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

// 📤 Send message
sendMessageButton.addEventListener("click", () => {
  const messageText = messageInput.value.trim();
  if (!messageText) return;

  if (!currentUser || !currentChatUser) {
    alert("Please select a user to chat.");
    return;
  }

  const chatId = getChatId(currentUser, currentChatUser);
  if (chatId === "invalid_chat_id") {
    alert("Invalid chat session.");
    return;
  }

  const message = {
    text: messageText,
    sender: currentUser.displayName,
    timestamp: Date.now(),
  };

  messagesRef.child(chatId).push(message)
    .then(() => {
      messageInput.value = "";
    })
    .catch((error) => {
      console.error("❌ Message send error:", error);
    });
});


// ✏️ Edit Username & Move Chats
document.getElementById("saveNameBtn").addEventListener("click", async () => {
  const newName = document.getElementById("newNameInput").value.trim();
  const oldName = currentUser.displayName;

  if (!newName || newName === oldName) {
    alert("Please enter a different name.");
    return;
  }

  const snapshot = await usersRef.child(newName).get();
  if (snapshot.exists()) {
    alert("This name already exists.");
    return;
  }

  // Step 1: Rename user in users node
  await usersRef.child(newName).set({ displayName: newName });
  await usersRef.child(oldName).remove();

  // Step 2: Migrate messages
  const allMessagesSnapshot = await messagesRef.get();
  const updates = {};

  allMessagesSnapshot.forEach((chatSnap) => {
    const key = chatSnap.key;

    if (key.includes(oldName)) {
      const messages = chatSnap.val();
      const newChatId = key.replace(oldName, newName).split("_").sort().join("_");
      updates[newChatId] = messages;
      updates[key] = null; // delete old
    }
  });

  await messagesRef.update(updates);

  // Step 3: Update local + UI
  currentUser.displayName = newName;
  document.getElementById("currentUserName").textContent = newName;
  document.getElementById("editNameBox").style.display = "none";
  loadUsers();

  alert("✅ Username updated & chats preserved!");
});
