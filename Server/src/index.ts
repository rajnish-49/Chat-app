import { WebSocketServer, WebSocket } from "ws";

interface User {
  socket: WebSocket;
  room: string;
  username: string;
}

const wss = new WebSocketServer({ port: 8080 });

let allsockets: User[] = [];

wss.on("connection", (socket) => {
  socket.on("message", (message) => {
    try {
      // Parsing
      const data = JSON.parse(message.toString());

      // Validate 
      if (!data.type || !data.payload) {
        socket.send(
          JSON.stringify({
            type: "error",
            message:
              "Invalid message format. Expected 'type' and 'payload' fields.",
          })
        );
        return;
      }

      if (data.type === "join") {
        if (!data.payload.roomid || !data.payload.username) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Room ID and username are required to join a room.",
            })
          );
          return;
        }

        allsockets.push({
          socket: socket,
          room: data.payload.roomid,
          username: data.payload.username,
        });

        //  confirmation
        socket.send(
          JSON.stringify({
            type: "joined",
            payload: {
              roomid: data.payload.roomid,
              username: data.payload.username,
            },
          })
        );
      }

      if (data.type === "message") {
        const user = allsockets.find((u) => u.socket === socket);
        if (!user) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "You must join a room before sending messages.",
            })
          );
          return;
        }

        if (!data.payload.message) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Message content is required.",
            })
          );
          return;
        }

        const roomSockets = allsockets.filter((u) => u.room === user.room);
        roomSockets.forEach((u) => {
          u.socket.send(
            JSON.stringify({
              type: "message",
              payload: {
                message: data.payload.message,
                username: user.username,
              },
            })
          );
        });
      }
    } catch (error) {
      console.error("Error processing message:", error);
      socket.send(
        JSON.stringify({
          type: "error",
          message: "Invalid JSON format.",
        })
      );
    }
  });

  socket.on("close", () => {
  // disconnection
    allsockets = allsockets.filter((u) => u.socket !== socket);
    console.log("User disconnected. Active connections:", allsockets.length);
  });
});
