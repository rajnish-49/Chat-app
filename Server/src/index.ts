import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

interface User {
  socket: WebSocket;
  room: string;
  username: string;
  lastMessageTime: number;
  messageCount: number;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:3000"];
const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_WINDOW = 1000;
const RATE_LIMIT_MAX_MESSAGES = 5;

const wss = new WebSocketServer({
  port: PORT,
  verifyClient: (info: { origin: string; req: IncomingMessage }) => {
    if (!info.origin) return true;
    return ALLOWED_ORIGINS.includes(info.origin);
  },
});

console.log(`WebSocket server started on port ${PORT}`);
console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);

let allsockets: User[] = [];

wss.on("connection", (socket) => {
  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (!data.type || !data.payload) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format. Expected 'type' and 'payload' fields.",
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

        if (data.payload.username.length > 50 || data.payload.roomid.length > 50) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Username and room ID must be 50 characters or less.",
            })
          );
          return;
        }

        allsockets.push({
          socket: socket,
          room: data.payload.roomid,
          username: data.payload.username,
          lastMessageTime: 0,
          messageCount: 0,
        });

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

        if (data.payload.message.length > MAX_MESSAGE_LENGTH) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`,
            })
          );
          return;
        }

        const now = Date.now();
        if (now - user.lastMessageTime < RATE_LIMIT_WINDOW) {
          user.messageCount++;
          if (user.messageCount > RATE_LIMIT_MAX_MESSAGES) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "You are sending messages too fast. Please slow down.",
              })
            );
            return;
          }
        } else {
          user.lastMessageTime = now;
          user.messageCount = 1;
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
    allsockets = allsockets.filter((u) => u.socket !== socket);
    console.log("User disconnected. Active connections:", allsockets.length);
  });
});
