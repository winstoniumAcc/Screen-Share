io.on("connection", (socket) => {

    console.log("Connected:", socket.id);


    socket.on("join-participant", (name) => {

        socket.data.name = name || "Unknown";

        socket.emit(
            "participant-list",
            [...io.sockets.sockets.values()]
                .filter(s => s.data.name)
                .map(s => ({
                    socketId: s.id,
                    name: s.data.name
                }))
        );

        socket.broadcast.emit("participant-joined", {
            socketId: socket.id,
            name: socket.data.name
        });
    });


    socket.on("join-admin", () => {

        socket.emit(
            "participant-list",
            [...io.sockets.sockets.values()]
                .filter(s => s.data.name)
                .map(s => ({
                    socketId: s.id,
                    name: s.data.name
                }))
        );

    });


    // Participant says their screen is ready
    socket.on("screen-ready", () => {

        io.emit("screen-ready", {
            socketId: socket.id,
            name: socket.data.name
        });

    });


    // WebRTC offer
    socket.on("offer", ({ target, offer }) => {

        io.to(target).emit("offer", {
            sender: socket.id,
            offer: offer
        });

    });


    // WebRTC answer
    socket.on("answer", ({ target, answer }) => {

        io.to(target).emit("answer", {
            sender: socket.id,
            answer: answer
        });

    });


    // ICE
    socket.on("ice-candidate", ({ target, candidate }) => {

        io.to(target).emit("ice-candidate", {
            sender: socket.id,
            candidate: candidate
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