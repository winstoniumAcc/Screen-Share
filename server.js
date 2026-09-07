const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;


// ========================================
// STATIC FILES
// ========================================

app.use(express.static(path.join(__dirname, "public")));


// ========================================
// PAGES
// ========================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "participant.html")
    );
});

app.get("/participant", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "participant.html")
    );
});

app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "Admin.html")
    );
});


// ========================================
// WEBRTC ICE CONFIG
// ========================================
//
// Add these environment variables in Render:
//
// TURN_URL
// TURN_USERNAME
// TURN_PASSWORD
//
// Example:
// TURN_URL=turn:your-turn-server.com:3478
//

app.get("/ice-config", (req, res) => {

    const iceServers = [
        {
           { urls: "stun:stun.relay.metered.ca:80", }, { urls: "turn:global.relay.metered.ca:80", username: "827a93ca2e7e93b4d15f094d", credential: "o8h4jqAFDO9qDUwO", }, { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "827a93ca2e7e93b4d15f094d", credential: "o8h4jqAFDO9qDUwO", }, { urls: "turn:global.relay.metered.ca:443", username: "827a93ca2e7e93b4d15f094d", credential: "o8h4jqAFDO9qDUwO", }, { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "827a93ca2e7e93b4d15f094d", credential: "o8h4jqAFDO9qDUwO", },
        }
    ];


    // Add TURN only if configured
    if (
        process.env.TURN_URL &&
        process.env.TURN_USERNAME &&
        process.env.TURN_PASSWORD
    ) {

        iceServers.push({
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_PASSWORD
        });

    }


    res.json({
        iceServers
    });

});


// ========================================
// SOCKET.IO
// ========================================

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);


    // ====================================
    // PARTICIPANT JOINS
    // ====================================

    socket.on("join-participant", (name) => {

        socket.data.role = "participant";
        socket.data.name =
            String(name || "Unknown").trim();

        socket.data.screenReady = false;

        console.log(
            `Participant joined: ${socket.data.name}`
        );


        socket.broadcast.emit(
            "participant-joined",
            {
                socketId: socket.id,
                name: socket.data.name,
                screenReady: false
            }
        );

    });


    // ====================================
    // ADMIN JOINS
    // ====================================

    socket.on("join-admin", (password) => {

    if (
        !process.env.ADMIN_PASSWORD ||
        password !== process.env.ADMIN_PASSWORD
    ) {

        socket.emit("admin-denied");

        return;
    }


    socket.data.role = "admin";

    console.log(
        "Admin authenticated:",
        socket.id
    );


    // Tell browser authentication succeeded
    socket.emit("admin-authenticated");


    const participants = [];

    for (
        const client
        of io.sockets.sockets.values()
    ) {

        if (
            client.data.role === "participant" &&
            client.data.name
        ) {

            participants.push({

                socketId: client.id,

                name: client.data.name,

                screenReady:
                    client.data.screenReady === true

            });

        }

    }


        socket.emit(
            "participant-list",
            participants
        );

    });


    // ====================================
    // SCREEN READY
    // ====================================

    socket.on("screen-ready", () => {

        if (
            socket.data.role !== "participant"
        ) {
            return;
        }


        socket.data.screenReady = true;


        console.log(
            `Screen ready: ${socket.data.name}`
        );


        socket.broadcast.emit(
            "screen-ready",
            {
                socketId: socket.id,
                name: socket.data.name
            }
        );

    });


    // ====================================
    // SCREEN STOPPED
    // ====================================

    socket.on("screen-stopped", () => {

        if (
            socket.data.role !== "participant"
        ) {
            return;
        }


        socket.data.screenReady = false;


        console.log(
            `Screen stopped: ${socket.data.name}`
        );


        socket.broadcast.emit(
            "screen-stopped",
            {
                socketId: socket.id,
                name: socket.data.name
            }
        );

    });


    // ====================================
    // WEBRTC OFFER
    // ====================================

    socket.on(
        "offer",
        ({ target, offer }) => {

            if (!target || !offer) {
                return;
            }


            io.to(target).emit(
                "offer",
                {
                    sender: socket.id,
                    offer
                }
            );

        }
    );


    // ====================================
    // WEBRTC ANSWER
    // ====================================

    socket.on(
        "answer",
        ({ target, answer }) => {

            if (!target || !answer) {
                return;
            }


            io.to(target).emit(
                "answer",
                {
                    sender: socket.id,
                    answer
                }
            );

        }
    );


    // ====================================
    // ICE CANDIDATE
    // ====================================

    socket.on(
        "ice-candidate",
        ({ target, candidate }) => {

            if (!target || !candidate) {
                return;
            }


            io.to(target).emit(
                "ice-candidate",
                {
                    sender: socket.id,
                    candidate
                }
            );

        }
    );


    // ====================================
    // DISCONNECT
    // ====================================

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                `Disconnected: ${socket.id}`,
                reason
            );


            if (
                socket.data.role ===
                "participant"
            ) {

                io.emit(
                    "participant-left",
                    {
                        socketId: socket.id,
                        name: socket.data.name
                    }
                );

            }

        }
    );

});


// ========================================
// START
// ========================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);