// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEnL-jzxZ89rT9vdqHHNcgjSrFXtGz6ho",
  authDomain: "whats-app-4f3d7.firebaseapp.com",
  projectId: "whats-app-4f3d7",
  databaseURL: "https://whats-app-4f3d7-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const usersRef = db.ref("users");
const messagesRef = db.ref("messages");
const statusRef = db.ref("status");

let currentUser = null;
let currentChatUser = null;

const submitUserBtn = document.getElementById("submitUser");
const displayNameInput = document.getElementById("displayName");
const userList = document.getElementById("users");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessage");

submitUserBtn.addEventListener("click", async () => {
  const name = displayNameInput.value.trim();
  if (!name) return;

  const snap = await usersRef.child(name).get();
  if (!snap.exists()) {
    await usersRef.child(name).set({ displayName: name });
  }

  currentUser = { displayName: name };
  displayNameInput.value = "";

  document.getElementById("currentUserName").textContent = name;
  document.querySelector(".login-screen").style.display = "none";
  document.querySelector(".chat-interface").style.display = "flex";

  setOnlineStatus(name);
  loadUsers();
});

function loadUsers() {
  usersRef.on("value", (snap) => {
    userList.innerHTML = "";
    snap.forEach((userSnap) => {
      const user = userSnap.val();
      if (user.displayName !== currentUser.displayName) {
        const li = document.createElement("li");
        li.textContent = user.displayName;
        li.onclick = () => openChat(user);
        userList.appendChild(li);
      }
    });
  });
}

function openChat(user) {
  currentChatUser = user;
  chatHeader.querySelector("#chatPartnerName").textContent = user.displayName;
  chatHeader.querySelector(".status").textContent = "Connecting...";
  loadTypingStatus(user.displayName);
  loadMessages();
  msgInput.disabled = false;
  sendBtn.disabled = false;
}

function getChatId(a, b) {
  return [a.displayName, b.displayName].sort().join("_");
}

function loadMessages() {
  const chatId = getChatId(currentUser, currentChatUser);
  messagesRef.child(chatId).on("value", (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach((child) => {
      const msg = child.val();
      const div = document.createElement("div");
      div.classList.add("message", msg.sender === currentUser.displayName ? "outgoing" : "incoming");
      div.innerHTML = `<p>${msg.text}</p><span>${new Date(msg.timestamp).toLocaleTimeString()} <span class="message-status">${msg.sender === currentUser.displayName ? (msg.read ? "✓✓" : "✓") : ""}</span></span>`;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

sendBtn.addEventListener("click", () => {
  const text = msgInput.value.trim();
  if (!text || !currentChatUser) return;
  const chatId = getChatId(currentUser, currentChatUser);
  const msg = {
    text,
    sender: currentUser.displayName,
    timestamp: Date.now(),
    read: false,
  };
  messagesRef.child(chatId).push(msg).then(() => {
    msgInput.value = "";
  });
});

msgInput.addEventListener("input", () => {
  const typingRef = db.ref(`typing/${getChatId(currentUser, currentChatUser)}`);
  typingRef.set(currentUser.displayName);
  setTimeout(() => typingRef.set(""), 1500);
});

function loadTypingStatus(partner) {
  const typingRef = db.ref(`typing/${getChatId(currentUser, { displayName: partner })}`);
  typingRef.on("value", (snap) => {
    const val = snap.val();
    if (val && val !== currentUser.displayName) {
      chatHeader.querySelector(".status").textContent = `${val} is typing...`;
    } else {
      updateOnlineStatus(partner);
    }
  });
}

function setOnlineStatus(user) {
  const ref = statusRef.child(user);
  ref.set("online");
  ref.onDisconnect().set(new Date().toISOString());
}

function updateOnlineStatus(user) {
  statusRef.child(user).once("value", (snap) => {
    const val = snap.val();
    if (val === "online") {
      chatHeader.querySelector(".status").textContent = "Online";
    } else {
      const lastSeen = new Date(val);
      chatHeader.querySelector(".status").textContent = `Last seen at ${lastSeen.toLocaleTimeString()}`;
    }
  });
}

// Save Username Change
const saveBtn = document.getElementById("saveNameBtn");
saveBtn.addEventListener("click", async () => {
  const newName = document.getElementById("newNameInput").value.trim();
  if (!newName || newName === currentUser.displayName) return alert("Invalid name");
  const exists = await usersRef.child(newName).get();
  if (exists.exists()) return alert("Name exists!");

  await usersRef.child(newName).set({ displayName: newName });
  await usersRef.child(currentUser.displayName).remove();

  const snapshot = await messagesRef.get();
  const updates = {};
  snapshot.forEach((snap) => {
    const key = snap.key;
    if (key.includes(currentUser.displayName)) {
      const newKey = key.replace(currentUser.displayName, newName).split("_").sort().join("_");
      updates[newKey] = snap.val();
      updates[key] = null;
    }
  });
  await messagesRef.update(updates);

  currentUser.displayName = newName;
  document.getElementById("currentUserName").textContent = newName;
  document.getElementById("editNameBox").style.display = "none";
  loadUsers();
});

// Toggle Dark Mode
const darkToggle = document.getElementById("darkToggle");
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// Notification
function showNotification(text) {
  const note = document.createElement("div");
  note.className = "notification";
  note.textContent = text;
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 4000);
}
