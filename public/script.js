// Initialize the Socket.IO client
const socket = io();

// DOM Elements
const screens = {
    join: document.getElementById('join-screen'), 
    chat: document.getElementById('chat-screen')  
};

const forms = {
    join: document.getElementById('join-form'),
    chat: document.getElementById('chat-form')
};

const inputs = {
    username: document.getElementById('username-input'),
    message: document.getElementById('msg-input')
};

const containers = {
    messages: document.getElementById('messages-container'), 
    users: document.getElementById('users-list')           
};

const btnLeave = document.getElementById('leave-btn');
const errorMsg = document.getElementById('error-msg');
const sidebarHeader = document.getElementsByClassName('sidebar-header')[0];
const typingIndicator = document.getElementById('typing-indicator');

let currentUser = '';


forms.join.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload on form submit
    const name = inputs.username.value.trim();
    
    if (name) {
        // Emit 'join' event to server with the chosen username
        socket.emit('join', name); 
    }
});

// Server accepted the username
socket.on('login success', (name) => {
    currentUser = name; 
    
    // Toggle UI: Hide login screen, show chat screen
    screens.join.classList.remove('active'); 
    screens.chat.classList.add('active');
    inputs.message.focus();
    errorMsg.style.display = 'none';
});

// Server rejected the username 
socket.on('login failed', (message) => {
    errorMsg.innerText = message;
    errorMsg.style.display = 'block';
});

forms.chat.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputs.message.value.trim();
    
    if (text) {
        // Send message object to server
        // Note: We don't display it yet; we wait for the server to broadcast it back
        // to ensure all clients (including us) are in sync.
        socket.emit('chat message', { user: currentUser, text: text });
        inputs.message.value = ''; // Clear input field
    }
});

let typingTimeout = undefined;

inputs.message.addEventListener('input', () => {
    // Notify server we are typing
    socket.emit('typing'); 

    // Clear the previous timer if the user keeps typing
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Set a new timer: if no input happens for 1 second, tell server we stopped.
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing'); 
    }, 1000); 
});

// Receive a broadcasted message
socket.on('chat message', (data) => {
    // Check if the message is from me or someone else to style it differently
    const isSelf = data.user === currentUser;
    addMessageToUI(isSelf, data);
});

// Update typing indicator text
socket.on('typing', (username) => {
    typingIndicator.innerText = `${username} is typing...`;
});

// Clear typing indicator
socket.on('stop typing', (username) => {
  // Only clear if the specific user who stopped is the one currently displayed
  if (typingIndicator.innerText === `${username} is typing...`) {
      typingIndicator.innerText = '';
  }
});

// Handle administrative messages (User joined/left)
socket.on('system message', (msg) => {
    const div = document.createElement('div');
    div.classList.add('system-message');
    div.innerText = msg;
    containers.messages.appendChild(div);
    scrollToBottom();
});


// Receive the full list of active users from the server
socket.on('active users', (users) => {
    sidebarHeader.innerText = `Online (${users.length})`;
    updateUserList(users);
});


btnLeave.addEventListener('click', () => {
    // Reloading the page forces the socket to disconnect
    location.reload(); 
});

function addMessageToUI(isSelf, data) {
    const wrapper = document.createElement('div');
    
    // Add 'self' or 'other' class for CSS styling (alignment/color)
    wrapper.classList.add('message-wrapper', isSelf ? 'self' : 'other');

    // Only show the username label if it's NOT me
    const nameHtml = isSelf ? '' : `<div class="name-label">${data.user}</div>`;
    
    // Create the bubble elements
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    const msgText = document.createElement('div');
    msgText.className = 'msg-text';
    msgText.textContent = data.text; // Use textContent to prevent XSS attacks
    
    const timeStamp = document.createElement('div');
    timeStamp.className = 'time-stamp';
    timeStamp.textContent = data.time;
    
    // Assemble the DOM tree
    bubble.appendChild(msgText);
    bubble.appendChild(timeStamp);
    
    // Reset HTML before injecting (safety)
    wrapper.innerHTML = ''; 
    wrapper.innerHTML = nameHtml; 
    wrapper.appendChild(bubble);

    containers.messages.appendChild(wrapper);
    scrollToBottom();
}

function updateUserList(users) {
    containers.users.innerHTML = ''; // Clear current list
    users.forEach(user => {
        const li = document.createElement('li');
        li.innerText = user;
        // Highlight my own name in the list
        if (user === currentUser) {
            li.classList.add('me');
        }
        containers.users.appendChild(li);
    });
}

// Auto-scroll the chat container to show the newest message
function scrollToBottom() {
    containers.messages.scrollTop = containers.messages.scrollHeight;
}