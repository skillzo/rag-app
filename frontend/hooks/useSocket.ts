import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { COLORS } from "@/config";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(COLORS.ENV.BACKEND_URL, {
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("frontend connected to socket");
      setIsConnected(true);
      setErrorMessage(null);
    });

    socket.on("disconnect", () => {
      console.log("frontend disconnected from socket");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
      setErrorMessage(
        "Connection error. Please check if the server is running."
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    isConnected,
    socket: socketRef.current,
  };
}
