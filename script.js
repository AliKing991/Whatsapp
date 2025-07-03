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

let currentUser = null;
let currentChatUser = null;
let isAdmin = false;

// UI elements
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

// Show/hide admin password field
userRole.addEventListener("change", () => {
  adminPasswordInput.style.display = userRole.value === "admin" ? "block" : "none";
});

// LOGIN + set status
submitUser.addEventListener("click", async () => {
  const name = displayNameInput.value.trim();
  const role = userRole.value;
  const pwd = adminPasswordInput.value.trim();
  if (!name) return alert("Enter a name");

  // Admin validation
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

  // Set status online
  const setStatusOnline = () => statusRef.child(name).set({ online: true, lastSeen: Date.now() });
  setStatusOnline();
  setInterval(setStatusOnline, 30000);
  window.addEventListener("beforeunload", () => {
    statusRef.child(name).set({ online: false, lastSeen: Date.now() });
  });

  loadUsers();
});

// LOAD CONTACTS + show status indicator
function loadUsers() {
  usersRef.on("value", snapshot => {
    usersList.innerHTML = "";
    snapshot.forEach(child => {
      const user = child.val();
      if (user.displayName === currentUser.displayName) return;

      let li = document.getElementById(`user-${user.displayName}`);
      if (!li) {
        li = document.createElement("li");
        li.id = `user-${user.displayName}`;
        li.onclick = () => openChat(user);
        usersList.appendChild(li);
      }

      statusRef.child(user.displayName).get().then(statSnap => {
        const stat = statSnap.val() || {};
        const online = stat.online;
        const lastSeenMin = stat.lastSeen ? Math.floor((Date.now() - stat.lastSeen)/60000) : null;

        li.innerHTML = `
          ${user.displayName}
          <span class="status-dot ${online ? 'online' : 'offline'}"></span>
        `;
        li.title = online ? "Online now" : (lastSeenMin !== null ? `Last seen ${lastSeenMin} min ago` : "");
      });
    });
  });
}

// OPEN CHAT + show partner status
function openChat(user) {
  currentChatUser = user;
  chatPartnerName.textContent = user.displayName;
  chatPartnerAvatar.src = user.photoURL || "assets/unnamed.webp";

  statusRef.child(user.displayName).on("value", snap => {
    const st = snap.val() || {};
    const online = st.online, lastSeenMin = st.lastSeen ? Math.floor((Date.now() - st.lastSeen)/60000) : null;
    document.querySelector(".status").textContent = online ? "Online" :
      (lastSeenMin !== null ? `Last seen ${lastSeenMin} min ago` : "Offline");
  });

  messageInput.disabled = false;
  sendMessage.disabled = false;
  messagesContainer.innerHTML = "";
  loadMessages();
}

// GENERATE CHAT ID
function getChatId(u1, u2) {
  if (!u1 || !u2) return "invalid_chat";
  return [u1.displayName, u2.displayName].sort().join("_");
}

// LOAD MESSAGES
function loadMessages() {
  const chatId = getChatId(currentUser, currentChatUser);
  messagesRef.child(chatId).on("value", snap => {
    messagesContainer.innerHTML = "";
    snap.forEach(child => {
      const msg = child.val();
      displayMessage(msg);
    });
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
});

// DARK MODE TOGGLE
document.getElementById("toggleDark").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// EDIT USERNAME
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

// ADMIN CONTROLS
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
