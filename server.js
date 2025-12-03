const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

// EXPRESS and Socket.io SETUP
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const activeUsers = new Set(); 

app.use(express.static(path.join(__dirname, 'public')));

// SOCKET CONNECTION LOOP
io.on('connection', (socket) => {
    
    socket.on('join', (username) => {
        // Enforce unique usernames
        if (activeUsers.has(username)) {
            socket.emit('login failed', 'Username is already taken.');
        } else {
            activeUsers.add(username);
            socket.username = username; // Persist username in this socket session
            
            // Three distinct communication scopes:
            socket.emit('login success', username);                       // 1. To sender only
            socket.broadcast.emit('system message', `${username} joined`); // 2. To everyone else
            io.emit('active users', Array.from(activeUsers));             // 3. To everyone (sync list)
        }
    });

    socket.on('chat message', (data) => {
        // Server generates the timestamp to ensure consistency across all clients
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const day = now.getDate().toString().padStart(2, '0');
        const month = now.toLocaleString('default', { month: 'short' });
        const timeString = `${day} ${month} ${time}`;
        
        const payload = {
            user: data.user,
            text: data.text,
            time: timeString
        };
        // Broadcast to ALL clients (including sender) so everyone sees the same message state
        io.emit('chat message', payload);
    });

    // Use .broadcast so the sender doesn't see their own "is typing" message
    socket.on('typing', () => {
        socket.broadcast.emit('typing', socket.username);
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', socket.username);
    });

    socket.on('disconnect', () => {
        // Only cleanup if the user actually logged in
        if (socket.username) {
            activeUsers.delete(socket.username);
            io.emit('system message', `${socket.username} left the chat`);
            io.emit('active users', Array.from(activeUsers)); 
        }
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});