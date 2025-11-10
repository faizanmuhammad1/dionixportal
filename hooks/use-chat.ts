import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";

export interface ChatRoom {
  id: string;
  name: string | null;
  type: "direct" | "group" | "project";
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  participants?: ChatParticipant[];
  unread_count?: number;
}

export interface ChatParticipant {
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  role: "member" | "admin";
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string;
  };
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "file" | "system";
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string;
  };
  reply_to?: Message | null;
  read_by?: string[]; // Array of user IDs who read this message
}

// Fetch all chat rooms for the current user
async function fetchChatRooms(): Promise<ChatRoom[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not authenticated");

  // Fetch rooms where user is a participant
  const { data: participants, error: participantsError } = await supabase
    .from("chat_participants")
    .select("room_id")
    .eq("user_id", user.id);

  if (participantsError) throw new Error("Failed to fetch chat rooms");

  if (!participants || participants.length === 0) return [];

  const roomIds = participants.map((p) => p.room_id);

  // Fetch rooms with participant count and last message info
  const { data: rooms, error: roomsError } = await supabase
    .from("chat_rooms")
    .select("*")
    .in("id", roomIds)
    .order("last_message_at", { ascending: false, nullsFirst: true })
    .order("updated_at", { ascending: false });

  if (roomsError) throw new Error("Failed to fetch chat rooms");

  // Fetch participants for each room
  const { data: allParticipants, error: allParticipantsError } = await supabase
    .from("chat_participants")
    .select("*")
    .in("room_id", roomIds);

  if (allParticipantsError) throw new Error("Failed to fetch participants");
  
  // Fetch profiles for all participants
  const userIds = [...new Set((allParticipants || []).map((p: any) => p.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, role")
    .in("id", userIds);
  
  const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

  // Calculate unread counts - messages not sent by user and not deleted
  // Get last read time for each room
  const { data: lastReads } = await supabase
    .from("chat_participants")
    .select("room_id, last_read_at")
    .eq("user_id", user.id)
    .in("room_id", roomIds);

  const lastReadByRoom = new Map<string, string>();
  (lastReads || []).forEach((lr: any) => {
    lastReadByRoom.set(lr.room_id, lr.last_read_at);
  });

  // Count unread messages per room (simplified - count all unread messages)
  const { data: unreadMessages } = await supabase
    .from("messages")
    .select("room_id, created_at")
    .in("room_id", roomIds)
    .not("sender_id", "eq", user.id)
    .is("deleted_at", null);

  const unreadByRoom = new Map<string, number>();
  (unreadMessages || []).forEach((msg: any) => {
    const lastRead = lastReadByRoom.get(msg.room_id);
    if (!lastRead || new Date(msg.created_at) > new Date(lastRead)) {
      unreadByRoom.set(msg.room_id, (unreadByRoom.get(msg.room_id) || 0) + 1);
    }
  });

  // Group participants by room
  const participantsByRoom = new Map<string, ChatParticipant[]>();
  (allParticipants || []).forEach((p: any) => {
    if (!participantsByRoom.has(p.room_id)) {
      participantsByRoom.set(p.room_id, []);
    }
    participantsByRoom.get(p.room_id)!.push({
      ...p,
      profile: profilesMap.get(p.user_id) || null,
    });
  });

  return (rooms || []).map((room: any) => ({
    ...room,
    participants: participantsByRoom.get(room.id) || [],
    unread_count: unreadByRoom.get(room.id) || 0,
  })) as ChatRoom[];
}

// Fetch messages for a room
async function fetchMessages(roomId: string): Promise<Message[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Not authenticated");

  // Verify user is a participant
  const { data: participant } = await supabase
    .from("chat_participants")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (!participant) throw new Error("Not a participant in this room");

  // Fetch messages
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (messagesError) throw new Error("Failed to fetch messages");

  // Fetch profiles for message senders
  const senderIds = [...new Set((messages || []).map((m: any) => m.sender_id))];
  const { data: senderProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, role")
    .in("id", senderIds);
  
  const senderProfilesMap = new Map((senderProfiles || []).map((p: any) => [p.id, p]));

  // Fetch reply_to messages if any
  const replyToIds = (messages || [])
    .map((m: any) => m.reply_to_id)
    .filter((id: any) => id !== null);
  
  let replyToMessages: any[] = [];
  if (replyToIds.length > 0) {
    const { data: replies } = await supabase
      .from("messages")
      .select("*")
      .in("id", replyToIds);
    replyToMessages = replies || [];
  }
  const replyToMap = new Map(replyToMessages.map((m: any) => [m.id, m]));

  // Fetch read receipts for messages
  const messageIds = (messages || []).map((m: any) => m.id);
  if (messageIds.length > 0) {
    const { data: reads } = await supabase
      .from("message_reads")
      .select("message_id, user_id")
      .in("message_id", messageIds);

    const readsByMessage = new Map<string, string[]>();
    (reads || []).forEach((r: any) => {
      if (!readsByMessage.has(r.message_id)) {
        readsByMessage.set(r.message_id, []);
      }
      readsByMessage.get(r.message_id)!.push(r.user_id);
    });

    return (messages || []).map((m: any) => ({
      ...m,
      sender: senderProfilesMap.get(m.sender_id) || null,
      reply_to: m.reply_to_id ? replyToMap.get(m.reply_to_id) || null : null,
      read_by: readsByMessage.get(m.id) || [],
    })) as Message[];
  }

  return (messages || []).map((m: any) => ({
    ...m,
    sender: senderProfilesMap.get(m.sender_id) || null,
    reply_to: m.reply_to_id ? replyToMap.get(m.reply_to_id) || null : null,
    read_by: [],
  })) as Message[];
}

export function useChatRooms() {
  return useQuery<ChatRoom[], Error>({
    queryKey: ["chat-rooms"],
    queryFn: fetchChatRooms,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useMessages(roomId: string | null) {
  return useQuery<Message[], Error>({
    queryKey: ["messages", roomId],
    queryFn: () => fetchMessages(roomId!),
    enabled: !!roomId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      roomId,
      content,
      replyToId,
    }: {
      roomId: string;
      content: string;
      replyToId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: content.trim(),
          reply_to_id: replyToId || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return message;
    },
    onSuccess: (data) => {
      // Invalidate messages for this room
      queryClient.invalidateQueries({ queryKey: ["messages", data.room_id] });
      // Invalidate chat rooms to update last message
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ roomId, messageIds }: { roomId: string; messageIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Mark messages as read
      if (messageIds.length > 0) {
        const reads = messageIds.map((messageId) => ({
          message_id: messageId,
          user_id: user.id,
        }));

        const { error: readsError } = await supabase
          .from("message_reads")
          .upsert(reads, { onConflict: "message_id,user_id" });

        if (readsError) throw new Error(readsError.message);
      }

      // Update last_read_at in chat_participants
      const { error: participantError } = await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("room_id", roomId)
        .eq("user_id", user.id);

      if (participantError) throw new Error(participantError.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

export function useCreateDirectChat() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if direct chat already exists between these two users
      // First, get all direct rooms where current user is a participant
      const { data: userRooms } = await supabase
        .from("chat_participants")
        .select("room_id")
        .eq("user_id", user.id);

      if (userRooms && userRooms.length > 0) {
        const roomIds = userRooms.map((r) => r.room_id);
        
        // Check if any of these rooms are direct chats with the other user
        const { data: existingRooms } = await supabase
          .from("chat_rooms")
          .select("id, type")
          .in("id", roomIds)
          .eq("type", "direct");

        if (existingRooms && existingRooms.length > 0) {
          const directRoomIds = existingRooms.map((r) => r.id);
          const { data: existingParticipants } = await supabase
            .from("chat_participants")
            .select("room_id")
            .in("room_id", directRoomIds)
            .eq("user_id", otherUserId);

          if (existingParticipants && existingParticipants.length > 0) {
            return existingParticipants[0].room_id;
          }
        }
      }

      // Verify auth session before creating room
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("[CHAT DEBUG] No active session:", sessionError);
        throw new Error("Not authenticated. Please refresh the page and try again.");
      }
      
      console.log("[CHAT DEBUG] Creating room with:", {
        type: "direct",
        created_by: user.id,
        user_id: user.id,
        session_user_id: session.user.id,
      });
      
      // Try using RPC function first, fallback to direct insert
      let room;
      let roomError;
      
      try {
        const { data: roomId, error: rpcError } = await supabase
          .rpc("create_chat_room", {
            p_type: "direct",
            p_created_by: user.id,
          });
        
        if (rpcError) {
          throw rpcError;
        }
        
        // Fetch the created room
        const { data: fetchedRoom, error: fetchError } = await supabase
          .from("chat_rooms")
          .select("*")
          .eq("id", roomId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        room = fetchedRoom;
      } catch (rpcErr) {
        console.log("[CHAT DEBUG] RPC failed, trying direct insert:", rpcErr);
        // Fallback to direct insert
        const { data: directRoom, error: directError } = await supabase
          .from("chat_rooms")
          .insert({
            type: "direct",
            created_by: user.id,
          })
          .select()
          .single();
        
        room = directRoom;
        roomError = directError;
      }

      if (roomError || !room) {
        console.error("[CHAT DEBUG] Error creating room:", {
          error: roomError,
          code: roomError?.code,
          message: roomError?.message,
          details: roomError?.details,
          hint: roomError?.hint,
          status: roomError?.status,
        });
        throw new Error(roomError?.message || "Failed to create chat room");
      }
      
      console.log("[CHAT DEBUG] Room created successfully:", room);

      // Add current user as participant first using RPC
      const { error: selfParticipantError } = await supabase
        .rpc("add_chat_participant", {
          p_room_id: room.id,
          p_user_id: user.id,
        });

      if (selfParticipantError) {
        console.error("Error adding self as participant:", selfParticipantError);
        // Fallback to direct insert
        const { error: directSelfError } = await supabase
          .from("chat_participants")
          .insert({
            room_id: room.id,
            user_id: user.id,
          });
        
        if (directSelfError) {
          throw new Error(directSelfError.message || "Failed to add self as participant");
        }
      }

      // Add other user as participant using RPC
      const { error: otherParticipantError } = await supabase
        .rpc("add_chat_participant", {
          p_room_id: room.id,
          p_user_id: otherUserId,
        });

      if (otherParticipantError) {
        console.error("Error adding other user as participant:", otherParticipantError);
        // Fallback to direct insert
        const { error: directOtherError } = await supabase
          .from("chat_participants")
          .insert({
            room_id: room.id,
            user_id: otherUserId,
          });
        
        if (directOtherError) {
          // Try to clean up - remove the room if we can't add the other participant
          await supabase.from("chat_rooms").delete().eq("id", room.id);
          throw new Error(directOtherError.message || "Failed to add other user as participant");
        }
      }

      return room.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
    },
  });
}

