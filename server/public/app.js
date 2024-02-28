
const socket = io('ws://localhost:3500')

const activity = document.querySelector('.activity');
const msgInput = document.querySelector('input');

function sendMessage(e) {
    e.preventDefault();
    if (msgInput.value) {
        socket.emit('message', msgInput.value);
        msgInput.value = ""
    }
    msgInput.focus();
}

document.querySelector('form')
    .addEventListener('submit', sendMessage);

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', socket.id.substring(0.5))
})

let activityTimer
socket.on('activity', (name) => {
    activity.textContent = `${name} is typing`;

    //clear after 1.5 seconds of inactivity
    clearTimeout(activityTimer)
    activityTimer = setTimeout(() => {
        activity.textContent = ""
    }, 1500);
})
//message listener
socket.on('message', (data) => {
    activity.textContent = '';
    const li = document.createElement('li');
    li.textContent = data;
    document.querySelector('ul').appendChild(li);
})
