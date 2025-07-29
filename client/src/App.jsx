// client/src/App.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css'; // Import your CSS file for styles

// IMPORTANT: Adjust this URL to your server's address (localhost:5000 or deployed URL)
const socket = io.connect("http://localhost:5000");

// Path to your notification sound file in the public folder
const notificationSound = new Audio('/notification.mp3');

function App() {
    // --- Task 1: Project Setup / Core States ---
    const [username, setUsername] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [messageList, setMessageList] = useState([]); // All messages
    const [onlineUsers, setOnlineUsers] = useState([]); // Task 2.5
    const [typingUsers, setTypingUsers] = useState([]); // Task 2.4
    const [unreadCount, setUnreadCount] = useState(0); // Task 4.3
    const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] = useState(Notification.permission === 'granted'); // Task 4.5

    // Refs for scrolling and typing debounce
    const chatBodyRef = useRef(null); // For auto-scrolling (Task 5.1)
    const typingTimeoutRef = useRef(null); // For typing indicator debounce (Task 2.4)
    const [messagesLoadedCount, setMessagesLoadedCount] = useState(0); // Task 5.1

    // --- Utility Function for Time ---
    const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // --- Task 2.1: User Authentication (Simple Username-based) ---
    const joinChat = () => {
        if (username.trim() !== "") {
            socket.emit('join_chat', username.trim()); // Send username to server
            setIsLoggedIn(true);
            document.title = `Chat - ${username}`; // Set browser tab title
            requestNotificationPermission(); // Request permission on join (Task 4.5)
        }
    };

    // --- Task 4.5: Web Notifications API ---
    const requestNotificationPermission = () => {
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
            return;
        }
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                setIsNotificationPermissionGranted(permission === 'granted');
                console.log("Notification permission:", permission);
            });
        }
    };

    const showBrowserNotification = useCallback((author, message, isFile = false) => {
        if (isNotificationPermissionGranted && document.hidden) { // Only show if tab is not focused
            new Notification('New Message!', {
                body: isFile ? `${author} sent a file.` : `${author}: ${message}`,
                icon: '/vite.svg' // You can replace with your app icon
            }).onclick = () => window.focus(); // Focus tab when notification is clicked
        }
    }, [isNotificationPermissionGranted]);

    const playSoundNotification = useCallback(() => {
        if (document.hidden) { // Play sound only if tab is not focused
            notificationSound.play().catch(e => console.error("Error playing sound:", e));
        }
    }, []);

    // --- Task 2.2, 2.3, 3.4, 4.1, 4.3, 5.1 (Receiving Messages) ---
    useEffect(() => {
        // --- Socket Connection & Reconnection Logic (Task 5.2) ---
        socket.on('connect', () => {
            console.log('Socket connected!');
            if (isLoggedIn && username) {
                // Re-emit join_chat to re-authenticate and rejoin rooms/update status
                socket.emit('join_chat', username);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            // Optionally update UI to show "Disconnected, attempting to reconnect..."
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            // Re-emit any necessary join events
            if (isLoggedIn && username) {
                socket.emit('join_chat', username);
            }
        });

        // --- Initial message history load (Task 5.1) ---
        socket.on('message_history', (history) => {
            setMessageList(history);
            setMessagesLoadedCount(history.length); // Track how many messages are loaded
            // Auto-scroll to bottom after history loads
            setTimeout(() => {
                if (chatBodyRef.current) {
                    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
                }
            }, 0);
        });

        // --- Receiving general messages (Task 2.2, 2.3, 3.4, 4.1, 4.3) ---
        socket.on("receive_message", (data) => {
            // Check if message is from self (optional, for client-side echo)
            // if (data.author === username) return;

            setMessageList((list) => {
                const newList = [...list, data];
                // Task 4.3: Increment unread count if tab is hidden
                if (document.hidden) {
                    setUnreadCount(prev => prev + 1);
                    document.title = `(${unreadCount + 1}) Chat - ${username}`;
                }
                return newList;
            });

            // Task 4.1: Send notifications (sound & browser)
            if (data.author !== username) { // Don't notify for own messages
                playSoundNotification(); // Task 4.4
                showBrowserNotification(data.author, data.message, data.type === 'file');
            }

            // Auto-scroll to bottom for new messages
            if (chatBodyRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
                // Only scroll if already near bottom
                if (scrollHeight - scrollTop - clientHeight < 50) {
                    chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
                }
            }
        });

        // --- Task 4.2: User Join/Leave Notifications ---
        socket.on('user_joined', (data) => {
            setMessageList((list) => [...list, { id: Date.now(), author: 'System', message: `${data.username} joined the chat.`, time: formatTime(Date.now()), type: 'system' }]);
            playSoundNotification(); // Optionally play sound for joins/leaves
        });
        socket.on('user_left', (data) => {
            setMessageList((list) => [...list, { id: Date.now(), author: 'System', message: `${data.username} left the chat.`, time: formatTime(Date.now()), type: 'system' }]);
        });


        // --- Task 2.4: Typing status updates ---
        socket.on('typing_status_update', (usersTyping) => {
            // Filter out current user from the list
            const othersTyping = usersTyping.filter(user => user !== username);
            setTypingUsers(othersTyping);
        });

        // --- Task 2.5: Online Users List ---
        socket.on('online_users', (users) => {
            setOnlineUsers(users.sort()); // Sort alphabetically for consistent display
        });

        // --- Task 3.5: Read Receipts ---
        socket.on('message_receipt_update', ({ messageId, status, reader }) => {
            // You might update messageList directly or have a separate state for receipts
            setMessageList(prevMessages => prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, readBy: [...(msg.readBy || []), reader] } : msg
            ));
        });

        // --- Task 3.6: Message Reactions ---
        socket.on('receive_reaction', ({ messageId, reactorUsername, reactionEmoji }) => {
            setMessageList(prevMessages => prevMessages.map(msg => {
                if (msg.id === messageId) {
                    const existingReactions = msg.reactions || {};
                    const newReactions = {
                        ...existingReactions,
                        [reactionEmoji]: (existingReactions[reactionEmoji] || 0) + 1
                    };
                    return { ...msg, reactions: newReactions };
                }
                return msg;
            }));
        });

        // --- Task 5.1: Loading older messages ---
        socket.on('load_older_messages', (olderMessages) => {
            setMessageList(prevMessages => [...olderMessages, ...prevMessages]);
            setMessagesLoadedCount(prev => prev + olderMessages.length);
            // Optionally adjust scroll position to stay on current view
        });

        // Task 4.3: Reset unread count when tab becomes visible/focused
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                setUnreadCount(0);
                if (username) {
                    document.title = `Chat - ${username}`;
                } else {
                    document.title = `Real-Time Chat`;
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);


        // Cleanup on component unmount
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('reconnect');
            socket.off('message_history');
            socket.off('receive_message');
            socket.off('user_joined');
            socket.off('user_left');
            socket.off('typing_status_update');
            socket.off('online_users');
            socket.off('message_receipt_update');
            socket.off('receive_reaction');
            socket.off('load_older_messages');
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [username, isLoggedIn, unreadCount, playSoundNotification, showBrowserNotification, isNotificationPermissionGranted]);


    // --- Task 2.2 (Sending Messages) ---
    const sendMessage = () => {
        if (currentMessage.trim() === "" && !selectedFile) return; // Don't send empty message

        // Stop typing indicator when message is sent (Task 2.4)
        socket.emit('typing_stop');
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        const baseMessageData = {
            author: username,
            time: formatTime(Date.now()),
        };

        if (selectedFile) { // Task 3.4: Send file
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileData = {
                    ...baseMessageData,
                    fileBase64: event.target.result,
                    fileName: selectedFile.name,
                    fileType: selectedFile.type,
                    message: `[File: ${selectedFile.name}]` // Text representation
                };
                socket.emit("send_file_message", fileData);
                setMessageList((list) => [...list, { ...fileData, id: Date.now() + Math.random().toString(36).substring(7), type: 'file' }]); // Client-side echo with ID
                setSelectedFile(null); // Clear selected file
                fileInputRef.current.value = ''; // Clear file input
                setCurrentMessage(''); // Clear any text message
            };
            reader.readAsDataURL(selectedFile); // Converts file to Base64
        } else { // Task 2.2: Send text message
            const textMessageData = { ...baseMessageData, message: currentMessage };
            socket.emit("send_message", textMessageData);
            // Client-side echo: Add own message immediately for responsiveness
            setMessageList((list) => [...list, { ...textMessageData, id: Date.now() + Math.random().toString(36).substring(7) }]); // Add unique ID for receipts
            setCurrentMessage("");
        }
    };

    // --- Task 2.4 (Typing Indicator Logic) ---
    const handleMessageInputChange = (e) => {
        setCurrentMessage(e.target.value);
        if (e.target.value.trim() !== "") {
            if (!typingTimeoutRef.current) {
                socket.emit('typing_start');
            }
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('typing_stop');
                typingTimeoutRef.current = null;
            }, 3000); // Stop typing after 3 seconds of inactivity
        } else {
            socket.emit('typing_stop');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
        }
    };

    // --- Task 3.5 (Read Receipts - Marking as Read) ---
    // This is a simplified approach: mark as read when message is scrolled into view.
    // In a real app, you'd send an ID only for the last visible message.
    const markMessageAsRead = useCallback((messageId, author) => {
        // Only mark if it's not your own message and you haven't already seen it
        if (author !== username) {
            // This assumes you track which messages have been read locally to avoid resending
            // For simplicity, we just emit every time it comes into view for now.
            socket.emit('message_read', { messageId, readerUsername: username });
        }
    }, [username]);

    // --- Task 3.6 (Message Reactions) ---
    const sendReaction = (messageId, emoji) => {
        socket.emit('send_reaction', { messageId, reactorUsername: username, reactionEmoji: emoji });
    };

    // --- Task 5.1 (Load More / Pagination) ---
    const handleScroll = useCallback(() => {
        if (chatBodyRef.current.scrollTop === 0 && messageList.length < messagesLoadedCount) {
            // Prevent loading more if we're already at the beginning of history
            console.log("Reached top, requesting older messages...");
            const firstMessageId = messageList[0]?.id;
            if (firstMessageId) {
                socket.emit('request_older_messages', firstMessageId);
            }
        }
    }, [messageList, messagesLoadedCount]);

    useEffect(() => {
        if (chatBodyRef.current) {
            // Attach scroll listener only when component mounts and ref is available
            chatBodyRef.current.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (chatBodyRef.current) {
                chatBodyRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]); // Re-attach if handleScroll changes due to its dependencies


    // --- Task 3.4 (File Sharing - UI elements) ---
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Simple validation: limit file size for Base64 (e.g., 500KB)
            if (file.size > 500 * 1024) { // 500KB
                alert('File is too large! Please select a file smaller than 500KB for demo.');
                setSelectedFile(null);
                e.target.value = ''; // Clear input
            } else {
                setSelectedFile(file);
                // Optionally set current message text to file name
                setCurrentMessage(`[File: ${file.name}]`);
            }
        }
    };

    // --- Task 5.5: Message Search ---
    const [searchTerm, setSearchTerm] = useState('');
    const filteredMessages = messageList.filter(msg =>
        (msg.message && msg.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (msg.author && msg.author.toLowerCase().includes(searchTerm.toLowerCase()))
    );


    // --- Task 5.6: Responsive Design (Minimal CSS via inline styles, consider a CSS file) ---
    // The main container uses flexbox. Further styling in App.css would be ideal.

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <h1 style={{ color: '#333' }}>Join Real-Time Chat</h1>
                    <input
                        type="text"
                        placeholder="Enter your username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyPress={(event) => { event.key === "Enter" && joinChat(); }}
                        style={{ padding: '10px', margin: '15px 0', border: '1px solid #ddd', borderRadius: '4px', width: '250px' }}
                    />
                    <button onClick={joinChat} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Join Chat</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
            {/* Task 2.5: Online Users Sidebar */}
            <div style={{ width: '250px', borderRight: '1px solid #e0e0e0', padding: '15px', backgroundColor: '#f8f8f8', overflowY: 'auto' }}>
                <h2 style={{ color: '#555', marginBottom: '15px' }}>Online Users ({onlineUsers.length})</h2>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {onlineUsers.map((user, index) => (
                        <li key={index} style={{ marginBottom: '8px', color: '#333', fontWeight: user === username ? 'bold' : 'normal' }}>
                            {user} {user === username && '(You)'}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Chat Area */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
                <header style={{ padding: '15px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5em', color: '#333' }}>Global Chat as {username}</h1>
                    {unreadCount > 0 && (
                        <span style={{ backgroundColor: 'red', color: 'white', borderRadius: '50%', padding: '5px 10px', fontSize: '0.8em' }}>
                            {unreadCount} Unread
                        </span>
                    )}
                </header>

                {/* Task 5.5: Message Search Bar */}
                <div style={{ padding: '10px 15px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f8f8' }}>
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                </div>

                {/* Message display area (Task 2.2, 2.3) */}
                <div
                    ref={chatBodyRef}
                    onScroll={handleScroll} // Attach scroll handler for pagination
                    style={{ flexGrow: 1, overflowY: 'auto', padding: '15px', backgroundColor: '#fbfbfb', borderBottom: '1px solid #e0e0e0' }}
                >
                    {/* Task 5.1: Load More Button */}
                    {messageList.length > 0 && messageList.length < messagesLoadedCount && (
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                             <button
                                onClick={() => socket.emit('request_older_messages', messageList[0].id)}
                                style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Load More Messages
                            </button>
                        </div>
                    )}


                    {filteredMessages.map((msg, index) => (
                        <div key={msg.id || index} style={{ marginBottom: '10px', padding: '8px 12px', borderRadius: '8px', background: msg.author === username ? '#e6f7ff' : '#f0f0f0', maxWidth: '80%', alignSelf: msg.author === username ? 'flex-end' : 'flex-start' }}
                             // Task 3.5: Mark as read when message is viewed
                             ref={el => {
                                 if (el && !msg.read && msg.author !== username) { // Basic check for unread
                                     const observer = new IntersectionObserver(([entry]) => {
                                         if (entry.isIntersecting) {
                                             markMessageAsRead(msg.id, msg.author);
                                             // Optionally update messageList state to mark as read client-side
                                             setMessageList(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                                             observer.unobserve(el);
                                         }
                                     }, { threshold: 0.8 }); // Trigger if 80% of message is visible
                                     observer.observe(el);
                                 }
                             }}>
                            <div style={{ fontSize: '0.9em', color: '#555', marginBottom: '5px' }}>
                                <strong>{msg.author}</strong> <span style={{ float: 'right' }}>{msg.time}</span>
                            </div>
                            {/* Task 3.4: Display File/Image */}
                            {msg.type === 'file' && msg.fileType.startsWith('image/') ? (
                                <img src={msg.fileBase64} alt={msg.fileName} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', marginTop: '5px' }} />
                            ) : msg.type === 'file' ? (
                                <p><a href={msg.fileBase64} download={msg.fileName} style={{ color: '#007bff' }}>Download: {msg.fileName}</a></p>
                            ) : (
                                <p style={{ margin: 0, wordBreak: 'break-word' }}>{msg.message}</p>
                            )}

                            {/* Task 3.6: Message Reactions Display */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                <div style={{ fontSize: '0.8em', color: '#777', marginTop: '5px' }}>
                                    {Object.entries(msg.reactions).map(([emoji, count]) => (
                                        <span key={emoji} style={{ marginRight: '5px', background: '#e0e0e0', padding: '2px 6px', borderRadius: '10px' }}>
                                            {emoji} {count}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Task 3.5: Read Receipts Display */}
                            {msg.author === username && msg.readBy && msg.readBy.length > 0 && (
                                <div style={{ fontSize: '0.7em', color: '#888', textAlign: 'right', marginTop: '5px' }}>
                                    Read by: {msg.readBy.join(', ')}
                                </div>
                            )}

                            {/* Task 3.6: Reaction Buttons (Example) */}
                            <div style={{ marginTop: '5px', textAlign: msg.author === username ? 'right' : 'left' }}>
                                <span style={{ cursor: 'pointer', margin: '0 3px' }} onClick={() => sendReaction(msg.id, '👍')}>👍</span>
                                <span style={{ cursor: 'pointer', margin: '0 3px' }} onClick={() => sendReaction(msg.id, '❤️')}>❤️</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Task 2.4: Typing Indicator Display */}
                {typingUsers.length > 0 && (
                    <div style={{ fontStyle: 'italic', color: '#888', padding: '10px 15px', background: '#f8f8f8', borderTop: '1px solid #e0e0e0' }}>
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                )}

                {/* Message Input Area */}
                <div style={{ padding: '15px', background: '#f0f2f5', borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Task 3.4: File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }} // Hide default file input
                        id="file-upload"
                    />
                    <label htmlFor="file-upload" style={{ padding: '8px 12px', background: '#6c757d', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                        Attach File
                    </label>
                    {selectedFile && <span style={{ fontSize: '0.9em', color: '#555' }}>{selectedFile.name}</span>}

                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={currentMessage}
                        onChange={handleMessageInputChange} // Handle typing status
                        onKeyPress={(event) => { event.key === "Enter" && sendMessage(); }}
                        style={{ flexGrow: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <button onClick={sendMessage} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default App;