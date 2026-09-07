const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const participants = new Map();

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("join-participant", (name) => {
        participants.set(socket.id, {
            name: name || "Unknown",
            socketId: socket.id
        });

        io.emit("participant-joined", {
            socketId: socket.id,
            name: name || "Unknown"
        });

        socket.emit(
            "participant-list",
            Array.from(participants.values())
        );
    });

    socket.on("join-admin", () => {
        socket.emit(
            "participant-list",
            Array.from(participants.values())
        );
    });

    socket.on("offer", ({ target, offer }) => {
        io.to(target).emit("offer", {
            sender: socket.id,
            offer
        });
    });

    socket.on("answer", ({ target, answer }) => {
        io.to(target).emit("answer", {
            sender: socket.id,
            answer
        });
    });

    socket.on("ice-candidate", ({ target, candidate }) => {
        io.to(target).emit("ice-candidate", {
            sender: socket.id,
            candidate
        });
    });

    socket.on("disconnect", () => {
        if (participants.has(socket.id)) {
            const participant = participants.get(socket.id);

            participants.delete(socket.id);

            io.emit("participant-left", {
                socketId: socket.id,
                name: participant.name
            });

            console.log("Left:", participant.name);
        }
    });
});

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});