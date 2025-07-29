Real-Time Chat Application with Socket.io
Project Overview

This project is a real-time chat application built using Node.js with Express and Socket.io on the backend, and React.js for the frontend user interface. It demonstrates bidirectional communication, enabling instant messaging, online status updates, typing indicators, and other advanced chat features. The application is designed to provide a smooth, engaging user experience across different devices.

Features Implemented
This application includes a robust set of features, categorized by the assignment tasks:

Core Functionality (Task 2)
User Authentication: Simple username-based authentication allows users to join the chat with a unique identifier.

Global Chat Room: All connected users can send and receive messages in a single, public chat space.

Message Display: Messages are displayed with the sender's name and a precise timestamp.

Typing Indicators: Users see "X is typing..." notifications when others are composing a message, providing real-time feedback.

Online/Offline Status: A sidebar displays a live list of all currently online users, updating dynamically as users connect and disconnect.

Advanced Chat Features (Task 3)
Multiple Chat Rooms/Channels: [Choose ONE or more of the following and describe; delete what you didn't implement]

Private Messaging: Users can initiate one-on-one private conversations with other online users.

Multiple Public Rooms: Users can join and switch between different themed chat rooms/channels.

File/Image Sharing: Users can share small files or images directly within the chat. (Implemented using a Base64 approach for simplicity, ideal for small files).

Message Reactions: Users can react to messages with emojis (e.g., 👍, ❤️).

Read Receipts: Senders are notified when their messages have been read by recipients.

Real-Time Notifications (Task 4)
New Message Notifications: Users receive alerts when new messages arrive.

Join/Leave Notifications: System messages inform users when someone joins or leaves the chat.

Unread Message Count: The browser tab title dynamically updates to show the number of unread messages.

Sound Notifications: A distinct sound plays for new incoming messages.

Browser Notifications: System-level desktop notifications pop up for new messages when the chat tab is not in focus.

Performance and UX Optimization (Task 5)
Message Pagination: Older messages can be loaded on demand ( via a "Load More" button or infinite scroll) to improve initial load times and performance.

Reconnection Logic: Socket.io's built-in automatic reconnection handles network disconnections gracefully, maintaining a smooth user experience.

Optimized Communication: The application leverages Socket.io's features (e.g., rooms) to ensure messages are broadcast efficiently only to relevant parties.

Message Delivery Acknowledgment: Basic acknowledgment confirms messages are received by the server.

Message Search: Users can search through chat history to find specific messages or conversations.

Responsive Design: The user interface is designed to be responsive, adapting well to different screen sizes on both desktop and mobile devices.

Screenshots or GIFs
(This is a CRUCIAL section. Replace the placeholders with actual images.)

Showcase your application in action! Capture screenshots or create GIFs that highlight:

The login/join screen.

The global chat in action (messages, names, timestamps).

Online users list.

Typing indicators.

Any advanced features you implemented (e.g., private chat, file sharing, reactions).

Notifications (browser pop-up, unread count in tab).

Responsive layout on mobile (use browser dev tools for this).

Example:

A clean interface for users to enter their username and join the chat.

Demonstrates real-time message exchange, typing indicators, and the online users list.

Users can easily share images and files within the chat.

Setup Instructions
Follow these steps to get the chat application running on your local machine.

Prerequisites
Node.js: Version 18 or higher is recommended.

Download Node.js

Installation
Clone the Repository:


Install Server Dependencies:
Navigate into the server directory and install its dependencies.

Bash

cd server
npm install
Install Client Dependencies:
Navigate into the client directory and install its dependencies.

Bash

cd ../client
npm install
Running the Application
You will need two separate terminal windows (or tabs) to run the server and client concurrently.

Start the Server:
In your first terminal, navigate back to the server directory and run:

Bash

cd server
npm run dev
You should see output indicating the server is listening on port 5000 (or your configured port).

Start the Client (React App):
In your second terminal, navigate to the client directory and run:

Bash

cd client
npm run dev
This will start the React development server. It will usually open in your default browser at http://localhost:5173/ (or a similar port).

Access the Application:
Open your web browser and navigate to the URL provided by the client's npm run dev output ( http://localhost:5173/).
Open multiple tabs or use different browsers/incognito windows to simulate multiple users and test the real-time communication.

