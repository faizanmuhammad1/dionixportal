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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

interface SidebarChatProps {
  collapsed?: boolean;
}

export function SidebarChat({ collapsed = false }: SidebarChatProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (isExpanded && selectedRoom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded, selectedRoom]);

  // Mark messages as read when room is selected
  useEffect(() => {
    if (selectedRoom && messages.length > 0 && isExpanded) {
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
  }, [selectedRoom, messages, currentUser?.id, isExpanded, markAsRead]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isExpanded) return;

    const messagesChannel = supabase
      .channel("sidebar-chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.room_id === selectedRoom) {
            queryClient.invalidateQueries({ queryKey: ["messages", selectedRoom] });
          }
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
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", selectedRoom] });
        }
      )
      .subscribe();

    const roomsChannel = supabase
      .channel("sidebar-chat-rooms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_rooms",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomsChannel);
    };
  }, [isExpanded, selectedRoom, queryClient, supabase]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedRoom) return;

    try {
      await sendMessage.mutateAsync({
        roomId: selectedRoom,
        content: messageInput,
      });
      setMessageInput("");
      inputRef.current?.focus();
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
      const roomId = await createDirectChat.mutateAsync(userId);
      setSelectedRoom(roomId);
      setShowNewChat(false);
      setIsExpanded(true);
    } catch (error) {
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
  const unreadChatCount = chatRooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);

  if (collapsed) {
    return (
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center relative"
          onClick={() => setIsExpanded(!isExpanded)}
          title="Messages"
        >
          <MessageSquare className="h-4 w-4" />
          {unreadChatCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
              {unreadChatCount > 9 ? "9+" : unreadChatCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border flex flex-col h-[400px] max-h-[400px]">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-semibold text-sm">Messages</span>
          {unreadChatCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
              {unreadChatCount}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Search and New Chat */}
          <div className="p-2 border-b border-border space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setShowNewChat(!showNewChat)}
            >
              <Plus className="h-3 w-3 mr-1" />
              New Chat
            </Button>
          </div>

          {/* Chat List or Messages */}
          <div className="flex-1 min-h-0 flex">
            {!selectedRoom ? (
              <ScrollArea className="flex-1">
                {showNewChat ? (
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">Start New Chat</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => setShowNewChat(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {filteredEmployees
                      .filter((emp) => emp.id !== currentUser?.id)
                      .map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleCreateDirectChat(emp.id)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {`${emp.first_name?.[0] || ""}${emp.last_name?.[0] || ""}`.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {`${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unknown"}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-1">
                    {loadingRooms ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredRooms.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No chats yet</p>
                      </div>
                    ) : (
                      filteredRooms.map((room) => (
                        <div
                          key={room.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
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
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={getRoomAvatar(room) || undefined} />
                              <AvatarFallback className="text-[10px]">
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
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px]"
                                variant="destructive"
                              >
                                {room.unread_count > 9 ? "9+" : room.unread_count}
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">
                              {getRoomName(room)}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {room.last_message_preview || "No messages"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="flex-1 flex flex-col min-w-0">
                {/* Chat Header */}
                <div className="p-2 border-b border-border flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage
                        src={selectedRoomData ? getRoomAvatar(selectedRoomData) || undefined : undefined}
                      />
                      <AvatarFallback className="text-[10px]">
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
                    <p className="text-xs font-semibold truncate">
                      {selectedRoomData ? getRoomName(selectedRoomData) : "Chat"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedRoom(null);
                      setShowNewChat(false);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-2">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((message) => {
                        const isOwn = message.sender_id === currentUser?.id;
                        const isRead = message.read_by?.includes(currentUser?.id || "") || false;
                        const readCount = message.read_by?.length || 0;
                        const participantCount = selectedRoomData?.participants?.length || 0;

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-1.5",
                              isOwn ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            {!isOwn && (
                              <Avatar className="h-5 w-5 flex-shrink-0">
                                <AvatarImage
                                  src={message.sender?.avatar_url || undefined}
                                />
                                <AvatarFallback className="text-[8px]">
                                  {`${message.sender?.first_name?.[0] || ""}${message.sender?.last_name?.[0] || ""}`.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={cn(
                                "flex flex-col gap-0.5 max-w-[75%]",
                                isOwn ? "items-end" : "items-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "rounded-lg px-2 py-1 text-xs",
                                  isOwn
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                )}
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 px-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatMessageTime(message.created_at)}
                                </span>
                                {isOwn && (
                                  <span className="text-[10px]">
                                    {readCount >= participantCount - 1 ? (
                                      <CheckCheck className="h-2.5 w-2.5 text-blue-500" />
                                    ) : isRead ? (
                                      <CheckCheck className="h-2.5 w-2.5" />
                                    ) : (
                                      <Check className="h-2.5 w-2.5" />
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
                <div className="p-2 border-t border-border flex-shrink-0">
                  <div className="flex gap-1">
                    <Input
                      ref={inputRef}
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
                      className="h-7 text-xs"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessage.isPending}
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      {sendMessage.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2 text-center text-xs text-muted-foreground">
          {unreadChatCount > 0 ? (
            <p>{unreadChatCount} unread message{unreadChatCount !== 1 ? "s" : ""}</p>
          ) : (
            <p>Click to expand</p>
          )}
        </div>
      )}
    </div>
  );
}

