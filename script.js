// Firebase configuration
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBEnL-jzxZ89rT9vdqHHNcgjSrFXtGz6ho",
    authDomain: "whats-app-4f3d7.firebaseapp.com",
    projectId: "whats-app-4f3d7",
    storageBucket: "whats-app-4f3d7.firebasestorage.app",
    messagingSenderId: "932188834949",
    appId: "1:932188834949:web:2c73cf9c6ec1d8e587adec",
    measurementId: "G-JR5G402M8E"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

const usersRef = database.ref('users');
const messagesRef = database.ref('messages');

const submitUser Button = document.getElementById('submitUser');
const displayNameInput = document.getElementById('displayName');
const profilePicInput = document.getElementById('profilePic');
const usersList = document.getElementById('users');
const chatHeader = document.getElementById('chatHeader');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessage');

let currentUser  = null;
let currentChatUser  = null;

// Join chat
submitUser Button.addEventListener('click', async () => {
    const displayName = displayNameInput.value.trim();
    const profilePicFile = profilePicInput.files[0];

    if (displayName && profilePicFile) {
        const profilePicRef = storage.ref(`profile_pics/${displayName}.jpg`);
        await profilePicRef.put(profilePicFile);
        const profilePicURL = await profilePicRef.getDownloadURL();

        currentUser  = { displayName, profilePicURL };
        await usersRef.child(displayName).set({ displayName, profilePicURL });

        displayNameInput.value = '';
        profilePicInput.value = '';
        document.querySelector('.user-form').style.display = 'none';
        document.querySelector('.chat-container').style.display = 'flex';

        loadUsers();
    }
});

// Load users
function loadUsers() {
    usersRef.on('value', (snapshot) => {
        usersList.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.displayName !== currentUser .displayName) {
                const li = document.createElement('li');
                li.textContent = user.displayName;
                li.onclick = () => openChat(user);
                usersList.appendChild(li);
            }
        });
    });
}

// Open chat
function openChat(user) {
    currentChatUser  = user;
    chatHeader.textContent = `Chat with ${user.displayName}`;
    messagesContainer.innerHTML = '';
    messageInput.disabled = false;
    sendMessageButton.disabled = false;

    loadMessages();
}

// Load messages
function loadMessages() {
    const chatPath = `${currentUser .displayName}_${currentChatUser .displayName}`;
    messagesRef.child(chatPath).on('value', (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            displayMessage(message);
        });
    });
}

// Display message
function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(message.sender === currentUser .displayName ? 'outgoing' : 'incoming');
    messageDiv.innerHTML = `
        <p>${message.text}</p>
        <span>${new Date(message.timestamp).toLocaleTimeString()}</span>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message
sendMessageButton.addEventListener('click', () => {
    const messageText = messageInput.value.trim();
    if (messageText && currentChatUser ) {
        const message = {
            text: messageText,
            sender: currentUser .displayName,
            timestamp: Date.now()
        };

        const chatPath = `${currentUser .displayName}_${currentChatUser .displayName}`;
        messagesRef.child(chatPath).push(message);
        messageInput.value = '';
    }
});
