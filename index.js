const io = require('socket.io')(8900, {
    cors : {
        origin  : '*'
    }
});

let users = [];

const addUser = (userId, socketId) => {
    const existingUserIndex = users.findIndex(user => user.userId === userId);

    if (existingUserIndex !== -1) {
        users[existingUserIndex].socketId = socketId;
    } else {
        users.push({
            userId,
            socketId
        });
    }
}

io.on('connection', (socket)=>{
    console.log('a user connected...', socket.id)
    console.log(socket.handshake.query.userId);
    //new connection
    addUser(socket.handshake.query.userId, socket.id);
    console.log('after adding new user', users);
    io.emit('onlineUsers', users);

    //send message
    socket.on('sendMessage', (message)=>{
        const user = users.find((user)=> user.userId === message.recieverId );
        console.log(user);
        if(user){
            io.to(socket.id).emit('newMessage', message);
            io.to(user.socketId).emit('newMessage', message);
        }
    })

    //typing
    socket.on('typing', async (id)=>{
        console.log('isTyping', id.userId);
        const user = await users.find((user)=> user.userId === id.recipientId );
        if(user){
            const details = {
                userId : id.userId
            }
            io.to(user.socketId).emit('userTyping', details);
        }
    });

    //not typing
    socket.on('notTyping', (id)=>{
        console.log('notTyping', id);
        const user = users.find((user)=> user.userId === id.recipientId );
        if(user){
            io.to(user.socketId).emit('userNotTyping', id.userId);
        }
    });
    
    //connection terminating
    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
    
        console.log('after disconnection users', users);
    
        io.emit('onlineUsers', users);
    });
})