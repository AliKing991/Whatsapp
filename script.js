// Firebase config
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

// DOM Elements
const displayNameInput = document.getElementById("displayName");
const submitUserButton = document.getElementById("submitUser");
const profilePic = document.getElementById("profilePic");
const profilePreview = document.getElementById("profilePreview");
const usersList = document.getElementById("users");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessage");
const chatPartnerName = document.getElementById("chatPartnerName");
const chatPartnerAvatar = document.getElementById("chatPartnerAvatar");
const chatHeaderStatus = document.querySelector(".status");
const messagesContainer = document.getElementById("messages");

// Login & profile pic
submitUserButton.addEventListener("click", async () => {
  const name = displayNameInput.value.trim();
  if (!name) return;

  let user = (await usersRef.child(name).get()).val();

  if (!user) {
    user = {
      displayName: name,
      photoURL: profilePreview.src,
      lastSeen: Date.now(),
    };
    await usersRef.child(name).set(user);
  }

  currentUser = user;
  currentUser.displayName = name;
  statusRef.child(name).set("online");
  document.getElementById("currentUserName").textContent = name;
  document.getElementById("currentUserAvatar").src = user.photoURL || "assets/unnamed.webp";

  document.querySelector(".login-screen").style.display = "none";
  document.querySelector(".chat-interface").style.display = "flex";

  listenForUsers();
});

// Profile preview on upload
profilePic.addEventListener("change", () => {
  const file = profilePic.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      profilePreview.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

// Load all users
function listenForUsers() {
  usersRef.on("value", (snapshot) => {
    usersList.innerHTML = "";
    snapshot.forEach((child) => {
      const user = child.val();
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
  chatPartnerAvatar.src = user.photoURL || "assets/unnamed.webp";
  messageInput.disabled = false;
  sendMessageBtn.disabled = false;

  statusRef.child(user.displayName).on("value", (snap) => {
    const val = snap.val();
    if (val === "online") chatHeaderStatus.textContent = "Online";
    else if (val?.typing) chatHeaderStatus.textContent = "Typing...";
    else if (val?.lastSeen) chatHeaderStatus.textContent = "Last seen " + new Date(val.lastSeen).toLocaleTimeString();
    else chatHeaderStatus.textContent = "Offline";
  });

  loadMessages();
}

function getChatId(user1, user2) {
  if (!user1 || !user2) return "invalid";
  return [user1.displayName, user2.displayName].sort().join("_");
}

function loadMessages() {
  const chatId = getChatId(currentUser, currentChatUser);
  messagesRef.child(chatId).on("value", (snap) => {
    messagesContainer.innerHTML = "";
    snap.forEach((msgSnap) => {
      const msg = msgSnap.val();
      displayMessage(msg, msgSnap.key);
    });
  });
}

function displayMessage(msg, id) {
  const div = document.createElement("div");
  div.className = "message " + (msg.sender === currentUser.displayName ? "outgoing" : "incoming");
  div.innerHTML = `<p>${msg.text}</p><span>${new Date(msg.timestamp).toLocaleTimeString()} ${msg.read ? '✓✓' : '✓'}</span>`;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  markAsRead(id);
}

sendMessageBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text || !currentChatUser) return;

  const chatId = getChatId(currentUser, currentChatUser);
  const msg = {
    text,
    sender: currentUser.displayName,
    timestamp: Date.now(),
    read: false,
  };

  await messagesRef.child(chatId).push(msg);
  messageInput.value = "";
});

messageInput.addEventListener("input", () => {
  const typing = messageInput.value.trim().length > 0;
  statusRef.child(currentUser.displayName).set({ typing });
  clearTimeout(window._typingTimer);
  window._typingTimer = setTimeout(() => {
    statusRef.child(currentUser.displayName).set({ lastSeen: Date.now() });
  }, 2000);
});

function markAsRead(msgId) {
  if (!currentChatUser) return;
  const chatId = getChatId(currentUser, currentChatUser);
  messagesRef.child(chatId).child(msgId).update({ read: true });
}

document.getElementById("saveNameBtn").addEventListener("click", async () => {
  const newName = document.getElementById("newNameInput").value.trim();
  const oldName = currentUser.displayName;

  if (!newName || newName === oldName) return alert("Invalid new name.");

  const exists = (await usersRef.child(newName).get()).exists();
  if (exists) return alert("Username already taken.");

  const user = {
    displayName: newName,
    photoURL: currentUser.photoURL,
    lastSeen: Date.now(),
  };

  await usersRef.child(newName).set(user);
  await usersRef.child(oldName).remove();

  const allMsgs = await messagesRef.get();
  const updates = {};
  allMsgs.forEach((snap) => {
    const key = snap.key;
    if (key.includes(oldName)) {
      const msgs = snap.val();
      const newKey = key.replace(oldName, newName).split("_").sort().join("_");
      updates[newKey] = msgs;
      updates[key] = null;
    }
  });

  await messagesRef.update(updates);
  currentUser.displayName = newName;
  document.getElementById("currentUserName").textContent = newName;
  document.getElementById("editNameBox").style.display = "none";
  listenForUsers();
});

document.addEventListener("click", (e) => {
  const settingsMenu = document.getElementById("settingsMenu");
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn.contains(e.target)) {
    settingsMenu.style.display = settingsMenu.style.display === "block" ? "none" : "block";
  } else if (!settingsMenu.contains(e.target)) {
    settingsMenu.style.display = "none";
  }
});

document.getElementById("editNameTrigger").addEventListener("click", () => {
  const box = document.getElementById("editNameBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
  document.getElementById("settingsMenu").style.display = "none";
});

document.getElementById("toggleDark").addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

window.addEventListener("beforeunload", () => {
  if (currentUser?.displayName) {
    statusRef.child(currentUser.displayName).set({ lastSeen: Date.now() });
  }
});
