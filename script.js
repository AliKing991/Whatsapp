// Firebase configuration
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
const typingRef = db.ref("typingStatus");

let currentUser = null;
let currentChatUser = null;
let isAdmin = false;
let typingTimeout = null;

// UI Elements
const userRole = document.getElementById("userRole");
const adminPasswordInput = document.getElementById("adminPassword");
const submitUser = document.getElementById("submitUser");
const displayNameInput = document.getElementById("displayName");
const currentUserName = document.getElementById("currentUserName");
const currentUserAvatar = document.getElementById("currentUserAvatar");
const usersList = document.getElementById("users");
const chatPartnerName = document.getElementById("chatPartnerName");
const chatPartnerAvatar = document.getElementById("chatPartnerAvatar");
const messageInput = document.getElementById("messageInput");
const sendMessage = document.getElementById("sendMessage");
const messagesContainer = document.getElementById("messages");

// Show admin password if role selected
userRole.addEventListener("change", () => {
  adminPasswordInput.style.display = userRole.value === "admin" ? "block" : "none";
});

// LOGIN
submitUser.addEventListener("click", async () => {
  const name = displayNameInput.value.trim();
  const role = userRole.value;
  const pwd = adminPasswordInput.value.trim();

  if (!name) return alert("Enter your name");

  if (role === "admin") {
    if (pwd !== "Ali-sec") return alert("❌ Wrong admin password!");
    isAdmin = true;
    document.querySelector(".admin-controls").style.display = "flex";
  }

  const snap = await usersRef.child(name).get();
  if (snap.exists()) {
    currentUser = snap.val();
  } else {
    currentUser = { displayName: name, photoURL: "assets/unnamed.webp" };
    await usersRef.child(name).set(currentUser);
  }

  currentUserName.textContent = name;
  currentUserAvatar.src = currentUser.photoURL;
  document.querySelector(".login-screen").style.display = "none";
  document.querySelector(".chat-interface").style.display = "flex";

  // Status
  const setOnline = () => statusRef.child(name).set({ online: true, lastSeen: Date.now() });
  setOnline();
  setInterval(setOnline, 30000);
  window.addEventListener("beforeunload", () => {
    statusRef.child(name).set({ online: false, lastSeen: Date.now() });
    typingRef.child(name).remove();
  });

  loadUsers();
});

// LOAD USERS
function loadUsers() {
  usersRef.on("value", snap => {
    usersList.innerHTML = "";
    snap.forEach(child => {
      const user = child.val();
      if (user.displayName === currentUser.displayName) return;

      const li = document.createElement("li");
      li.id = `user-${user.displayName}`;
      li.onclick = () => openChat(user);

      statusRef.child(user.displayName).get().then(statusSnap => {
        const stat = statusSnap.val() || {};
        const online = stat.online;
        const lastSeen = stat.lastSeen;
        const minsAgo = lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : null;

        li.innerHTML = `
          ${user.displayName}
          <span class="status-dot ${online ? 'online' : 'offline'}"></span>
        `;
        li.title = online ? "Online" : (minsAgo !== null ? `Last seen ${minsAgo} min ago` : "");
        usersList.appendChild(li);
      });
    });
  });
}

// OPEN CHAT
function openChat(user) {
  currentChatUser = user;
  chatPartnerName.textContent = user.displayName;
  chatPartnerAvatar.src = user.photoURL || "assets/unnamed.webp";

  statusRef.child(user.displayName).on("value", snap => {
    const st = snap.val() || {};
    const online = st.online;
    const minsAgo = st.lastSeen ? Math.floor((Date.now() - st.lastSeen) / 60000) : null;
    document.querySelector(".status").textContent =
      online ? "Online" : (minsAgo !== null ? `Last seen ${minsAgo} min ago` : "Offline");
  });

  typingRef.child(user.displayName).on("value", snap => {
    const t = snap.val();
    if (t && t.to === currentUser.displayName && t.isTyping) {
      document.querySelector(".status").textContent = "Typing...";
    }
  });

  messageInput.disabled = false;
  sendMessage.disabled = false;
  messagesContainer.innerHTML = "";
  loadMessages();
}

