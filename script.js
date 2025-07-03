// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEnL-jzxZ89rT9vdqHHNcgjSrFXtGz6ho",
  authDomain: "whats-app-4f3d7.firebaseapp.com",
  projectId: "whats-app-4f3d7",
  databaseURL: "https://whats-app-4f3d7-default-rtdb.firebaseio.com"
};

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

submitUserButton.addEventListener("click", async () => {
  const displayName = displayNameInput.value.trim();
  if (!displayName) return;

  const userSnapshot = await usersRef.child(displayName).get();
  if (userSnapshot.exists()) {
    currentUser = userSnapshot.val();
  } else {
    currentUser = {
      displayName,
      photoURL: "assets/unnamed.webp"
    };
    await usersRef.child(displayName).set(currentUser);
  }

  document.getElementById("currentUserName").textContent = currentUser.displayName;
  document.getElementById("currentUserAvatar").src = currentUser.photoURL;
  displayNameInput.value = "";
  document.querySelector(".login-screen").style.display = "none";
  document.querySelector(".chat-interface").style.display = "flex";
  loadUsers();
});

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

function openChat(user) {
  currentChatUser = user;
  document.getElementById("chatPartnerName").textContent = user.displayName;
  document.getElementById("chatPartnerAvatar").src = user.photoURL || "assets/unnamed.webp";
  chatHeader.querySelector(".status").textContent = "Online";
  messagesContainer.innerHTML = "";
  messageInput.disabled = false;
  sendMessageButton.disabled = false;
  loadMessages();
}

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

function getChatId(user1, user2) {
  if (!user1 || !user2 || !user1.displayName || !user2.displayName) return "invalid_chat_id";
  return [user1.displayName, user2.displayName].sort().join("_");
}

function displayMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.classList.add(message.sender === currentUser.displayName ? "outgoing" : "incoming");
  messageDiv.innerHTML = `
    <p>${message.text}</p>
    <span>${new Date(message.timestamp).toLocaleTimeString()} ✓✓</span>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

sendMessageButton.addEventListener("click", () => {
  const messageText = messageInput.value.trim();
  if (!messageText) return;

  if (!currentUser || !currentChatUser) return alert("Please select a user to chat.");

  const chatId = getChatId(currentUser, currentChatUser);
  if (chatId === "invalid_chat_id") return alert("Invalid chat session.");

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
      console.error("Message send error:", error);
    });
});

// Edit name
const editNameTrigger = document.getElementById("editNameTrigger");
const saveNameBtn = document.getElementById("saveNameBtn");
const editNameBox = document.getElementById("editNameBox");

editNameTrigger.addEventListener("click", () => {
  editNameBox.style.display = editNameBox.style.display === "block" ? "none" : "block";
});

saveNameBtn.addEventListener("click", async () => {
  const newName = document.getElementById("newNameInput").value.trim();
  const oldName = currentUser.displayName;

  if (!newName || newName === oldName) return alert("Please enter a different name.");

  const snapshot = await usersRef.child(newName).get();
  if (snapshot.exists()) return alert("This name already exists.");

  await usersRef.child(newName).set({ ...currentUser, displayName: newName });
  await usersRef.child(oldName).remove();

  const allMessagesSnapshot = await messagesRef.get();
  const updates = {};
  allMessagesSnapshot.forEach((chatSnap) => {
    const key = chatSnap.key;
    if (key.includes(oldName)) {
      const messages = chatSnap.val();
      const newChatId = key.replace(oldName, newName).split("_").sort().join("_");
      updates[newChatId] = messages;
      updates[key] = null;
    }
  });
  await messagesRef.update(updates);

  currentUser.displayName = newName;
  document.getElementById("currentUserName").textContent = newName;
  editNameBox.style.display = "none";
  loadUsers();
});

// Dark mode toggle
const toggleDarkBtn = document.getElementById("toggleDark");
toggleDarkBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
