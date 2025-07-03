// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBEnL-jzxZ89rT9vdqHHNcgjSrFXtGz6ho",
  authDomain: "whats-app-4f3d7.firebaseapp.com",
  projectId: "whats-app-4f3d7",
  databaseURL: "https://whats-app-4f3d7-default-rtdb.firebaseio.com",
};
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const usersRef = db.ref("users");
const messagesRef = db.ref("messages");

let currentUser = null;
let currentChatUser = null;

// DOM Elements
const submitUserButton = document.getElementById("submitUser");
const displayNameInput = document.getElementById("displayName");
const usersList = document.getElementById("users");
const messageInput = document.getElementById("messageInput");
const sendMessageButton = document.getElementById("sendMessage");
const currentUserName = document.getElementById("currentUserName");
const chatHeader = document.getElementById("chatHeader");
const chatPartnerName = document.getElementById("chatPartnerName");
const messagesContainer = document.getElementById("messages");
const toggleDark = document.getElementById("toggleDark");

// Login/Register
submitUserButton.addEventListener("click", async () => {
  const name = displayNameInput.value.trim();
  if (!name) return;

  const snap = await usersRef.child(name).get();
  if (snap.exists()) {
    currentUser = snap.val();
  } else {
    currentUser = { displayName: name };
    await usersRef.child(name).set(currentUser);
  }

  currentUserName.textContent = currentUser.displayName;
  document.querySelector(".login-screen").style.display = "none";
  document.querySelector(".chat-interface").style.display = "flex";
  loadUsers();
});

// Load users
function loadUsers() {
  usersRef.on("value", (snapshot) => {
    usersList.innerHTML = "";
    snapshot.forEach((snap) => {
      const user = snap.val();
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
  chatPartnerName.textContent = user.displayName;
  messageInput.disabled = false;
  sendMessageButton.disabled = false;
  loadMessages();
}

// Get unique chat ID
function getChatId(user1, user2) {
  if (!user1 || !user2) return "invalid_chat_id";
  return [user1.displayName, user2.displayName].sort().join("_");
}

// Load messages
function loadMessages() {
  const chatId = getChatId(currentUser, currentChatUser);
  if (chatId === "invalid_chat_id") return;

  messagesRef.child(chatId).on("value", (snapshot) => {
    messagesContainer.innerHTML = "";
    snapshot.forEach((snap) => {
      const msg = snap.val();
      displayMessage(msg);
    });
  });
}

// Display message
function displayMessage(msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.sender === currentUser.displayName ? "outgoing" : "incoming");
  div.innerHTML = `
    <p>${msg.text}</p>
    <span>${new Date(msg.timestamp).toLocaleTimeString()}</span>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
sendMessageButton.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text || !currentChatUser) return;

  const chatId = getChatId(currentUser, currentChatUser);
  const msg = {
    text,
    sender: currentUser.displayName,
    timestamp: Date.now()
  };
  messagesRef.child(chatId).push(msg).then(() => {
    messageInput.value = "";
  });
});

// Edit Username
const editTrigger = document.getElementById("editNameTrigger");
const editBox = document.getElementById("editNameBox");
const saveNameBtn = document.getElementById("saveNameBtn");

editTrigger.addEventListener("click", () => {
  editBox.style.display = editBox.style.display === "block" ? "none" : "block";
});

saveNameBtn.addEventListener("click", async () => {
  const newName = document.getElementById("newNameInput").value.trim();
  const oldName = currentUser.displayName;

  if (!newName || newName === oldName) return alert("Choose a different name.");
  const exists = await usersRef.child(newName).get();
  if (exists.exists()) return alert("Name already taken.");

  await usersRef.child(newName).set({ displayName: newName });
  await usersRef.child(oldName).remove();

  // Migrate messages
  const msgSnap = await messagesRef.get();
  const updates = {};
  msgSnap.forEach((chat) => {
    const key = chat.key;
    if (key.includes(oldName)) {
      const newKey = key.replace(oldName, newName).split("_").sort().join("_");
      updates[newKey] = chat.val();
      updates[key] = null;
    }
  });
  await messagesRef.update(updates);

  currentUser.displayName = newName;
  currentUserName.textContent = newName;
  editBox.style.display = "none";
  loadUsers();
  alert("✅ Username updated!");
});

// Dark mode toggle
toggleDark.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
