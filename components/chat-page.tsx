"use client";

import { useState, useEffect, useRef } from "react";
import { useChatRooms, useMessages, useSendMessage, useMarkAsRead, useCreateDirectChat, type ChatRoom, type Message } from "@/hooks/use-chat";
import { useEmployees } from "@/hooks/use-employees";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User as AuthUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Search,
  X,
  Plus,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

export function ChatPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { toast } = useToast();

  const { data: chatRooms = [], isLoading: loadingRooms } = useChatRooms();
  const { data: messages = [], isLoading: loadingMessages } = useMessages(selectedRoom);
  const { data: employees = [] } = useEmployees();
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const createDirectChat = useCreateDirectChat();

  // Get current user on mount
  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when room is selected
  useEffect(() => {
    if (selectedRoom && messages.length > 0) {
      const unreadMessages = messages.filter((msg) => {
        if (msg.sender_id === currentUser?.id) return false;
        return !msg.read_by?.includes(currentUser?.id || "");
      });

      if (unreadMessages.length > 0) {
        markAsRead.mutate({
          roomId: selectedRoom,
          messageIds: unreadMessages.map((m) => m.id),
        });
      }
    }
  }, [selectedRoom, messages, currentUser?.id, markAsRead]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser?.id) return;

    // Subscribe to ALL messages (RLS will filter what user can see)
    // This ensures we get updates for all rooms the user is in
    const messagesChannel = supabase
      .channel(`chat-messages-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as any;
          console.log("[REALTIME] New message:", newMessage);
          
          // Invalidate messages for the specific room
          if (newMessage.room_id) {
            queryClient.invalidateQueries({ queryKey: ["messages", newMessage.room_id] });
          }
          
          // Always invalidate chat rooms to update last message preview
          queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          console.log("[REALTIME] Message updated:", updatedMessage);
          
          if (updatedMessage?.room_id) {
            queryClient.invalidateQueries({ queryKey: ["messages", updatedMessage.room_id] });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const deletedMessage = payload.old as any;
          console.log("[REALTIME] Message deleted:", deletedMessage);
          
          if (deletedMessage?.room_id) {
            queryClient.invalidateQueries({ queryKey: ["messages", deletedMessage.room_id] });
          }
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] Messages channel status:", status);
        if (status === "SUBSCRIBED") {
          console.log("[REALTIME] Successfully subscribed to messages");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[REALTIME] Error subscribing to messages");
        }
      });

    // Subscribe to chat rooms changes
    const roomsChannel = supabase
      .channel("chat-rooms-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_rooms",
        },
        (payload) => {
          console.log("[REALTIME] New room:", payload);
          queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
        },
        (payload) => {
          console.log("[REALTIME] Room updated:", payload);
          queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] Rooms channel status:", status);
      });

    // Subscribe to chat participants changes (for when users join/leave)
    const participantsChannel = supabase
      .channel("chat-participants-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_participants",
        },
        (payload) => {
          console.log("[REALTIME] New participant:", payload);
          queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_participants",
        },
        (payload) => {
          console.log("[REALTIME] Participant updated:", payload);
          queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] Participants channel status:", status);
      });

    return () => {
      console.log("[REALTIME] Cleaning up subscriptions");
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [selectedRoom, queryClient, supabase, currentUser?.id]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;

    try {
      await sendMessage.mutateAsync({
        roomId: selectedRoom,
        content: messageInput,
      });
      setMessageInput("");
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCreateDirectChat = async (userId: string) => {
    try {
      console.log("[CHAT PAGE DEBUG] Creating direct chat with user:", userId);
      const roomId = await createDirectChat.mutateAsync(userId);
      console.log("[CHAT PAGE DEBUG] Chat created successfully, room ID:", roomId);
      setSelectedRoom(roomId);
      setShowNewChat(false);
    } catch (error) {
      console.error("[CHAT PAGE DEBUG] Error creating chat:", {
        error,
        userId,
        currentUser,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      toast({
        title: "Failed to create chat",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getRoomName = (room: ChatRoom): string => {
    if (room.name) return room.name;
    if (room.type === "direct" && room.participants) {
      const otherParticipant = room.participants.find(
        (p) => p.user_id !== currentUser?.id
      );
      if (otherParticipant?.profile) {
        const { first_name, last_name } = otherParticipant.profile;
        return `${first_name || ""} ${last_name || ""}`.trim() || "Unknown User";
      }
    }
    return "Chat";
  };

  const getRoomAvatar = (room: ChatRoom): string | null => {
    if (room.type === "direct" && room.participants) {
      const otherParticipant = room.participants.find(
        (p) => p.user_id !== currentUser?.id
      );
      return otherParticipant?.profile?.avatar_url || null;
    }
    return null;
  };

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "HH:mm")}`;
    } else {
      return format(date, "MMM d, HH:mm");
    }
  };

  const filteredRooms = chatRooms.filter((room) => {
    if (!searchTerm) return true;
    const roomName = getRoomName(room).toLowerCase();
    return roomName.includes(searchTerm.toLowerCase());
  });

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm) return true;
    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
    const email = (emp.email || "").toLowerCase();
    return (
      name.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase())
    );
  });

  const selectedRoomData = chatRooms.find((r) => r.id === selectedRoom);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Chat with your team members
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat Rooms List */}
        <div className="w-80 border-r flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-2 border-b">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowNewChat(!showNewChat)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Chat Rooms List */}
          <ScrollArea className="flex-1">
            {showNewChat ? (
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Start New Chat</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChat(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {filteredEmployees
                  .filter((emp) => emp.id !== currentUser?.id)
                  .map((emp) => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleCreateDirectChat(emp.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={emp.avatar_url || undefined} />
                        <AvatarFallback>
                          {`${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-2">
                {loadingRooms ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No chats yet</p>
                    <p className="text-sm">Start a new conversation</p>
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                        selectedRoom === room.id
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        setSelectedRoom(room.id);
                        setShowNewChat(false);
                      }}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getRoomAvatar(room) || undefined} />
                          <AvatarFallback>
                            {getRoomName(room)
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {room.unread_count > 0 && (
                          <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                            variant="destructive"
                          >
                            {room.unread_count > 9 ? "9+" : room.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold truncate">
                            {getRoomName(room)}
                          </p>
                          {room.last_message_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(room.last_message_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {room.last_message_preview || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={selectedRoomData ? getRoomAvatar(selectedRoomData) || undefined : undefined}
                    />
                    <AvatarFallback>
                      {selectedRoomData
                        ? getRoomName(selectedRoomData)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "CH"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedRoomData ? getRoomName(selectedRoomData) : "Chat"}
                    </p>
                    {selectedRoomData?.participants && (
                      <p className="text-sm text-muted-foreground">
                        {selectedRoomData.participants.length} participant
                        {selectedRoomData.participants.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === currentUser?.id;
                      const isRead = message.read_by?.includes(currentUser?.id || "") || false;
                      const readCount = message.read_by?.length || 0;
                      const participantCount = selectedRoomData?.participants?.length || 0;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-3",
                            isOwn ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={message.sender?.avatar_url || undefined}
                              />
                              <AvatarFallback>
                                {`${message.sender?.first_name?.[0] || ""}${message.sender?.last_name?.[0] || ""}`.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "flex flex-col gap-1 max-w-[70%]",
                              isOwn ? "items-end" : "items-start"
                            )}
                          >
                            {!isOwn && (
                              <p className="text-xs text-muted-foreground px-2">
                                {`${message.sender?.first_name || ""} ${message.sender?.last_name || ""}`.trim() || "Unknown"}
                              </p>
                            )}
                            <div
                              className={cn(
                                "rounded-lg px-4 py-2",
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              {message.reply_to && (
                                <div className="mb-2 pb-2 border-b border-white/20 text-sm opacity-75">
                                  <p className="text-xs">Replying to:</p>
                                  <p className="text-xs">{message.reply_to.content.substring(0, 50)}</p>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 px-2">
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(message.created_at)}
                              </span>
                              {isOwn && (
                                <span className="text-xs">
                                  {readCount >= participantCount - 1 ? (
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                  ) : isRead ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="px-6 py-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendMessage.isPending}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold">Select a chat to start messaging</p>
                <p className="text-sm">Or start a new conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

