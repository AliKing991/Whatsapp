// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const storage = firebase.storage();

const usersRef = database.ref('users');
const messagesRef = database.ref('messages');

const submitUser Button = document.getElementById('submitUser ');
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
