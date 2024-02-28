import { Server } from "socket.io";
import express from 'express';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3500

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});



const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false :
            ["http://localhost:5501", "http://127.0.0.1:5501"]
    }
});

io.on('connection', socket => {
    console.log(`User: ${socket.id} connected`)

    //send message to user that connected
    socket.emit('message', 'Welcome to ChatApp')
    //notify all other users that user is connected
    socket.broadcast.emit('message', `User: ${socket.id.substring(0, 5)} Connected`);

    //listening for a message event
    socket.on('message', data => {
        console.log(data);
        io.emit('message', `${socket.id.substring(0, 5)}: ${data}`)
    })

    //listening for disconnection
    socket.on('disconnect', () => {
        socket.broadcast.emit('message', `User: ${socket.id.substring(0, 5)} Disconnected`);
    });
    //listen for activity
    socket.on('activity', (name) => {
        socket.broadcast.emit('activity', name.substring(0, 5))
    })
})

