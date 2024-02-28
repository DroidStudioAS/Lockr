import { Server } from "socket.io";
import express from 'express';
import path from 'path';
import { fileURLToPath } from "url";
import { text } from "stream/consumers";
import { builtinModules } from "module";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

const ADMIN = "Admin";
const PORT = process.env.PORT || 3500

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});

//state for users
const usersState = {
    users: [],
    setUsers: function (newUsers) {
        this.users = newUsers;
    }
}

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false :
            ["http://localhost:5501", "http://127.0.0.1:5501"]
    }
});

io.on('connection', socket => {
    console.log(`User: ${socket.id} connected`)

    //send message to user that connected
    socket.emit('message', buildMessage(ADMIN, "Welcome To Lockr").text)
    //notify all other users that user is connected
    socket.broadcast.emit('message', `User: ${socket.id.substring(0, 5)} Connected`);

    socket.on('enterRoom', ({ name, room }) => {
        //Leave a previous room
        const prevRoom = getUser(socket.id)?.room;
        if (prevRoom) {
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMessage(ADMIN, `${name} has left`))
        }

        const user = activateUser(socket.id, name, room);
        //cannot update previours room users list
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            })
        }

        socket.join(user.room)
        //to user who joined
        socket.emit('message', buildMessage(ADMIN, `You Have Joined ${user.room} Chat`));
        //to everyone else
        socket.broadcast.to(user.room).emit('message', buildMessage(ADMIN, `User ${user.name} Joined The Room`));
        //update user list for the active room
        io.to(user.room).emit('userlist', {
            users: getUsersInRoom(user.room)
        });
        //update the active room list
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        })
    })
    //listening for disconnection
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeft(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} left the room`));
            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room);
            })
            io.emit('roomList', {
                rooms: getAllActiveRooms();
            })
        }
    });

    //listening for a message event
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMessage(name, text));
        }
        io.emit('message', `${socket.id.substring(0, 5)}: ${data}`)
    })

    //listen for activity
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
        socket.broadcast.emit('activity', name.substring(0, 5))
    })
})

function buildMessage(name, text) {
    return {
        'name': name,
        "text": text,
        "time": new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}
//user functions
function activateUser(id, name, room) {
    const user = { id, name, room }
    usersState.setUsers([
        ...usersState.users.filter(user => user.id !== id),
        user
    ])
    return user;
}
function userLeft(id) {
    usersState.setUsers(
        usersState.users.filter(user => user.id !== id)
    )
}
function getUser(id) {
    return usersState.users.find(user => user.id === id);
}
function getUsersInRoom(room) {
    return usersState.users.filter(user => user.room === room);
}
function getAllActiveRooms() {
    return Array.from(new Set(usersState.users.map(user => user.room)))

}

