import { SafeAreaView } from "react-native-safe-area-context";
import "../global.css";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { COLORS } from "@/config";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

const CHAT_BG = require("../assets/images/chat/whatsappbg.webp");

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

interface Message {
  id: string;
  createdAt: Date;
  role: string;
  content: string;
}

interface ResponseData {
  sessionId: string;
  content: string;
}

export default function Index() {
  const { socket, isConnected } = useSocket();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const messageRefs = useRef<{ [key: string]: View | null }>({});

  // Initialize session on mount: try get-session first, else start new interview
  useEffect(() => {
    const startInterview = async () => {
      try {
        setIsWaitingForResponse(true);
        const response = await fetch(`${COLORS.ENV.BACKEND_URL}/api/v1/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        setIsWaitingForResponse(false);
        if (!response.ok) {
          throw new Error("Failed to start interview");
        }

        const data = await response.json();
        setSessionId(data.sessionId);
        await AsyncStorage.setItem(COLORS.ENV.SESSION_ID_KEY, data.sessionId);

        setMessageHistory([
          {
            id: "1",
            createdAt: new Date(),
            role: "INTERVIEWER",
            content: data.content,
          },
        ]);
      } catch (error) {
        console.error("Error starting interview:", error);
        setErrorMessage("Failed to start interview. Please try again.");
      }
    };

    const initSession = async () => {
      try {
        const storedSessionId = await AsyncStorage.getItem(
          COLORS.ENV.SESSION_ID_KEY
        );
        if (!storedSessionId) {
          startInterview();
          return;
        }

        const response = await fetch(
          `${COLORS.ENV.BACKEND_URL}/api/v1/get-session?sessionId=${encodeURIComponent(storedSessionId)}`
        );
        if (response.status === 404) {
          await AsyncStorage.removeItem(COLORS.ENV.SESSION_ID_KEY);
          startInterview();
          return;
        }
        if (!response.ok) {
          startInterview();
          return;
        }

        const data = await response.json();
        setSessionId(data.sessionId);
        setMessageHistory(
          data.history.map(
            (turn: { role: string; content: string }, i: number) => ({
              id: (i + 1).toString(),
              createdAt: new Date(),
              role: turn.role,
              content: turn.content,
            })
          )
        );
      } catch (error) {
        console.error("Error loading session:", error);
        startInterview();
      }
    };

    initSession();
  }, []);

  const handleStartTyping = (e: string) => {
    setMessages(e);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleSendMessage = () => {
    if (!messages.trim() || !sessionId || !socket || !isConnected) {
      if (!isConnected) {
        setErrorMessage("Not connected to server. Please wait...");
      }
      return;
    }

    const messageContent = messages.trim();

    // Optimistic update - add message to UI immediately
    setMessageHistory((prev) => [
      ...prev,
      {
        id: (prev.length + 1).toString(),
        createdAt: new Date(),
        role: "CANDIDATE",
        content: messageContent,
      },
    ]);

    // Clear input and set waiting state
    setMessages("");
    setErrorMessage(null);

    // Send via WebSocket
    socket.emit("message", {
      sessionId,
      answer: messageContent,
    });
  };
  const handleThinking = (data: { message: boolean }) => {
    setIsWaitingForResponse(data.message);
  };

  useEffect(() => {
    if (!socket) return;

    const handleResponse = (data: ResponseData) => {
      setMessageHistory((prev) => [
        ...prev,
        {
          id: (prev.length + 1).toString(),
          createdAt: new Date(),
          role: "INTERVIEWER",
          content: data.content,
        },
      ]);
    };

    const handleError = (data: { message: string }) => {
      console.error("Socket error:", data.message);

      setErrorMessage(data.message || "An error occurred. Please try again.");
    };

    socket.on("response", handleResponse);
    socket.on("error", handleError);
    socket.on("ai_thinking", handleThinking);

    return () => {
      socket.off("response", handleResponse);
      socket.off("error", handleError);
      socket.off("ai_thinking", handleThinking);
    };
  }, [socket]);

  // Add after updating messageHistory
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messageHistory]);

  const handleLongPress = (msg: Message) => {
    const messageRef = messageRefs.current[msg.id];
    if (messageRef) {
      messageRef.measure((x, y, width, height, pageX, pageY) => {
        const isOutgoing = msg.role === "CANDIDATE";
        // Position menu below the message
        // For outgoing messages (right-aligned), align menu to the right edge of message
        // For incoming messages (left-aligned), align menu to the left edge
        const menuWidth = 200;
        const menuX = isOutgoing
          ? Math.max(12, pageX + width - menuWidth) // Right-align for outgoing
          : Math.min(pageX, 400); // Left-align for incoming, but keep within bounds

        setMenuPosition({
          x: menuX,
          y: pageY + height + 8, // Position menu below the message
        });
        setSelectedMessage(msg);
      });
    }
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.content);
      setSelectedMessage(null);
    }
  };

  const closeMenu = () => {
    setSelectedMessage(null);
  };

  return (
    <View className="flex-1">
      <SafeAreaView edges={["top"]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View className="flex-1 relative">
          <Image
            source={CHAT_BG}
            resizeMode="cover"
            className="flex-1 absolute top-0 left-0 right-0 bottom-0 w-full h-full opacity-50"
          />

          {/* Header */}
          <View className="fbc bg-white border-b border-gray-200 px-5 py-2">
            <View className="fcc">
              <View className="w-10 h-10 rounded-full fcc border border-gray-200">
                <Text className="">🤖</Text>
              </View>

              <View>
                <Text className="font-semibold text-gray-900 ml-2">
                  AI Interviewer
                </Text>

                <View className="flex-row items-center gap-1 ml-2">
                  <View
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-gray-500"
                    }`}
                  />
                  <Text className="text-xs text-gray-500">
                    {isConnected ? "Online" : "Offline"}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity>
                <Text className="text-2xl">
                  <Feather name="repeat" size={24} color="black" />
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center py-2">
              <View className="bg-gray-200/80 px-3 py-1 rounded-full">
                <Text className="text-gray-600 text-sm">Thu, 22 Jan</Text>
              </View>
            </View>
            {messageHistory.map((msg: Message) => {
              const isOutgoing = msg.role === "CANDIDATE";
              return (
                <Pressable
                  key={msg.id}
                  onLongPress={() => handleLongPress(msg)}
                  className={`mb-2 ${isOutgoing ? "items-end" : "items-start"}`}
                >
                  <View
                    ref={(ref) => {
                      messageRefs.current[msg.id] = ref;
                    }}
                    className="max-w-[80%] px-3 py-2 rounded-2xl"
                    style={{
                      borderBottomRightRadius: isOutgoing ? 4 : 16,
                      borderBottomLeftRadius: isOutgoing ? 16 : 4,
                      backgroundColor: isOutgoing ? "#D9FDD3" : "#FFFFFF",
                    }}
                  >
                    <Text className="text-gray-900">{msg.content}</Text>
                    <View className="flex-row items-center justify-end mt-1 gap-1">
                      <Text className="text-gray-500 text-xs">
                        {formatTime(msg.createdAt)}
                      </Text>
                      {isOutgoing && (
                        <Text className="text-gray-500 text-xs">✓✓</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {/* AI Typing Indicator */}
            {isWaitingForResponse && (
              <View className="mb-2 items-start">
                <View
                  className="max-w-[80%] px-3 py-2 rounded-2xl"
                  style={{
                    borderBottomRightRadius: 16,
                    borderBottomLeftRadius: 4,
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  <Text className="text-gray-500 italic">AI is typing...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {errorMessage && (
            <View className="bg-red-100 border border-red-400 px-4 py-2 mx-4 rounded">
              <Text className="text-red-700 text-sm">{errorMessage}</Text>
            </View>
          )}

          {/* Input bar - sits above keyboard */}
          <View className="bg-gray-100 flex-row items-end px-2 py-2 gap-2">
            <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
              <Text className="text-gray-600 text-xl">+</Text>
            </TouchableOpacity>

            <TextInput
              className="flex-1 bg-white rounded-2xl px-4 py-2.5 text-base max-h-24"
              placeholder="Message"
              placeholderTextColor="#999"
              multiline
              value={messages}
              onChangeText={handleStartTyping}
            />

            <View className="fcc">
              {messages.length > 0 && !isWaitingForResponse && (
                <TouchableOpacity
                  className="w-9 h-9 fcc rounded-full bg-w-green"
                  onPress={handleSendMessage}
                  disabled={!isConnected || !sessionId}
                >
                  <MaterialIcons
                    name="send"
                    size={21}
                    color="white"
                    style={{ marginLeft: 5 }}
                  />
                </TouchableOpacity>
              )}

              {messages.length < 1 && !isWaitingForResponse && (
                <TouchableOpacity className="w-9 h-9 fcc">
                  <Ionicons
                    name="mic-outline"
                    size={24}
                    color={COLORS.BASE_COLOR.WBLUE}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <SafeAreaView edges={["bottom"]} className="bg-gray-100" />

      {/* Context Menu Modal */}
      <Modal
        visible={selectedMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={{ flex: 1 }} onPress={closeMenu}>
          <View
            style={{
              position: "absolute",
              top: menuPosition.y,
              left: menuPosition.x,
              backgroundColor: "white",
              borderRadius: 12,
              width: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {/* Copy */}
            <TouchableOpacity
              className="flex-row items-center justify-between px-4 py-3"
              onPress={handleCopy}
            >
              <Text className="text-gray-900 text-base">Copy</Text>
              <MaterialIcons name="content-copy" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
