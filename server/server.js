// client/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; // Assuming you have some basic CSS

// Connect to the Socket.io server
const socket = io('http://localhost:5000'); // Replace with your server URL

function App() {
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]); // Stores { sender, message, timestamp, id }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);

  const messagesEndRef = useRef(null); // Ref for auto-scrolling messages

  // Auto-scroll to the bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Scroll to bottom whenever messages update
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Event listener for successful connection
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    // Event listener for disconnection
    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
      setLoggedIn(false); // Reset login state on disconnect
      setUsername('');
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers([]);
    });

    // Event listener for receiving messages
    socket.on('receive_message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Event listener for user joining the chat (successful login)
    socket.on('joined_chat', (user) => {
      setLoggedIn(true);
      console.log(`Successfully joined chat as ${user}`);
    });

    // Event listener for join errors
    socket.on('join_error', (errorMsg) => {
      alert(`Join Error: ${errorMsg}`); // Using alert for simplicity, replace with a custom modal
      setLoggedIn(false);
    });

    // Event listener for user joined notification
    socket.on('user_joined', (data) => {
      setMessages((prevMessages) => [...prevMessages, {
        sender: 'System',
        message: `${data.username} has joined the chat.`,
        timestamp: data.timestamp,
        id: 'system'
      }]);
    });

    // Event listener for user left notification
    socket.on('user_left', (data) => {
      setMessages((prevMessages) => [...prevMessages, {
        sender: 'System',
        message: `${data.username} has left the chat.`,
        timestamp: data.timestamp,
        id: 'system'
      }]);
    });

    // Event listener for online users list update
    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    // Event listener for typing status updates
    socket.on('typing_status', (usersTyping) => {
      setTypingUsers(usersTyping.filter(u => u !== username)); // Filter out current user
    });

    // Clean up event listeners on component unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
      socket.off('joined_chat');
      socket.off('join_error');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('online_users');
      socket.off('typing_status');
    };
  }, [username]); // Dependency on username to re-run effect when username changes (e.g., after logout)

  const handleLogin = () => {
    if (username.trim()) {
      socket.emit('join_chat', username.trim());
    } else {
      alert('Please enter a username to join the chat.');
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', { message });
      setMessage(''); // Clear input after sending
      socket.emit('typing', false); // Stop typing after sending message
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim().length > 0) {
      socket.emit('typing', true);
    } else {
      socket.emit('typing', false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="App p-4 flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="login-container bg-white p-8 rounded-lg shadow-xl w-full max-w-sm text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-6">Join Chat</h1>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleLogin();
            }}
          />
          <button
            onClick={handleLogin}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md transition duration-300 ease-in-out shadow-md w-full"
          >
            Join Chat
          </button>
          <p className={`mt-4 text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            Server Status: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App p-4 flex flex-col md:flex-row h-screen bg-gray-100 font-sans">
      {/* Sidebar for Online Users */}
      <div className="sidebar w-full md:w-1/4 bg-white p-4 rounded-lg shadow-lg mb-4 md:mb-0 md:mr-4 flex flex-col">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Online Users ({onlineUsers.length})</h2>
        <ul className="flex-grow overflow-y-auto">
          {onlineUsers.length === 0 ? (
            <p className="text-gray-500 text-sm">No other users online.</p>
          ) : (
            onlineUsers.map((user, index) => (
              <li key={index} className="flex items-center py-1 text-gray-700">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                {user} {user === username && <span className="text-xs text-blue-500 ml-1">(You)</span>}
              </li>
            ))
          )}
        </ul>
        <div className="mt-auto pt-4 border-t">
          <p className="text-sm text-gray-600">Logged in as: <span className="font-bold text-blue-700">{username}</span></p>
          <p className={`mt-1 text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            Server Status: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="chat-container flex-grow bg-white p-6 rounded-lg shadow-lg flex flex-col">
        <h1 className="text-3xl font-bold text-blue-600 mb-4 text-center border-b pb-2">Global Chat Room</h1>

        <div className="messages-window flex-grow overflow-y-auto mb-4 p-2 border border-gray-200 rounded-md bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">No messages yet. Start typing!</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-3 ${msg.id === socket.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                    msg.id === socket.id
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : msg.sender === 'System'
                      ? 'bg-gray-200 text-gray-700 text-sm italic rounded-md'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.sender !== 'System' && (
                    <div className={`font-semibold text-sm mb-1 ${msg.id === socket.id ? 'text-blue-100' : 'text-gray-600'}`}>
                      {msg.sender}
                    </div>
                  )}
                  <p className="break-words">{msg.message}</p>
                  <div className={`text-xs mt-1 ${msg.id === socket.id ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} /> {/* For auto-scrolling */}
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="text-sm text-gray-600 mb-2">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.join(', ')} are typing...`}
          </div>
        )}

        {/* Message Input */}
        <div className="message-input flex">
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
            placeholder="Type your message..."
            className="flex-grow p-3 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-r-md transition duration-300 ease-in-out shadow-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
