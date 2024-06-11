const {
    BrowserRouter,
    Switch,
    Route,
    useHistory,
    useParams
} = ReactRouterDOM;


// TODO: --------------------------------------------- App Component ---------------------------------------------
function App() {
    const apiKey = localStorage.getItem('HackaChat_auth_key');

    const [user, setUser] = React.useState(null); // State to hold current user info
    const [channels, setChannels] = React.useState([]); // State to hold current channel list
    const [unreadCounts, setUnreadCounts] = React.useState({}); // State to hold unread counts for each channel
    const [channel, setChannel] = React.useState({name: ''}); // State to hold channel details
    const [isEditing, setIsEditing] = React.useState(false); // State to toggle edit mode
    const [newChannelName, setNewChannelName] = React.useState(''); // State for the new channel name input
    const [messages, setMessages] = React.useState([]); // State to hold messages
    const [newMessage, setNewMessage] = React.useState(''); // State for the new message input
    const [repliesCount, setRepliesCount] = React.useState({}); // State for the reply counts
    const [selectedMessageId, setSelectedMessageId] = React.useState(null); // State for the selected message id
    const [selectedMessage, setSelectedMessage] = React.useState(null); // State for the selected message
    const [replies, setReplies] = React.useState([]); // State to hold replies
    const [replyInput, setReplyInput] = React.useState({}); // State for the new reply input

    const handleLogin = (username, password) => {
        return fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({username, password}),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Login failed');
                }
                return response.json();
            })
            .then(data => {
                setUser({
                    id: data.id,
                    username: data.username,
                    apiKey: data.api_key
                });
                localStorage.setItem('HackaChat_auth_key', data.api_key);
                return true;
            })
            .catch(error => {
                console.error('Error during login:', error);
                return false;
            });
    };

    function fetchChannelList() {
        fetch('/api/channel', {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setChannels(data);
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    const fetchUnreadMessageCounts = () => {
        if (apiKey) {
            fetch('/api/user/unread-messages', {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    const counts = data.reduce((acc, curr) => {
                        acc[curr.channel_id] = curr.unread_count;
                        return acc;
                    }, {});
                    setUnreadCounts(counts);
                })
                .catch((error) => console.error('Failed to fetch unread messages count:', error));
        }
    };

    const updateLastViewed = (id) => {
        fetch(`/api/channel/${id}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lastMessageId = data[data.length - 1].id;
                    // Update last viewed message
                    fetch(`/api/channel/${id}/last-viewed`, {
                        method: 'POST',
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({last_message_id_seen: lastMessageId}),
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Failed to update last viewed message');
                            }
                            return response.json();
                        })
                        .catch(error => console.error('Failed to update last viewed message:', error));
                }
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    };

    const handleEditClick = () => {
        setIsEditing(true);
    };

    const fetchRepliesCount = (id) => {
        fetch(`/api/channel/${id}/count-replies`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                const repliesMap = data.reduce((acc, item) => {
                    acc[item.message_id] = item.reply_count;
                    return acc;
                }, {});
                setRepliesCount(repliesMap);
            })
            .catch(error => console.error("Failed to fetch replies count:", error));
    };

    const fetchChannelDetail = (id) => {
        fetch(`/api/channel/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                setChannel({name: data.name});
                setNewChannelName(data.name);
            })
            .catch(error => console.error("Failed to fetch channel details:", error));
    }

    const fetchMessagesWithReactions = (id) => {
        fetch(`/api/channel/${id}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(messagesData => {
                // Fetch reactions for each message
                const fetchReactionsPromises = messagesData.map(message =>
                    fetch(`/api/message/${message.id}/reaction`, {
                        method: 'GET',
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json'
                        }
                    }).then(response => response.json())
                );

                // Wait for all reactions to be fetched
                Promise.all(fetchReactionsPromises).then(reactionsData => {
                    const messagesWithReactions = messagesData.map((message, index) => ({
                        ...message,
                        reactions: reactionsData[index]
                    }));

                    setMessages(messagesWithReactions);
                });
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    };

    const fetchParentMessage = (id) => {
        fetch(`/api/message/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(message => {
                setSelectedMessage(message);
            })
            .catch(error => console.error("Failed to fetch messages:", error));
    };

    const handleUpdateChannelName = (id) => {
        fetch(`/api/channel/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: newChannelName}),
        })
            .then(() => {
                setChannel({name: newChannelName});
                setIsEditing(false);
            })
            .catch(error => console.error("Failed to update channel name:", error));
    };

    const handlePostMessage = (event, id) => {
        event.preventDefault(); // Prevent form submission from reloading the page
        if (!newMessage) {
            alert('Message cannot be empty');
            return;
        }
        fetch(`/api/channel/${id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({body: newMessage}),
        })
            .then(() => {
                setMessages([...messages, {body: newMessage}]);
                setNewMessage(''); // Clear input field
                updateLastViewed(id);
            })
            .catch(error => console.error("Failed to post message:", error));
    };

    const handleAddReaction = (messageId, emoji) => {
        fetch(`/api/message/${messageId}/reaction`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({emoji}),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to add reaction');
                }
                return response.json();
            })
            .then(data => {
                if (data.message === "Reaction already exists") {
                    alert("You have already added this emoji :)");
                }
            })
            .catch(error => console.error('Error adding reaction:', error));
    };

    // Test image url: https://uchicagowebdev.com/examples/week_1/homecoming.jpeg
    const parseImageUrls = (message) => {
        // Check if message is null or undefined
        if (!message) return [];
        const regex = /https?:\/\/\S+\.(jpg|jpeg|png|gif)/gi;
        return message.match(regex) || [];
    };

    const fetchRepliesForMessage = (messageId) => {
        fetch(`/api/message/${messageId}/reply`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(messagesData => {
                // Fetch reactions for each reply
                const fetchReactionsPromises = messagesData.map(message =>
                    fetch(`/api/message/${message.id}/reaction`, {
                        method: 'GET',
                        headers: {
                            'Authorization': apiKey,
                            'Content-Type': 'application/json'
                        }
                    }).then(response => response.json())
                );

                // Wait for all reactions to be fetched
                Promise.all(fetchReactionsPromises).then(reactionsData => {
                    const messagesWithReactions = messagesData.map((message, index) => ({
                        ...message,
                        reactions: reactionsData[index]
                    }));

                    setReplies(messagesWithReactions);
                });
            })
            .catch(error => console.error("Failed to fetch replies:", error));
    };

    const handlePostReply = (event, messageId) => {
        event.preventDefault(); // Prevent the default form submission behavior
        const replyBody = replyInput[messageId];

        if (!replyBody) {
            alert('Reply cannot be empty');
            return;
        }

        fetch(`/api/message/${messageId}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({body: replyBody}),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to post reply');
                }
                return response.json();
            })
            .then(() => {
                setReplyInput(prev => ({...prev, [messageId]: ''}));
                fetchRepliesForMessage(messageId); // Refresh the replies to include the new one
            })
            .catch(error => console.error('Failed to post reply:', error));
    };

    return (
        <BrowserRouter>
            <div>
                <Switch>
                    <Route exact path="/">
                        <SplashScreen user={user} setUser={setUser}
                                      channels={channels} setChannels={setChannels}
                                      unreadCounts={unreadCounts} setUnreadCounts={setUnreadCounts}
                                      selectedMessageId={selectedMessageId} setSelectedMessageId={setSelectedMessageId}
                                      fetchChannelList={fetchChannelList}
                                      fetchUnreadMessageCounts={fetchUnreadMessageCounts}/>
                    </Route>
                    <Route path="/login">
                        <LoginForm user={user} setUser={setUser} handleLogin={handleLogin}/>
                    </Route>
                    <Route path="/profile">
                        <Profile user={user} setUser={setUser}/>
                    </Route>
                    <Route exact path="/channel/:id">
                        <ChatChannel user={user} setUser={setUser}
                                     channels={channels} setChannels={setChannels}
                                     unreadCounts={unreadCounts} setUnreadCounts={setUnreadCounts}
                                     channel={channel} setChannel={setChannel}
                                     isEditing={isEditing} setIsEditing={setIsEditing}
                                     newChannelName={newChannelName} setNewChannelName={setNewChannelName}
                                     messages={messages} setMessages={setMessages}
                                     newMessage={newMessage} setNewMessage={setNewMessage}
                                     repliesCount={repliesCount} setRepliesCount={setRepliesCount}
                                     selectedMessageId={selectedMessageId} setSelectedMessageId={setSelectedMessageId}
                                     selectedMessage={selectedMessage} setSelectedMessage={setSelectedMessage}
                                     fetchChannelList={fetchChannelList}
                                     fetchUnreadMessageCounts={fetchUnreadMessageCounts}
                                     updateLastViewed={updateLastViewed}
                                     handleEditClick={handleEditClick}
                                     fetchRepliesCount={fetchRepliesCount}
                                     fetchChannelDetail={fetchChannelDetail}
                                     fetchMessagesWithReactions={fetchMessagesWithReactions}
                                     handleUpdateChannelName={handleUpdateChannelName}
                                     handlePostMessage={handlePostMessage}
                                     handleAddReaction={handleAddReaction}
                                     parseImageUrls={parseImageUrls}/>
                    </Route>
                    <Route exact path="/channel/:id/thread/:msg_id">
                        <Thread user={user} setUser={setUser}
                                channels={channels} setChannels={setChannels}
                                unreadCounts={unreadCounts} setUnreadCounts={setUnreadCounts}
                                channel={channel} setChannel={setChannel}
                                isEditing={isEditing} setIsEditing={setIsEditing}
                                newChannelName={newChannelName} setNewChannelName={setNewChannelName}
                                messages={messages} setMessages={setMessages}
                                newMessage={newMessage} setNewMessage={setNewMessage}
                                repliesCount={repliesCount} setRepliesCount={setRepliesCount}
                                selectedMessageId={selectedMessageId} setSelectedMessageId={setSelectedMessageId}
                                selectedMessage={selectedMessage} setSelectedMessage={setSelectedMessage}
                                replies={replies} setReplies={setReplies}
                                replyInput={replyInput} setReplyInput={setReplyInput}
                                fetchChannelList={fetchChannelList}
                                fetchUnreadMessageCounts={fetchUnreadMessageCounts}
                                updateLastViewed={updateLastViewed}
                                handleEditClick={handleEditClick}
                                fetchRepliesCount={fetchRepliesCount}
                                fetchChannelDetail={fetchChannelDetail}
                                fetchMessagesWithReactions={fetchMessagesWithReactions}
                                fetchParentMessage={fetchParentMessage}
                                handleUpdateChannelName={handleUpdateChannelName}
                                handlePostMessage={handlePostMessage}
                                handleAddReaction={handleAddReaction}
                                parseImageUrls={parseImageUrls}
                                fetchRepliesForMessage={fetchRepliesForMessage}
                                handlePostReply={handlePostReply}/>
                    </Route>
                    <Route path="*">
                        <NotFoundPage/>
                    </Route>
                </Switch>
            </div>
        </BrowserRouter>
    );
}


// TODO: --------------------------------------------- Splash Component ---------------------------------------------
function SplashScreen(props) {
    const apiKey = localStorage.getItem('HackaChat_auth_key');
    const history = useHistory();

    const handleSignup = () => {
        fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Signup failed');
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem('HackaChat_auth_key', data.api_key);
                props.setUser({id: data.id, username: data.username, apiKey: data.api_key});
                history.push('/profile');
            })
            .catch(error => {
                console.error('Error during signup:', error);
            });
    };

    const handleCreateChannel = () => {
        fetch('/api/channel', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to create a new channel');
                }
                return response.json();
            })
            .then(newChannel => {
                history.push(`/channel/${newChannel.id}`);
                // Add the new channel to the existing list of channels
                props.setChannels(prevChannels => [...prevChannels, newChannel]);
                props.setSelectedMessageId(null);
            })
            .catch(error => {
                console.error('Error creating a new channel:', error);
            });
    };

    function fetchUserInfo() {
        if (apiKey) {
            fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch user data');
                    }
                    return response.json();
                })
                .then(userData => {
                    props.setUser({
                        id: userData.id,
                        username: userData.username,
                    });
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                });
        }
    }

    React.useEffect(() => {
        document.title = "HackaChat Main Page";
        props.fetchChannelList();
        fetchUserInfo();
        props.fetchUnreadMessageCounts();
        const counts_interval = setInterval(() => {
            props.fetchChannelList();
            props.fetchUnreadMessageCounts();
        }, 200);
        return () => clearInterval(counts_interval);
    }, []); // The empty array ensures this effect runs only once after the initial render

    const handleLoginClick = () => {
        history.push('/login');
    };

    const handleProfileClick = () => {
        history.push('/profile');
    }

    function redirectToChannel(channelId) {
        history.push(`/channel/${channelId}`);
    }

    return (
    <div className="container my-5">
        <div className="home-container">

            <div className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary" style={{width: "280px"}}>
                <a className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none">
                    <span className="fs-4">Channel List</span>
                </a>
                <hr></hr>
                {props.channels.length > 0 ? (
                    <ul className="nav nav-pills flex-column mb-auto">
                        {props.channels.map((channel) => (
                            <li className="nav-item">
                                <a className="nav-link link-body-emphasis" key={channel.id}
                                   onClick={() => redirectToChannel(channel.id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                         fill="currentColor" className="bi bi-bookmark" viewBox="0 0 16 16">
                                        <path
                                            d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
                                    </svg>
                                    {channel.name}
                                    {props.unreadCounts[channel.id] !== 0 && props.user &&
                                        <strong>({props.unreadCounts[channel.id]} unread messages)</strong>}
                                </a>
                            </li>

                        ))}
                    </ul>
                ) : (
                    <div>No channels yet! Create the first channel on HackaChat!</div>
                )}
                <hr></hr>
            </div>

            <div className="row p-4 pb-0 pe-lg-0 pt-lg-5 align-items-center rounded-3 border shadow-lg">
                <div className="col-lg-7 p-3 p-lg-5 pt-lg-3">
                    <h1 className="display-4 fw-bold lh-1 text-body-emphasis">HackaChat</h1>
                    <p className="lead">A Chat Room created for Hackathon 2024.</p>
                    <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3">
                        {props.user ? (
                            <button type="button" className="btn btn-primary btn-lg px-4 me-md-2 fw-bold"
                                    onClick={handleProfileClick}>Welcome back, {props.user.username}!</button>
                        ) : (
                            <button type="button" className="btn btn-primary btn-lg px-4 me-md-2 fw-bold"
                                    onClick={handleLoginClick}>Login</button>
                        )}
                        {props.user ? (
                            <button type="button" className="btn btn-outline-secondary btn-lg px-4"
                                    onClick={handleCreateChannel}>Create a Channel</button>
                        ) : (
                            <button type="button" className="btn btn-outline-secondary btn-lg px-4"
                                    onClick={handleSignup}>Signup</button>
                        )}
                    </div>
                </div>

                <div className="col-lg-4 offset-lg-1 p-0 overflow-hidden shadow-lg">
                    <img className="rounded-lg-3" src="/static/hero.png" alt="HERO-IMG"/>
                </div>
            </div>
        </div>

    </div>

        // <div className="container-fluid mt-5">
        //     <div className="row">
        //         {/* Sidebar for channels */}
        //         <div className="col-md-3">
        //             {props.channels.length > 0 ? (
        //                 <div className="list-group">
        //                     {props.channels.map((channel) => (
        //                         <button key={channel.id} className="list-group-item list-group-item-action" onClick={() => redirectToChannel(channel.id)}>
        //                             {channel.name}
        //                             {props.unreadCounts[channel.id] !== 0 && props.user &&
        //                                 <strong> ({props.unreadCounts[channel.id]} unread messages)</strong>}
        //                         </button>
        //                     ))}
        //                 </div>
        //             ) : (
        //                 <div className="alert alert-warning" role="alert">
        //                     No channels yet! Create the first channel on HackaChat!
        //                 </div>
        //             )}
        //         </div>
        //
        //         {/* Main content */}
        //         <div className="col-md-9">
        //             <div className="d-flex justify-content-between align-items-center mb-4">
        //                 {props.user ? (
        //                     <div className="d-flex align-items-center" onClick={handleProfileClick}>
        //                         <span className="me-2">Welcome back, {props.user.username}!</span>
        //                         <span className="material-symbols-outlined md-18">person</span>
        //                     </div>
        //                 ) : (
        //                     <button className="btn btn-primary" onClick={handleLoginClick}>Login</button>
        //                 )}
        //             </div>
        //
        //             <div className="text-center">
        //                 <div className="mb-4">
        //                     <img id="hero-img" className="img-fluid" src="/static/hero.png" alt="HERO-IMG"/>
        //                 </div>
        //                 <h1>HackaChat</h1>
        //                 {props.user ? (
        //                     <button className="btn btn-success mt-3" onClick={handleCreateChannel}>Create a Channel</button>
        //                 ) : (
        //                     <button className="btn btn-secondary mt-3" onClick={handleSignup}>Signup</button>
        //                 )}
        //             </div>
        //         </div>
        //     </div>
        // </div>
    );
}


// TODO: --------------------------------------------- Login Component ---------------------------------------------
function LoginForm(props) {
    const history = useHistory();

    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [errorMessage, setErrorMessage] = React.useState('');

    const handleSignup = () => {
        fetch('/api/signup', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Signup failed');
                }
                return response.json();
            })
            .then(data => {
                localStorage.setItem('HackaChat_auth_key', data.api_key);
                props.setUser({id: data.id, username: data.username, apiKey: data.api_key});
                history.push('/profile');
            })
            .catch(error => {
                console.error('Error during signup:', error);
            });
    };

    const handleInputChange = (event) => {
        const {name, value} = event.target;
        if (name === 'username') {
            setUsername(value);
        } else if (name === 'password') {
            setPassword(value);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        props.handleLogin(username, password)
            .then(success => {
                if (!success) {
                    setErrorMessage('Oops, that username and password don\'t match any of our users!');
                } else {
                    history.push('/');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                setErrorMessage('An error occurred. Please try again.');
            });
    };

    React.useEffect(() => {
        const apiKey = localStorage.getItem('HackaChat_auth_key');
        if (apiKey) {
            history.push('/profile');
        }
        document.title = "HackaChat Login Page";
    }, []); // The empty array ensures this effect runs only once after the initial render

    // return (
    //     <div className="login">
    //         <div className="header">
    //             <h2><a href="/">HackaChat</a></h2>
    //             <h4>Login Page</h4>
    //         </div>
    //         <div className="clip">
    //             <div className="auth container">
    //                 <h3>Enter your username and password to log in:</h3>
    //                 <form onSubmit={handleSubmit} className="alignedForm login">
    //                     <label htmlFor="username">Username</label>
    //                     <input
    //                         type="text"
    //                         name="username"
    //                         value={username}
    //                         onChange={handleInputChange}
    //                         required
    //                     />
    //                     <div></div>
    //                     <label htmlFor="password">Password</label>
    //                     <input
    //                         type="password"
    //                         name="password"
    //                         value={password}
    //                         onChange={handleInputChange}
    //                         required
    //                     />
    //                     <button type="submit">Login</button>
    //                 </form>
    //                 <div className="failed">
    //                     <button type="button" onClick={handleSignup}>Create a new Account</button>
    //                 </div>
    //
    //                 {errorMessage && (
    //                     <div className="failed">
    //                         <div className="message">
    //                             {errorMessage}
    //                         </div>
    //                     </div>
    //                 )}
    //             </div>
    //         </div>
    //     </div>
    // );

    return (
        <div className="login">
            <div className="header">
                <h2><a href="/">HackaChat</a ></h2>
                <h4>Sign in Page</h4>
            </div>

            <div className="container col-md-8 col-lg-6 col-xl-5">
                <p className="text-center h1 fw-bold mb-5 mx-1 mx-md-4 mt-4" style={{color: '#333'}}>
                    Sign In
                </p>
                <form onSubmit={handleSubmit} className="alignedForm login">
                    <div className="form-floating">
                        <input type="text" className="form-control" name="username" placeholder="username"
                               value={username} onChange={handleInputChange} required/>
                        <label htmlFor="username">User Name</label>
                    </div>


                    <div className="form-floating">
                        <input type="password" className="form-control" name="password" placeholder="Password"
                               value={password} onChange={handleInputChange} required/>
                        <label htmlFor="password">Password</label>
                    </div>

                    <div className="row my-3">
                        <div className="col-6">
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="remember-me"
                                       id="flexCheckDefault"/>
                                <label className="form-check-label" htmlFor="flexCheckDefault">
                                    Remember me
                                </label>
                            </div>
                        </div>
                        <div className="col-6 text-end">
                            {/* In future version */}
                            <a href="/">Forgot password?</a>
                        </div>
                    </div>

                    <button className="btn btn-primary w-100 py-2 mb-3" type="submit">Login</button>
                </form>

                <div className="failed text-center">
                    <p>Not a member? <a href="/profile" onClick={handleSignup}>Register</a></p>
                </div>

                {errorMessage && (
                    <div className="failed">
                        <div className="message">
                            {errorMessage}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


// TODO: --------------------------------------------- Profile Component ---------------------------------------------
function Profile(props) {
    const apiKey = localStorage.getItem('HackaChat_auth_key');
    const history = useHistory();

    const [username, setUsername] = React.useState(props.user ? props.user.username : '');
    const [password, setPassword] = React.useState('');
    const [repeatPassword, setRepeatPassword] = React.useState('');
    const [error, setError] = React.useState('');

    const handleLogout = () => {
        props.setUser(null);
        localStorage.removeItem('HackaChat_auth_key');
        history.push("/login");
    };

    const handleUpdateUsername = () => {
        fetch('/api/profile', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({name: username})
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update username');
                }
                return response.json();
            })
            .then(updatedUser => {
                props.setUser(updatedUser);
                setUsername(updatedUser.username);
                alert("Username has been updated!");
            })
            .catch(error => {
                console.error('Error updating username:', error);
                setError('Failed to update username');
            });
    };

    const handleUpdatePassword = () => {
        if (password !== repeatPassword) {
            setError("Passwords don't match");
        } else {
            setError(null);
            fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({password: password})
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to update password');
                    }
                    setPassword(password);
                    setRepeatPassword(repeatPassword);
                    alert("Password has been updated!");
                })
                .catch(error => {
                    console.error('Error updating password:', error);
                    setError('Failed to update password');
                });
        }
    };

    const goToSplash = () => {
        history.push('/');
    };

    React.useEffect(() => {
        if (!apiKey) {
            history.push('/login');
        } else {
            document.title = "HackaChat Profile Page";
            fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch user data');
                    }
                    return response.json();
                })
                .then(userData => {
                    setUsername(userData.username);
                    setPassword(userData.password);
                    setRepeatPassword(userData.password);
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                });
        }
    }, [history]);

return (
        <div className="profile">
            <div className="header">
                <h2><a href="/">HackaChat</a></h2>
            </div>
            <div className="clip">
                <div className="auth container col-md-8 col-lg-6 col-xl-5">
                    <p className="text-center h1 fw-bold mb-4 mx-3 mx-md-4 mt-5" style={{ color: '#333' }}>
                    Welcome to HackaChat!
                    </p >
                    <div className="alignedForm">
                        <div className="form-floating d-flex align-items-center my-2">
                            <input type="text" className="form-control" name="username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)}/>
                            <label htmlFor="username">User Name</label>
                            <button type="button" className="btn btn-primary ms-2" onClick={handleUpdateUsername} style={{ height: '60px' }}>update</button>
                        </div>

                        <div className="form-floating d-flex align-items-center my-2">
                            <input type="password" className="form-control" name="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                            <label htmlFor="password">Password</label>
                            <button type="button" className="btn btn-primary ms-2" onClick={handleUpdatePassword} style={{ height: '60px' }}>update</button>
                        </div>

                        <div className="form-floating my-2">
                            <input type="password" className="form-control" name="repeatPassword" placeholder="repeatPassword" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)}/>
                            <label htmlFor="repeatPassword">Repeat Password</label>
                        </div>
                        {error && <div className="error" style={{color: 'red'}}>{error}</div>}

                        <div className="d-flex flex-column align-items-stretch my-2">
                            <div className="row mx-0">
                                <div className="col px-1">
                                    <button className="btn btn-primary w-100" onClick={goToSplash}>Cool, let's go!</button>
                                </div>
                                <div className="col px-1">
                                    <button className="btn btn-primary w-100" onClick={handleLogout}>Log out</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}


// TODO: --------------------------------------------- Channel Component ---------------------------------------------
function ChatChannel(props) {
    const apiKey = localStorage.getItem('HackaChat_auth_key');
    const {id} = useParams();
    const history = useHistory();

    const [view, setView] = React.useState('message'); // set default view as channel messages

    React.useEffect(() => {
        console.log("view page: " + view);
        if (!apiKey) {
            history.push('/login');
            alert("Please login before entering to the channels.")
        }
        document.title = `HackaChat Channel #${id}`;
        props.fetchChannelList();
        props.fetchUnreadMessageCounts();
        props.fetchChannelDetail(id);
        props.fetchMessagesWithReactions(id);
        props.updateLastViewed(id);
        props.fetchRepliesCount(id);
        const message_interval = setInterval(() => {
            props.fetchChannelList();
            props.fetchUnreadMessageCounts();
            props.fetchMessagesWithReactions(id);
            props.updateLastViewed(id);
            props.fetchRepliesCount(id);
        }, 200);
        return () => clearInterval(message_interval);
    }, [id, props.selectedMessageId]); // Re-run the effect if the channel ID and selected message id changes

    const goToSplash = () => {
        history.push('/');
    };

    const redirectToChannel = (channelId) => {
        history.push(`/channel/${channelId}`);
        props.setSelectedMessageId(null);
        setView('message'); // show message once channel is clicked
        //props.setIsEditing(false);
    };

    const redirectToThread = (channelId, messageId) => {
        props.setSelectedMessageId(messageId);
        const message = props.messages.find(m => m.id === messageId);
        props.setSelectedMessage(message);
        history.push(`/channel/${channelId}/thread/${messageId}`);
    };

    const handleBackToChannels = () => {
        props.setSelectedMessageId(null);
        setView('channel'); // only show channel list
        history.push(`/`);
    };

    if (props.channels.length < parseInt(id, 10)) {
        return <NotFoundPage/>;
    } else {
        return (
            <div className="splash container">
                <div className="channel">
                    <div className="header">
                        <h2><a href="/">HackaChat</a></h2>
                        <div className="channelDetail">
                            {!props.isEditing && props.channel ? (
                                <div>
                                    <h3>
                                        Chatting in <strong>{props.channel.name}</strong>
                                        <a onClick={props.handleEditClick}><span
                                            className="material-symbols-outlined md-18">edit</span></a>
                                    </h3>
                                </div>
                            ) : (
                                <div>
                                    <h3>
                                        Chatting in <input value={props.newChannelName}
                                                           onChange={(e) => props.setNewChannelName(e.target.value)}/>
                                        <button className="btn btn-outline-secondary" onClick={() => props.handleUpdateChannelName(id)}>Update</button>
                                    </h3>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="channel-container">

                        <div className={`d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary ${view !== 'channel' ? 'd-none d-lg-flex' : ''}`} style={{width: "280px"}}>
                            <a className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none">
                                <span className="fs-4">Channel List</span>
                            </a>
                            <hr></hr>
                            {props.channels.length > 0 ? (
                                <ul className="nav nav-pills flex-column mb-auto">
                                    {props.channels.map((channel) => (
                                        <li className="nav-item">
                                            <a className="nav-link link-body-emphasis" key={channel.id}
                                               onClick={() => redirectToChannel(channel.id)}
                                               style={{backgroundColor: channel.id === parseInt(id, 10) ? '#0d6efd' : 'transparent'}}>

                                                {props.isEditing && channel.name === props.channel.name ? (
                                                    <div>
                                                        <font color="white">Update Channel Name: </font>
                                                            <input value={props.newChannelName}
                                                                   onChange={(e) => props.setNewChannelName(e.target.value)}/>
                                                            <button className="btn btn-light rounded-pill px-3"
                                                                    onClick={() => props.handleUpdateChannelName(id)}>Update
                                                            </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                                             fill="currentColor" className="bi bi-bookmark"
                                                             viewBox="0 0 16 16">
                                                            <path
                                                                d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
                                                        </svg>
                                                        {channel.name}
                                                        <a onClick={props.handleEditClick}><span
                                                            className="material-symbols-outlined md-18">edit</span></a>
                                                    </div>
                                                )}

                                                {props.unreadCounts[channel.id] !== 0 && props.user &&
                                                    <strong>({props.unreadCounts[channel.id]} unread messages)</strong>}
                                            </a>
                                        </li>

                                    ))}
                                </ul>
                            ) : (
                                <div>No channels yet! Create the first channel on HackaChat!</div>
                            )}
                            <hr></hr>

                        </div>

                        <div
                            className={`my-3 p-3 bg-body rounded shadow-sm ${view !== 'message' ? 'd-none d-lg-block' : ''}`}>
                            <div className="back-button" onClick={handleBackToChannels}>Channel List</div>

                            {props.messages.map((message, index) => (

                                <div className="d-flex text-body-secondary pt-3">
                                <svg className="bd-placeholder-img flex-shrink-0 me-2 rounded" width="32"
                                         height="32"
                                         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder: 32x32"
                                         preserveAspectRatio="xMidYMid slice" focusable="false">
                                        <title>Placeholder</title>
                                        <rect width="100%" height="100%" fill="#007bff"></rect>
                                        <text x="50%" y="50%" fill="#007bff" dy=".3em">32x32</text>
                                    </svg>
                                    <div className="pb-3 mb-0 small lh-sm border-bottom w-100">
                                        <div className="d-flex justify-content-between">
                                            <strong className="text-gray-dark">{message.name}</strong>
                                            {props.repliesCount[message.id] > 0 ? (
                                                <button type="button" className="btn btn-outline-primary"
                                                        onClick={() => redirectToThread(id, message.id)}>
                                                    Replies: {props.repliesCount[message.id]}
                                                </button>
                                            ) : (
                                                <button type="button" className="btn btn-outline-primary"
                                                        onClick={() => redirectToThread(id, message.id)}>Reply!</button>
                                            )}
                                        </div>

                                        <div className="d-flex justify-content-between">
                                            <span className="d-block">{message.body}</span>
                                            {props.parseImageUrls(message.body).map((url, imgIndex) => (
                                                <img key={imgIndex} src={url} alt="Message Attachment"
                                                     style={{
                                                         maxWidth: '200px',
                                                         maxHeight: '200px',
                                                         marginTop: '10px'
                                                     }}/>
                                            ))}

                                            <div className="message-reactions">
                                                {['😀', '❤️', '👍'].map(emoji => (
                                                    <button type="button" className="btn btn-outline-light" key={emoji}
                                                            onClick={() => props.handleAddReaction(message.id, emoji)}>{emoji}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <span>
                                            {message.reactions && message.reactions.length > 0 && (
                                                <div className="reactions">
                                                    {message.reactions.map((reaction, index) => (
                                                        <span key={index} className="reaction"
                                                              onMouseEnter={(e) => {
                                                                  // Show tooltip
                                                                  e.currentTarget.querySelector('.users').classList.add('show');
                                                              }}
                                                              onMouseLeave={(e) => {
                                                                  // Hide tooltip
                                                                  e.currentTarget.querySelector('.users').classList.remove('show');
                                                              }}>
                                                                    {reaction.emoji} {reaction.users.split(',').length}&nbsp;
                                                            <span className="users">{reaction.users}</span>
                                                                </span>
                                                    ))}
                                                </div>
                                            )}
                                        </span>


                                    </div>

                                </div>

                            ))}
                            <div className="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3 comment_box" role="search">
                                <textarea name="comment" value={props.newMessage}
                                          onChange={(e) => props.setNewMessage(e.target.value)} className="form-control"
                                          style={{width: '100%'}}
                                          placeholder="What you want to say?"></textarea>
                                <button className="btn btn-primary"
                                        onClick={(e) => props.handlePostMessage(e, id)}>Post
                                </button>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        );
    }
}


// TODO: --------------------------------------------- Thread Component ---------------------------------------------
function Thread(props) {
    const apiKey = localStorage.getItem('HackaChat_auth_key');
    const {id, msg_id} = useParams();
    const history = useHistory();

    const [view, setView] = React.useState('reply'); // set default view as reply thread page
    const [valid, setValid] = React.useState(true); // state to check if message exists in current channel

    React.useEffect(() => {
        //console.log("selected message author: ", props.selectedMessage.name);
        //console.log("selected message id: ", props.selectedMessage.id);
        console.log("selected replies: ", props.repliesCount);
        if (!apiKey) {
            history.push('/login');
            alert("Please login before entering to the thread.")
        }
        document.title = `HackaChat Channel #${id} Thread #${msg_id}`;
        props.setSelectedMessageId(msg_id);
        props.fetchChannelList();
        props.fetchUnreadMessageCounts();
        props.fetchChannelDetail(id);
        props.fetchMessagesWithReactions(id);
        props.fetchParentMessage(msg_id);
        props.updateLastViewed(id);
        props.fetchRepliesCount(id);
        props.fetchRepliesForMessage(props.selectedMessageId);
        checkValidThread(id, msg_id);
        const thread_interval = setInterval(() => {
            props.fetchChannelList();
            props.fetchUnreadMessageCounts();
            props.fetchMessagesWithReactions(id);
            props.fetchParentMessage(msg_id);
            props.updateLastViewed(id);
            props.fetchRepliesCount(id);
            props.fetchRepliesForMessage(props.selectedMessageId);
        }, 200);
        return () => clearInterval(thread_interval);
    }, [id, props.selectedMessageId]); // Re-run the effect if the channel ID and selected message id changes

    const goToSplash = () => {
        history.push('/');
    };

    const redirectToChannel = (channelId) => {
        history.push(`/channel/${channelId}`);
        props.setSelectedMessageId(null);
        setView('message');
        //props.setIsEditing(false);
    };

    const redirectToThread = (channelId, messageId) => {
        history.push(`/channel/${channelId}/thread/${messageId}`);
        props.setSelectedMessageId(messageId);
        const message = props.messages.find(m => m.id === messageId);
        props.setSelectedMessage(message);
        setView('reply');
    };

    const handleBackToChannels = () => {
        props.setSelectedMessageId(null);
        setView('channel');
        history.push(`/`);
    };

    const checkValidThread = () => {
        fetch(`/api/check_valid/${id}/${msg_id}`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    setValid(false);
                }
            })
            .catch(error => console.error("Failed to check if thread is valid:", error));
    }

    if (props.channels.length < parseInt(id, 10) || !valid) {
        return <NotFoundPage/>;
    } else {
        return (
            <div className="splash container">
                <div className="channel">
                    <div className="header">
                        <h2><a href="/">HackaChat</a></h2>
                        <div className="channelDetail">
                            {!props.isEditing && props.channel ? (
                                <div>
                                    <h3>
                                        Chatting in <strong>{props.channel.name}</strong>
                                        <a onClick={props.handleEditClick}><span
                                            className="material-symbols-outlined md-18">edit</span></a>
                                    </h3>
                                </div>
                            ) : (
                                <div>
                                    <h3>
                                        Chatting in <input value={props.newChannelName}
                                                           onChange={(e) => props.setNewChannelName(e.target.value)}/>
                                        <button className="btn btn-outline-secondary" onClick={() => props.handleUpdateChannelName(id)}>Update</button>
                                    </h3>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="thread-container">
                        <div className={`d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary ${view !== 'channel' ? 'd-none d-lg-flex' : ''}`} style={{width: "280px"}}>
                            <a className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none">
                                <span className="fs-4">Channel List</span>
                            </a>
                            <hr></hr>
                            {props.channels.length > 0 ? (
                                <ul className="nav nav-pills flex-column mb-auto">
                                    {props.channels.map((channel) => (
                                        <li className="nav-item">
                                            <a className="nav-link link-body-emphasis" key={channel.id}
                                               onClick={() => redirectToChannel(channel.id)}
                                               style={{backgroundColor: channel.id === parseInt(id, 10) ? '#0d6efd' : 'transparent'}}>
                                                {props.isEditing && channel.name === props.channel.name ? (
                                                    <div>
                                                        <font color="white">Update Channel Name: </font>
                                                            <input value={props.newChannelName}
                                                                   onChange={(e) => props.setNewChannelName(e.target.value)}/>
                                                            <button className="btn btn-light rounded-pill px-3"
                                                                    onClick={() => props.handleUpdateChannelName(id)}>Update
                                                            </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                                             fill="currentColor" className="bi bi-bookmark"
                                                             viewBox="0 0 16 16">
                                                            <path
                                                                d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
                                                        </svg>
                                                        {channel.name}
                                                        <a onClick={props.handleEditClick}><span
                                                            className="material-symbols-outlined md-18">edit</span></a>
                                                    </div>
                                                )}
                                                {props.unreadCounts[channel.id] !== 0 && props.user &&
                                                    <strong>({props.unreadCounts[channel.id]} unread messages)</strong>}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div>No channels yet! Create the first channel on HackaChat!</div>
                            )}
                            <hr></hr>
                        </div>

                        <div className={`my-3 p-3 bg-body rounded shadow-sm ${view !== 'message' ? 'd-none d-lg-block' : ''}`}>
                            <div className="back-button" onClick={handleBackToChannels}>Channel List</div>
                            {props.messages.map((message, index) => (

                                <div className="d-flex text-body-secondary pt-3">
                                    <svg className="bd-placeholder-img flex-shrink-0 me-2 rounded" width="32"
                                         height="32"
                                         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder: 32x32"
                                         preserveAspectRatio="xMidYMid slice" focusable="false">
                                        <title>Placeholder</title>
                                        <rect width="100%" height="100%" fill="#007bff"></rect>
                                        <text x="50%" y="50%" fill="#007bff" dy=".3em">32x32</text>
                                    </svg>
                                    <div className="pb-3 mb-0 small lh-sm border-bottom w-100">
                                        <div className="d-flex justify-content-between">
                                            <strong className="text-gray-dark">{message.name}</strong>
                                            {props.repliesCount[message.id] > 0 ? (
                                                <button type="button" className="btn btn-outline-primary"
                                                        onClick={() => redirectToThread(id, message.id)}>
                                                    Replies: {props.repliesCount[message.id]}
                                                </button>
                                            ) : (
                                                <button type="button" className="btn btn-outline-primary"
                                                        onClick={() => redirectToThread(id, message.id)}>Reply!</button>
                                            )}
                                        </div>

                                        <div className="d-flex justify-content-between">
                                            <span className="d-block">{message.body}</span>
                                            {props.parseImageUrls(message.body).map((url, imgIndex) => (
                                                <img key={imgIndex} src={url} alt="Message Attachment"
                                                     style={{
                                                         maxWidth: '200px',
                                                         maxHeight: '200px',
                                                         marginTop: '10px'
                                                     }}/>
                                            ))}

                                            <div className="message-reactions">
                                                {['😀', '❤️', '👍'].map(emoji => (
                                                    <button type="button" className="btn btn-outline-light" key={emoji}
                                                            onClick={() => props.handleAddReaction(message.id, emoji)}>{emoji}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <span>
                                            {message.reactions && message.reactions.length > 0 && (
                                                <div className="reactions">
                                                    {message.reactions.map((reaction, index) => (
                                                        <span key={index} className="reaction"
                                                              onMouseEnter={(e) => {
                                                                  // Show tooltip
                                                                  e.currentTarget.querySelector('.users').classList.add('show');
                                                              }}
                                                              onMouseLeave={(e) => {
                                                                  // Hide tooltip
                                                                  e.currentTarget.querySelector('.users').classList.remove('show');
                                                              }}>
                                                                    {reaction.emoji} {reaction.users.split(',').length}&nbsp;
                                                            <span className="users">{reaction.users}</span>
                                                                </span>
                                                    ))}
                                                </div>
                                            )}
                                        </span>


                                    </div>

                                </div>

                            ))}
                            <div className="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3 comment_box" role="search">
                                <textarea name="comment" value={props.newMessage}
                                          onChange={(e) => props.setNewMessage(e.target.value)} className="form-control"
                                          style={{width: '100%'}}
                                          placeholder="What you want to say?"></textarea>
                                <button className="btn btn-primary"
                                        onClick={(e) => props.handlePostMessage(e, id)}>Post
                                </button>
                            </div>

                        </div>

                        <div className={`my-3 p-3 bg-body rounded shadow-sm ${view !== 'reply' ? 'd-none d-lg-block' : ''}`}>
                            <div className="back-button" onClick={handleBackToChannels}>Channel List</div>

                            <button className="btn btn-outline-secondary"
                                    style={{ position: 'relative', top: 0, right: 0, }}
                                    onClick={() => redirectToChannel(id)}>back</button>
                            <h3>Message</h3>
                            <div className="message">
                                <strong
                                    className="text-gray-dark">{props.selectedMessage && props.selectedMessage.name}</strong>
                                <div className="d-block">
                                    {props.selectedMessage && props.selectedMessage.body}
                                    {props.selectedMessage && props.parseImageUrls(props.selectedMessage.body).map((url, imgIndex) => (
                                        <img key={imgIndex} src={url} alt="Message Attachment"
                                             style={{
                                                 maxWidth: '100px',
                                                 maxHeight: '100px',
                                                 marginTop: '10px'
                                             }}/>
                                    ))}
                                </div>
                            </div>
                            <h3>Replies</h3>
                            {props.replies && props.replies.length > 0 ? (
                                props.replies.map((reply, index) => (
                                    <div key={index} className="reply">
                                        <strong className="text-gray-dark">{reply.name}</strong>
                                        <div className="d-block">
                                            {reply.body}
                                            {/* Display images after the reply content */}
                                            {props.parseImageUrls(reply.body).map((url, imgIndex) => (
                                                <img key={imgIndex} src={url} alt="Message Attachment"
                                                     style={{
                                                         maxWidth: '100px',
                                                         maxHeight: '100px',
                                                         marginTop: '10px'
                                                     }}/>
                                            ))}
                                        </div>

                                        {reply.reactions && reply.reactions.length > 0 && (
                                            <div className="reactions">
                                                {reply.reactions.map((reaction, index) => (
                                                    <span key={index} className="reaction"
                                                          onMouseEnter={(e) => {
                                                              // Show tooltip
                                                              e.currentTarget.querySelector('.users').classList.add('show');
                                                          }}
                                                          onMouseLeave={(e) => {
                                                              // Hide tooltip
                                                              e.currentTarget.querySelector('.users').classList.remove('show');
                                                          }}>
                                                                    {reaction.emoji} {reaction.users.split(',').length}&nbsp;
                                                        <span className="users">{reaction.users}</span>
                                                                </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="message-reactions">
                                            {['😀', '❤️', '👍'].map(emoji => (
                                                <button type="button" className="btn btn-outline-light" key={emoji}
                                                        onClick={() => props.handleAddReaction(reply.id, emoji)}>{emoji}</button>
                                            ))}
                                        </div>

                                    </div>
                                ))
                            ) : (
                                <p>No replies yet.</p>
                            )}
                            {(<div></div>)}


                            <div className="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3 comment_box">
                                <textarea
                                    name="comment"
                                    value={props.replyInput[props.selectedMessageId] || ''}
                                    onChange={(e) => props.setReplyInput({
                                        ...props.replyInput,
                                        [props.selectedMessageId]: e.target.value
                                    })}
                                    placeholder="What you want to reply?"
                                ></textarea>
                                <button className="btn btn-primary"
                                        onClick={(e) => props.handlePostReply(e, props.selectedMessageId)}>Reply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}


// TODO: --------------------------------------------- 404 Component ---------------------------------------------
function NotFoundPage() {
    document.title = "HackaChat 404 Page";
    return (
        <div className="notFound">
            <div className="header">
                <h2><a href="/">HackaChat</a></h2>
                <h4>404 Error</h4>
            </div>
            <div className="clip">
                <div className="container">
                    <h1>404</h1>
                    <div className="message">
                        <h2>Oops, we can't find that page!</h2>
                        <a href="/">Let's go home and try again.</a>
                    </div>
                </div>
            </div>
        </div>
    );
}


// Render the App component
const rootContainer = document.getElementById('root');
const root = ReactDOM.createRoot(rootContainer);
root.render(<App/>);
