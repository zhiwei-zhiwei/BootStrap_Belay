-- sqlite3 HackaChat.sqlite3 < create_tables.sql

create table users
(
    id       INTEGER PRIMARY KEY,
    name     VARCHAR(40) UNIQUE,
    password VARCHAR(40),
    api_key  VARCHAR(40)
);

create table channels
(
    id   INTEGER PRIMARY KEY,
    name VARCHAR(40) UNIQUE
);

create table messages
(
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER,
    channel_id INTEGER,
    body       TEXT,
    replies_to INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (channel_id) REFERENCES channels (id),
    FOREIGN KEY (replies_to) REFERENCES messages (id)
);

create table reactions
(
    id         INTEGER PRIMARY KEY,
    message_id INTEGER,
    user_id    INTEGER,
    emoji      TEXT,
    FOREIGN KEY (message_id) REFERENCES messages (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

create table user_message_views
(
    user_id           INTEGER,
    channel_id        INTEGER,
    last_message_seen INTEGER,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (channel_id) REFERENCES channels (id),
    FOREIGN KEY (last_message_seen) REFERENCES messages (id),
    PRIMARY KEY (user_id, channel_id)
);

INSERT INTO users (name, password, api_key)
VALUES ('user1', '123456', 'abcdef'),
       ('user2', '654321', 'fedcba');

INSERT INTO channels (name)
VALUES ('General'),
       ('Story');

INSERT INTO messages (user_id, channel_id, body, replies_to)
VALUES (1, 1, 'Hello everyone in General!', null),
       (2, 2, 'Any new stories for today?', null),
       (2, 1, 'Hi there! This is an reply.', 1);

INSERT INTO reactions (message_id, user_id, emoji)
VALUES (1, 1, '😀'),
       (2, 2, '🧐');
