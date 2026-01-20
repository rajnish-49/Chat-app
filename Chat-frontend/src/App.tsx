import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface ChatMessage {
  username: string;
  message: string;
  timestamp: Date;
}

function App() {
  const [username, setUsername] = useState("");
  const [roomid, setRoomid] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<number | null>(null);
  const savedCredentials = useRef<{ username: string; roomid: string } | null>(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
        setReconnecting(false);
        reconnectAttempts.current = 0;

        if (savedCredentials.current && ws.current) {
          ws.current.send(
            JSON.stringify({
              type: "join",
              payload: savedCredentials.current,
            })
          );
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "joined") {
            setJoined(true);
          }

          if (data.type === "message") {
            setMessages((prev) => [
              ...prev,
              {
                username: data.payload.username,
                message: data.payload.message,
                timestamp: new Date(),
              },
            ]);
          }

          if (data.type === "error") {
            setError(data.message);
            setTimeout(() => setError(null), 5000);
          }
        } catch {
          console.error("Failed to parse message");
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        attemptReconnect();
      };

      ws.current.onerror = () => {
        setError("Connection error. Attempting to reconnect...");
      };
    } catch {
      setError("Failed to connect to server");
      attemptReconnect();
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      setError("Unable to connect. Please refresh the page.");
      setReconnecting(false);
      return;
    }

    setReconnecting(true);
    reconnectAttempts.current++;

    reconnectTimeout.current = window.setTimeout(() => {
      connect();
    }, RECONNECT_DELAY);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
    };
  }, [connect]);

  const joinRoom = () => {
    if (ws.current && username && roomid) {
      savedCredentials.current = { username, roomid };
      ws.current.send(
        JSON.stringify({
          type: "join",
          payload: { username, roomid },
        })
      );
    }
  };

  const sendMessage = () => {
    if (ws.current && message.trim()) {
      ws.current.send(
        JSON.stringify({
          type: "message",
          payload: { message: message.trim() },
        })
      );
      setMessage("");
    }
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Join Chat Room</h1>
            <p className="text-gray-600 text-sm">Connect and start chatting</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {reconnecting && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg text-sm">
              Reconnecting... (Attempt {reconnectAttempts.current}/{MAX_RECONNECT_ATTEMPTS})
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Room ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={roomid}
                  onChange={(e) => setRoomid(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Enter room ID"
                />
              </div>
            </div>

            <button
              onClick={joinRoom}
              disabled={!connected || !username || !roomid}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {connected ? "Join Room" : "Connecting..."}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Room: {roomid}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{username}</span>
            <span>•</span>
            <span className={`flex items-center gap-1 ${connected ? "text-green-600" : "text-red-600"}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}></span>
              {connected ? "Connected" : reconnecting ? "Reconnecting..." : "Disconnected"}
            </span>
          </div>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-sm h-96 overflow-y-auto p-4 mb-4">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center">No messages yet...</div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-600">
                    {msg.username}:
                  </span>
                  <span>{msg.message}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 p-3 border border-gray-300 rounded-md"
              placeholder="Type your message..."
              disabled={!connected}
            />
            <button
              onClick={sendMessage}
              disabled={!connected || !message.trim()}
              className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
