// server/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "http://localhost:5173", // IMPORTANT: Adjust if your React app runs on a different port
    methods: ["GET", "POST"]
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Socket.io Server Setup
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // IMPORTANT: Adjust if your React app runs on a different port
        methods: ["GET", "POST"]
    }
});

// --- Server-side Data Stores (for this assignment's simple state) ---
const activeUsers = new Map(); // Stores { socketId: username }
const typingUsers = new Set(); // Stores { username } of those currently typing
const messageHistory = []; // Stores all messages for pagination/search. In production, this would be a DB.

// --- Helper function to broadcast online users ---
const broadcastOnlineUsers = () => {
    io.emit('online_users', Array.from(activeUsers.values()));
};

// --- Helper function to broadcast typing status ---
const broadcastTypingStatus = () => {
    io.emit('typing_status_update', Array.from(typingUsers));
};

// --- Socket.io Connection Handling ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    // Task 2.1 & 2.5: User joins chat (authentication & online status)
    socket.on('join_chat', (username) => {
        // Prevent duplicate usernames or assign unique if needed
        let uniqueUsername = username;
        let counter = 1;
        while (Array.from(activeUsers.values()).includes(uniqueUsername)) {
            uniqueUsername = `${username}#${counter}`;
            counter++;
        }

        activeUsers.set(socket.id, uniqueUsername);
        console.log(`User ${uniqueUsername} (${socket.id}) joined the chat.`);

        // Notify others that a user joined (Task 4.2)
        socket.broadcast.emit('user_joined', { username: uniqueUsername });

        // Send the current list of online users to all clients (Task 2.5)
        broadcastOnlineUsers();

        // Send previous messages to the newly joined user (Task 5.1 - initial load)
        socket.emit('message_history', messageHistory);
    });

    // Task 2.2 & 2.3: Global chat functionality (sending/receiving messages with name/timestamp)
    socket.on('send_message', (data) => {
        // Stop typing status when a message is sent (Task 2.4)
        const username = activeUsers.get(socket.id);
        if (username && typingUsers.has(username)) {
            typingUsers.delete(username);
            broadcastTypingStatus(); // Update typing status for everyone
        }

        // Add a unique ID for read receipts and reactions (Task 3.5, 3.6)
        const messageWithId = { ...data, id: Date.now() + Math.random().toString(36).substring(7) };
        messageHistory.push(messageWithId); // Store for history/pagination (Task 5.1)

        // Broadcast the message to ALL connected clients (Task 2.2)
        io.emit('receive_message', messageWithId);
        console.log(`Message from ${data.author}: ${data.message}`);

        // Acknowledge delivery to sender (Task 5.4)
        // If the 'send_message' event includes a callback, use it:
        // callback({ status: 'ok', messageId: messageWithId.id });
    });

    // Task 2.4: Typing indicators
    socket.on('typing_start', () => {
        const username = activeUsers.get(socket.id);
        if (username && !typingUsers.has(username)) {
            typingUsers.add(username);
            broadcastTypingStatus();
        }
    });

    socket.on('typing_stop', () => {
        const username = activeUsers.get(socket.id);
        if (username && typingUsers.has(username)) {
            typingUsers.delete(username);
            broadcastTypingStatus();
        }
    });

    // Task 3.1 & 3.2: Private messaging / Multiple rooms
    // For simplicity, this example focuses on global chat and general principles.
    // Private messages would typically use socket.join() and io.to().emit()
    // For multiple rooms, you'd add a 'join_room' event and use io.to(roomName).emit()
    // Example:
    /*
    socket.on('join_room', (roomName) => {
        socket.join(roomName);
        console.log(`${activeUsers.get(socket.id)} joined room: ${roomName}`);
        io.to(roomName).emit('room_message', { author: 'System', message: `${activeUsers.get(socket.id)} joined ${roomName}` });
    });

    socket.on('send_room_message', ({ roomName, messageData }) => {
        io.to(roomName).emit('receive_room_message', messageData);
    });
    */

    // Task 3.4: File/Image Sharing (Simplified Base64 approach)
    socket.on('send_file_message', (data) => {
        // data should contain { author, fileBase64, fileName, fileType, time }
        const messageWithId = { ...data, id: Date.now() + Math.random().toString(36).substring(7), type: 'file' };
        messageHistory.push(messageWithId);
        io.emit('receive_message', messageWithId); // Use same receive_message for simplicity
        console.log(`File message from ${data.author}: ${data.fileName}`);
    });


    // Task 3.5: Read Receipts
    socket.on('message_read', ({ messageId, readerUsername }) => {
        // Find the original sender of the message
        const originalMessage = messageHistory.find(msg => msg.id === messageId);
        if (originalMessage) {
            // Find the socket ID of the original sender
            let senderSocketId = null;
            for (let [sockId, uname] of activeUsers.entries()) {
                if (uname === originalMessage.author) {
                    senderSocketId = sockId;
                    break;
                }
            }
            if (senderSocketId) {
                // Emit a private event back to the sender
                io.to(senderSocketId).emit('message_receipt_update', {
                    messageId: messageId,
                    status: 'read',
                    reader: readerUsername
                });
                console.log(`${readerUsername} read message ${messageId} from ${originalMessage.author}`);
            }
        }
    });

    // Task 3.6: Message Reactions
    socket.on('send_reaction', ({ messageId, reactorUsername, reactionEmoji }) => {
        // In a real app, you'd update reactions in a database.
        // For this example, we'll just broadcast the reaction directly.
        io.emit('receive_reaction', { messageId, reactorUsername, reactionEmoji });
        console.log(`${reactorUsername} reacted to message ${messageId} with ${reactionEmoji}`);
    });

    // Task 5.1: Message Pagination (Loading Older Messages)
    // The initial load happens on 'join_chat'. If you want separate "load more"
    // you'd add another event here, e.g., 'request_older_messages' with an offset.
    socket.on('request_older_messages', (lastMessageId) => {
        const lastIndex = messageHistory.findIndex(msg => msg.id === lastMessageId);
        const startIndex = Math.max(0, lastIndex - 20); // Get 20 messages before lastMessageId
        const olderMessages = messageHistory.slice(startIndex, lastIndex);
        socket.emit('load_older_messages', olderMessages);
        console.log(`Sent ${olderMessages.length} older messages to ${activeUsers.get(socket.id)}`);
    });

    // Task 5.4: Message Delivery Acknowledgment (Server-side part)
    // The callback is provided by the client in socket.emit('event', data, callback)
    // No explicit server-side code needed beyond calling the callback.
    // See the 'send_message' handler above where `callback({ status: 'ok' });` would go.

    // Handle Disconnection
    socket.on('disconnect', () => {
        const disconnectedUsername = activeUsers.get(socket.id);
        if (disconnectedUsername) {
            activeUsers.delete(socket.id);

            // Clean up from typing users
            if (typingUsers.has(disconnectedUsername)) {
                typingUsers.delete(disconnectedUsername);
                broadcastTypingStatus();
            }

            console.log(`User ${disconnectedUsername} (${socket.id}) disconnected.`);

            // Notify everyone a user left (Task 4.2)
            socket.broadcast.emit('user_left', { username: disconnectedUsername });

            // Send updated online users list (Task 2.5)
            broadcastOnlineUsers();
        } else {
            console.log(`User disconnected: ${socket.id} (username not found)`);
        }
    });
});

// Basic Express route (can be used for health check)
app.get('/', (req, res) => {
    res.send('Socket.io server is running!');
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});