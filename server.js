const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);


// =========================
// SERVE WEBSITE
// =========================

app.use(express.static(path.join(__dirname, "public")));


// =========================
// PARTICIPANT PAGE
// =========================

app.get("/participant", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "participant.html")
    );

});


// =========================
// ADMIN PAGE
// =========================

app.get("/admin", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "Admin.html")
    );

});


// =========================
// ROOT PAGE
// =========================

app.get("/", (req, res) => {

    res.send(`
        <h1>Event Screen Share</h1>

        <p>
            <a href="/participant">
                Participant
            </a>
        </p>

        <p>
            <a href="/admin">
                Admin
            </a>
        </p>
    `);

});


// =========================
// SOCKET.IO
// =========================

io.on("connection", (socket) => {

    console.log(
        "Connected:",
        socket.id
    );


    // =========================
    // PARTICIPANT JOINS
    // =========================

    socket.on("join-participant", (name) => {

        socket.data.role = "participant";

        socket.data.name =
            name?.trim() || "Unknown";


        console.log(
            "Participant joined:",
            socket.data.name,
            socket.id
        );


        // Tell admin/other clients
        // that a participant joined

        socket.broadcast.emit(
            "participant-joined",
            {
                socketId: socket.id,
                name: socket.data.name
            }
        );

    });


    // =========================
    // ADMIN JOINS
    // =========================

    socket.on("join-admin", () => {

        socket.data.role = "admin";


        console.log(
            "Admin joined:",
            socket.id
        );


        // Get currently connected participants

        const participants = [
            ...io.sockets.sockets.values()
        ]
            .filter(
                s =>
                    s.data.role === "participant" &&
                    s.data.name
            )
            .map(
                s => ({
                    socketId: s.id,
                    name: s.data.name
                })
            );


        // Send list to admin

        socket.emit(
            "participant-list",
            participants
        );

    });


    // =========================
    // SCREEN READY
    // =========================

    socket.on("screen-ready", () => {

        if (
            socket.data.role !== "participant"
        ) {
            return;
        }


        console.log(
            "Screen ready:",
            socket.data.name
        );


        // Tell everyone EXCEPT
        // the participant

        socket.broadcast.emit(
            "screen-ready",
            {
                socketId: socket.id,
                name: socket.data.name
            }
        );

    });


    // =========================
    // SCREEN STOPPED
    // =========================

    socket.on("screen-stopped", () => {

        if (
            socket.data.role !== "participant"
        ) {
            return;
        }


        console.log(
            "Screen stopped:",
            socket.data.name
        );


        socket.broadcast.emit(
            "screen-stopped",
            {
                socketId: socket.id,
                name: socket.data.name
            }
        );

    });


    // =========================
    // WEBRTC OFFER
    // =========================

    socket.on(
        "offer",
        ({ target, offer }) => {

            if (
                !target ||
                !offer
            ) {
                return;
            }


            io.to(target).emit(
                "offer",
                {
                    sender: socket.id,
                    offer: offer
                }
            );

        }
    );


    // =========================
    // WEBRTC ANSWER
    // =========================

    socket.on(
        "answer",
        ({ target, answer }) => {

            if (
                !target ||
                !answer
            ) {
                return;
            }


            io.to(target).emit(
                "answer",
                {
                    sender: socket.id,
                    answer: answer
                }
            );

        }
    );


    // =========================
    // ICE CANDIDATE
    // =========================

    socket.on(
        "ice-candidate",
        ({ target, candidate }) => {

            if (
                !target ||
                !candidate
            ) {
                return;
            }


            io.to(target).emit(
                "ice-candidate",
                {
                    sender: socket.id,
                    candidate: candidate
                }
            );

        }
    );


    // =========================
    // DISCONNECT
    // =========================

    socket.on(
        "disconnect",
        (reason) => {

            console.log(
                "Disconnected:",
                socket.id,
                reason
            );


            // Only participants
            // should trigger participant-left

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


                console.log(
                    `${socket.data.name} disconnected`
                );

            }

        }
    );

});


// =========================
// START SERVER
// =========================

const PORT =
    process.env.PORT || 3000;


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);