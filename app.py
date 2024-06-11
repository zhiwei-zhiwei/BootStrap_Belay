import sqlite3
import string
import random
from flask import Flask, g, jsonify, request

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect('db/HackaChat.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one:
            return rows[0]
        return rows
    return None


def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('INSERT INTO users (name, password, api_key) VALUES (?, ?, ?) RETURNING id, name, password, api_key',
                 (name, password, api_key), one=True)
    return u


@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/channel/<channel_id>')
@app.route('/channel/<channel_id>/thread/<msg_id>')
def index(channel_id=None, msg_id=None):
    return app.send_static_file('index.html')


@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404


# TODO: --------------------------------------------- API ROUTES ---------------------------------------------
@app.route('/api/signup', methods=['POST'])
def signup():
    print("signup")  # For debugging
    user = new_user()
    if user:
        response = {
            'status': 'success',
            'id': user['id'],
            'username': user['name'],
            'api_key': user['api_key']
        }
        return jsonify(response), 201
    else:
        return jsonify({
            'status': 'fail',
            'error': 'User creation failed'
        }), 500


@app.route('/api/login', methods=['POST'])
def login():
    print("login")  # For debugging
    if not request.is_json:
        return jsonify({
            'status': 'fail',
            'error': 'Missing JSON in request'
        }), 400

    username = request.get_json().get('username')
    password = request.get_json().get('password')

    if not username or not password:
        return jsonify({
            'status': 'fail',
            'error': 'Please provide both username and password'
        }), 400

    user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], one=True)
    if user:
        return jsonify({
            'status': 'success',
            "api_key": user['api_key'],
            "id": user['id'],
            'username': user['name']
        }), 200
    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid username or password'
        }), 403


@app.route('/api/profile', methods=['GET', 'POST'])
def profile():
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get profile info")  # For debugging
        return jsonify({
            'status': 'success',
            'id': user['id'],
            'username': user['name'],
            'password': user['password'],
            'api_key': user['api_key']
        }), 200

    elif request.method == 'POST':
        print("update profile")  # For debugging
        updated_name = request.get_json().get('name')
        updated_password = request.get_json().get('password')
        if updated_name:
            query_db('UPDATE users SET name = ? WHERE api_key = ?', [updated_name, api_key])
        if updated_password:
            query_db('UPDATE users SET password = ? WHERE api_key = ?', [updated_password, api_key])

        return jsonify({
            'status': 'success',
            'id': user['id'],
            'username': updated_name,
            'password': updated_password,
            'api_key': user['api_key']
        }), 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/channel', methods=['GET'])
def get_channels():
    print("get all channels")  # For debugging
    channels = query_db('SELECT * FROM channels')
    if channels:
        return jsonify([dict(r) for r in channels]), 200
    else:
        return jsonify([]), 200


@app.route('/api/channel', methods=['POST'])
def create_channel():
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    print("create channel")  # For debugging
    new_channel_name = "Unnamed Channel " + ''.join(random.choices(string.digits, k=6))
    channel = query_db('INSERT INTO channels (name) VALUES (?) RETURNING id, name', [new_channel_name], one=True)
    return jsonify({
        'status': 'success',
        'id': channel['id'],
        'name': channel['name']
    }), 200


