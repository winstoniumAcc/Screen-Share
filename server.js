const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/participant", (req, res) => {
    res.sendFile(__dirname + "/public/participant.html");
});

app.get("/admin", (req, res) => {
    res.sendFile(__dirname + "/public/admin.html");
});

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    socket.on("join-participant", (name) => {

        socket.data.name = name;

        socket.broadcast.emit("participant-joined", {
            socketId: socket.id,
            name: name
        });

        socket.emit("participant-list",
            [...io.sockets.sockets.values()]
                .filter(s => s.data.name)
                .map(s => ({
                    socketId: s.id,
                    name: s.data.name
                }))
        );
    });

    socket.on("offer", data => {
        io.to(data.target).emit("offer", {
            sender: socket.id,
            offer: data.offer
        });
    });

    socket.on("answer", data => {
        io.to(data.target).emit("answer", {
            sender: socket.id,
            answer: data.answer
        });
    });

    socket.on("ice-candidate", data => {
        io.to(data.target).emit("ice-candidate", {
            sender: socket.id,
            candidate: data.candidate
        });
    });

    socket.on("disconnect", () => {

        if (socket.data.name) {

            io.emit("participant-left", {
                socketId: socket.id,
                name: socket.data.name
            });

            console.log(
                `${socket.data.name} disconnected`
            );
        }
    });

});


// IMPORTANT:
// 0.0.0.0 allows connections from outside the server.
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});