// CHAT ID
function getChatId(u1, u2) {
  if (!u1 || !u2) return "invalid_chat";
  return [u1.displayName, u2.displayName].sort().join("_");
}

// LOAD MESSAGES
function loadMessages() {
  const chatId = getChatId(currentUser, currentChatUser);
  messagesRef.child(chatId).on("value", snap => {
    messagesContainer.innerHTML = "";
    snap.forEach(child => displayMessage(child.val()));
  });
}

// DISPLAY MESSAGE
function displayMessage(msg) {
  const div = document.createElement("div");
  div.className = "message " + (msg.sender === currentUser.displayName ? "outgoing" : "incoming");
  div.innerHTML = `
    <p>${msg.text}</p>
    <span>${new Date(msg.timestamp).toLocaleTimeString()} ✓✓</span>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// SEND MESSAGE
sendMessage.addEventListener("click", () => {
  const text = messageInput.value.trim();
  if (!text || !currentChatUser) return;
  const chatId = getChatId(currentUser, currentChatUser);
  messagesRef.child(chatId).push({
    text,
    sender: currentUser.displayName,
    timestamp: Date.now()
  });
  messageInput.value = "";
  typingRef.child(currentUser.displayName).set({ to: currentChatUser.displayName, isTyping: false });
});

// TYPING INDICATOR
messageInput.addEventListener("input", () => {
  if (!currentChatUser) return;
  typingRef.child(currentUser.displayName).set({
    to: currentChatUser.displayName,
    isTyping: true
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    typingRef.child(currentUser.displayName).set({
      to: currentChatUser.displayName,
      isTyping: false
    });
  }, 2000);
});

// DARK MODE
document.getElementById("toggleDark").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// EDIT NAME
document.getElementById("editNameTrigger").addEventListener("click", () => {
  const box = document.getElementById("editNameBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
});

document.getElementById("saveNameBtn").addEventListener("click", async () => {
  const newName = document.getElementById("newNameInput").value.trim();
  const old = currentUser.displayName;
  if (!newName || newName === old) return alert("Enter new name");
  if ((await usersRef.child(newName).get()).exists()) return alert("Name exists");

  await usersRef.child(newName).set({ ...currentUser, displayName: newName });
  await usersRef.child(old).remove();

  const allMsgs = await messagesRef.get();
  const updates = {};
  allMsgs.forEach(snap => {
    if (snap.key.includes(old)) {
      const val = snap.val();
      const newKey = snap.key.replace(old, newName).split("_").sort().join("_");
      updates[newKey] = val;
      updates[snap.key] = null;
    }
  });
  await messagesRef.update(updates);

  currentUser.displayName = newName;
  currentUserName.textContent = newName;
  document.getElementById("editNameBox").style.display = "none";
  loadUsers();
});

// ADMIN DELETE USER
document.getElementById("deleteUserBtn").addEventListener("click", async () => {
  if (!currentChatUser) return alert("Select a user");
  if (!confirm(`Delete ${currentChatUser.displayName}?`)) return;

  await usersRef.child(currentChatUser.displayName).remove();
  const allMsgs = await messagesRef.get();
  const updates = {};
  allMsgs.forEach(snap => {
    if (snap.key.includes(currentChatUser.displayName)) updates[snap.key] = null;
  });
  await messagesRef.update(updates);
  messagesContainer.innerHTML = "";
  loadUsers();
});

// ADMIN UNSEND LAST MESSAGE
document.getElementById("unsendBtn").addEventListener("click", async () => {
  if (!currentChatUser) return alert("Select chat");
  const chatId = getChatId(currentUser, currentChatUser);
  const snap = await messagesRef.child(chatId).limitToLast(1).get();

  snap.forEach(child => {
    if (child.val().sender === currentUser.displayName || isAdmin) {
      messagesRef.child(chatId).child(child.key).remove();
    }
  });
  alert("⛔ Last message unsent.");
});
