import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Bubble, GiftedChat, IMessage } from 'react-native-gifted-chat';

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); 
  // Ensure id is a string (useLocalSearchParams can return string or array)
  const receiverId = Array.isArray(id) ? id[0] : id;

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Get Current User Info
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({
          _id: data.user.id,
          name: data.user.user_metadata?.full_name || 'Me',
        });
      }
      setLoading(false);
    });
  }, []);

  // 2. Fetch & Subscribe to Conversation
  useEffect(() => {
    if (!currentUser || !receiverId) return;

    // A. Fetch OLD messages
    // Logic: (sender=Me AND receiver=Them) OR (sender=Them AND receiver=Me)
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(user_id.eq.${currentUser._id},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${currentUser._id})`)
        .order('created_at', { ascending: false });

      if (error) console.log("Fetch error:", error);

      if (data) {
        const formattedMessages = data.map((msg: any) => ({
          _id: msg.id,
          text: msg.text,
          createdAt: new Date(msg.created_at),
          user: { _id: msg.user_id, name: msg.user_name },
        }));
        setMessages(formattedMessages);
      }
    };

    fetchMessages();

    // B. Subscribe to NEW messages
    const channel = supabase
      .channel(`chat_room:${currentUser._id}_${receiverId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any;
          // Security Check: Only append if the message belongs to this conversation
          // We only care about messages SENT by the 'receiver' to 'us' (because our own messages are appended locally instantly)
          if (newMsg.user_id === receiverId && newMsg.receiver_id === currentUser._id) {
            setMessages(prev => GiftedChat.append(prev, [{
              _id: newMsg.id,
              text: newMsg.text,
              createdAt: new Date(newMsg.created_at),
              user: { _id: newMsg.user_id, name: newMsg.user_name }
            }]));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, receiverId]);

  // 3. Send Message Handler
  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!currentUser) return;
    
    // Update UI immediately (Optimistic UI)
    setMessages(prev => GiftedChat.append(prev, newMessages));

    const { text } = newMessages[0];
    
    // Write to Supabase
    const { error } = await supabase.from('messages').insert({
      text,
      user_id: currentUser._id,      // Sender (Me)
      receiver_id: receiverId,       // Receiver (Them)
      user_name: currentUser.name,
      created_at: new Date(),
    });

    if (error) {
      console.error("Error sending message:", error);
      // Optional: Add logic here to mark message as 'failed' if needed
    }
  }, [currentUser, receiverId]);

  if (loading || !currentUser) {
    return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={currentUser}
      // Custom Bubble Styling to match your Theme
      renderBubble={props => (
        <Bubble
          {...props}
          wrapperStyle={{
            right: { backgroundColor: '#2563EB' }, // Blue for Me
            left: { backgroundColor: '#F3F4F6' },  // Light Grey for Them
          }}
          textStyle={{
            right: { color: '#fff' },
            left: { color: '#333' },
          }}
        />
      )}
    />
  );
}