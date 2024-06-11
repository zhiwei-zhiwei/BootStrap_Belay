# HackaChat

HackaChat is a chat application built with a combination of Python, JavaScript, and SQL. It provides a platform for users to create channels, post messages, and interact with each other through replies and reactions.

## Features

- User authentication: Users can sign up and log in to the application.
- Channels: Users can create and join different channels.
- Messages: Users can post messages in a channel.
- Replies: Users can reply to messages in a thread-like manner.
- Reactions: Users can react to messages with emojis.
- Unread messages: The application keeps track of unread messages for each user.

## Tech Stack

- Frontend: JavaScript
- Backend: Python (Flask)
- Database: SQL (SQLite3)
- Framework: BootStrap

## Setup

1. Clone the repository to your local machine.
2. Install the required Python packages by running `pip3 install -r requirements.txt`.
3. Run the Python server by executing `python3 app.py`.

## File Structure

- `app.py`: This is the main Python file that runs the Flask server and handles all the backend logic.
- `static/index.js`: This JavaScript file handles the frontend logic of the application.
- `requirements.txt`: This file lists all the Python packages required for the project.
- `db/HackaChat.sqlite3`: This is the SQLite3 database file.

## API Endpoints

The application provides several API endpoints for handling different functionalities. These include:

- `/api/signup`: For user registration.
- `/api/login`: For user login.
- `/api/profile`: For getting and updating user profile.
- `/api/channel`: For getting all channels and creating a new channel.
- `/api/channel/<int:channel_id>`: For getting and updating a specific channel.
- `/api/channel/<int:channel_id>/messages`: For getting all messages in a channel and posting a new message.
- `/api/message/<int:msg_id>`: For getting a specific message.
- `/api/message/<int:message_id>/reaction`: For getting and adding reactions to a message.
- `/api/message/<int:message_id>/reply`: For getting and adding replies to a message.
- `/api/channel/<int:channel_id>/count-replies`: For getting the count of replies for each message in a channel.