@app.route('/api/channel/<int:channel_id>', methods=['GET', 'POST'])
def channel_name(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get channel info")  # For debugging
        channel = query_db('SELECT * FROM channels WHERE id = ?', [channel_id], one=True)
        if channel:
            return jsonify({
                'status': 'success',
                'id': channel['id'],
                'name': channel['name'],
                'username': user['name']
            }), 200
        else:
            return jsonify({'status': 'fail', 'error': 'channel does not exist'}), 404

    elif request.method == 'POST':
        print("update channel name")  # For debugging
        new_channel_name = request.get_json().get('name')
        query_db('UPDATE channels SET name = ? WHERE id = ?', [new_channel_name, channel_id])
        return jsonify({'status': 'success'}), 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/channel/<int:channel_id>/messages', methods=['GET', 'POST'])
def messages(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        print("get messages")  # For debugging
        messages = query_db(
            'SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.id WHERE channel_id = ? AND replies_to IS NULL',
            [channel_id])
        if messages:
            return jsonify([dict(m) for m in messages]), 200
        else:
            return jsonify([]), 200

    elif request.method == 'POST':
        print("post message")  # For debugging
        message = request.get_json().get('body')
        user_id = user['id']
        query_db('INSERT INTO messages (user_id, channel_id, body) VALUES (?, ?, ?)', [user_id, channel_id, message])
        return {}, 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/message/<int:msg_id>', methods=['GET'])
def get_message(msg_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    print("get a message")  # For debugging
    message = query_db(
        'SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.id WHERE messages.id = ?',
        [msg_id], one=True)
    if message:
        return jsonify(dict(message)), 200
    else:
        return jsonify({'status': 'fail', 'error': 'message not found'}), 404


@app.route('/api/check_valid/<int:channel_id>/<int:msg_id>', methods=['GET'])
def check_valid(channel_id, msg_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    print("check if thread exists in channel")  # For debugging
    message = query_db('SELECT * FROM messages WHERE id = ? AND channel_id = ?', [msg_id, channel_id], one=True)
    if message:
        return jsonify({'status': 'success'}), 200
    else:
        return jsonify({'status': 'fail'}), 404


@app.route('/api/channel/<int:channel_id>/last-viewed', methods=['POST'])
def update_last_message_seen(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    print("update last message seen")  # For debugging
    last_message_seen = request.get_json().get('last_message_id_seen')
    if not all([channel_id, last_message_seen]):
        return jsonify({'status': 'fail', 'error': 'Missing required fields'})

    existing_view = query_db('SELECT * FROM user_message_views WHERE user_id = ? AND channel_id = ?',
                             [user['id'], channel_id], one=True)
    if existing_view:
        query_db('UPDATE user_message_views SET last_message_seen = ? WHERE user_id = ? AND channel_id = ?',
                 [last_message_seen, user['id'], channel_id])
    else:
        query_db('INSERT INTO user_message_views (user_id, channel_id, last_message_seen) VALUES (?, ?, ?)',
                 [user['id'], channel_id, last_message_seen])

    return jsonify({'status': 'success',
                    'message': 'User message view updated successfully'}), 200


@app.route('/api/user/unread-messages', methods=['GET'])
def get_unread_messages_count():
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    channels = query_db('SELECT * FROM channels')
    unread_messages_counts = []

    for channel in channels:
        last_viewed_message_id = query_db(
            'SELECT last_message_seen FROM user_message_views WHERE user_id = ? AND channel_id = ?',
            [user['id'], channel['id']], one=True)

        if last_viewed_message_id:
            unread_count = query_db(
                'SELECT count(*) AS count FROM messages WHERE channel_id = ? AND id > ? AND replies_to IS NULL',
                [channel['id'], last_viewed_message_id['last_message_seen']], one=True)
        else:
            unread_count = query_db(
                'SELECT count(*) AS count FROM messages WHERE channel_id = ? AND replies_to IS NULL',
                [channel['id']], one=True)

        unread_messages_counts.append({'channel_id': channel['id'], 'unread_count': unread_count['count']})

    return jsonify(unread_messages_counts), 200


@app.route('/api/message/<int:message_id>/reaction', methods=['GET', 'POST'])
def reaction(message_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'POST':
        print("add emoji")  # For debugging
        emoji = request.get_json().get('emoji')
        if not emoji:
            return jsonify({'status': 'fail', 'error': 'Emoji is required'}), 400

        existing_reaction = query_db('SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?',
                                     [message_id, user['id'], emoji], one=True)
        if existing_reaction:
            # Reaction already exists, so we do nothing or update it as needed
            return jsonify({'status': 'success', 'message': 'Reaction already exists'}), 200
        else:
            # Insert new reaction
            query_db('INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)', [message_id, user['id'], emoji])
            return jsonify({'status': 'success', 'message': 'Reaction added'}), 201

    elif request.method == 'GET':
        print("get emoji")  # For debugging
        reactions = query_db(
            'SELECT emoji, GROUP_CONCAT(users.name) AS users FROM reactions JOIN users ON reactions.user_id = users.id WHERE message_id = ? GROUP BY emoji',
            [message_id])
        if reactions:
            return jsonify([dict(row) for row in reactions]), 200
        else:
            return jsonify([]), 200

    else:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid method. Only takes POST and GET methods in the request'
        }), 400


@app.route('/api/message/<int:message_id>/reply', methods=['GET', 'POST'])
def reply(message_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    if request.method == 'GET':
        replies = query_db('SELECT * FROM messages LEFT JOIN users ON messages.user_id = users.id WHERE replies_to = ?',
                           [message_id])
        if replies:
            return jsonify([dict(r) for r in replies]), 200
        else:
            return jsonify([]), 200

    elif request.method == 'POST':
        reply = request.get_json().get('body')
        if reply:
            query_db('INSERT INTO messages (user_id, replies_to, body) VALUES (?, ?, ?)',
                     [user['id'], message_id, reply])
            return jsonify({'status': 'success'}), 200
        else:
            return jsonify({'status': 'fail', 'error': 'Missing reply body'}), 400


@app.route('/api/channel/<int:channel_id>/count-replies', methods=['GET'])
def get_message_replies_count(channel_id):
    api_key = request.headers.get('Authorization')
    if not api_key:
        return jsonify({
            'status': 'fail',
            'error': 'Missing API key in request header'
        }), 400

    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    if not user:
        return jsonify({
            'status': 'fail',
            'error': 'Invalid API key'
        }), 403

    messages = query_db('SELECT * FROM messages WHERE channel_id = ? AND replies_to IS NULL', [channel_id])

    if messages:
        reply_counts = []
        for message in messages:
            count = query_db('SELECT count(*) AS count FROM messages WHERE replies_to = ?', [message['id']], one=True)

            reply_counts.append({
                'message_id': message['id'],
                'reply_count': count['count']
            })

        return jsonify(reply_counts), 200
    else:
        return jsonify([]), 200
