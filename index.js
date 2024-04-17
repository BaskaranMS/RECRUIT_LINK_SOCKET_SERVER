const io = require('socket.io')(8900, {
    cors : {
        origin  : '*'
    }
});

let users = [];

const addUser = (userId, socketId, peerId) => {
    const existingUserIndex = users.findIndex(user => user.userId === userId);

    if (existingUserIndex !== -1) {
        users[existingUserIndex].socketId = socketId;
    } else {
        users.push({
            userId,
            socketId,
            peerId
        });
    }
}

io.on('connection', (socket)=>{
    console.log('a user connected...', socket.id)
    console.log(socket.handshake.query.userId);
    console.log('peerId', socket.handshake.query.peerId);
    //new connection
    addUser(socket.handshake.query.userId, socket.id, socket.handshake.query.peerId);
    console.log('after adding new user', users);
    io.emit('onlineUsers', users);

    //send message
    socket.on('sendMessage', (message)=>{
        const user = users.find((user)=> user.userId === message.recieverId );
        console.log(user);
        if(user){
            // io.to(socket.id).emit('newMessage', message);
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
            const details = {
                userId : id.userId
            }
            io.to(user.socketId).emit('userNotTyping', details);
        }
    });
    
    //connection terminating
    socket.on('disconnect', () => {
        users = users.filter(user => user.socketId !== socket.id);
    
        console.log('after disconnection users', users);
    
        io.emit('onlineUsers', users);
    });

    socket.on('getPeerId', (id)=>{
        const user = users.filter((user)=>{
            return user.userId === id;
        });
        console.log(user);
        io.to(socket.id).emit('peerIdResponse', user[0].peerId);
    });

    //find target peerId
    socket.on('findPeer', (data)=>{
        console.log(data.userId);
        const user = users.filter((user)=>{
            return user.userId === data.userId
        });
        if(user.length > 0 ){
            io.to(socket.id).emit('findPeerResponse', {
                msg : user[0].peerId
            });
        }else{
            io.to(socket.id).emit('findPeerResponse', {
                msg : 'user is not online'
            })
        }
    })

    //call user
    socket.on('callUser', (data)=>{
        const user = users.filter((user)=>{
            return user.userId === data.userToCall;
        });
        if(user){
            io.to(user[0].socketId).emit('callUser', { signal : data.signalData, from : data.from, name : data.name });
        }else{
            console.log('no user found...', data);
        }
    });

    //call answer
    socket.on("answerCall", (data) => {
        const user = users.filter((user)=>{
            return user.userId === data.to;
        });
        if(user){
            io.to(user[0].socketId).emit("callAccepted", data.signal)
        }else{
            console.log('no user found...', data);
        }
	})
})