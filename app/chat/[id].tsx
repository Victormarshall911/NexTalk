import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bubble, Composer, GiftedChat, IMessage, InputToolbar, Send } from 'react-native-gifted-chat';

// --- HELPER FUNCTION: Send Push Notification ---
const sendPushNotification = async (expoPushToken: string, title: string, body: string) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { someData: 'goes here' },
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams(); 
  const receiverId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { colors } = useTheme();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [receiverName, setReceiverName] = useState('Loading...'); 
  const [loading, setLoading] = useState(true);

  // 1. Get User Data
  useEffect(() => {
    const fetchData = async () => {
      // Get Me
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ _id: user.id, name: user.user_metadata?.full_name || 'Me' });
      }

      // Get Them
      if (receiverId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, email') 
          .eq('id', receiverId)
          .single();

        if (data) {
          setReceiverName(data.full_name || data.email || 'Unknown User');
        }
      }
      setLoading(false);
    };

    fetchData(); 
  }, [receiverId]);

  // 2. Real-time Subscription
  useEffect(() => {
    if (!currentUser || !receiverId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(user_id.eq.${currentUser._id},receiver_id.eq.${receiverId}),and(user_id.eq.${receiverId},receiver_id.eq.${currentUser._id})`)
        .order('created_at', { ascending: false });

      if (data) {
        setMessages(data.map((msg: any) => ({
          _id: msg.id,
          text: msg.text,
          createdAt: new Date(msg.created_at),
          user: { _id: msg.user_id, name: msg.user_name },
        })));
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat_room:${currentUser._id}_${receiverId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.user_id === receiverId && newMsg.receiver_id === currentUser._id) {
            setMessages(prev => GiftedChat.append(prev, [{
              _id: newMsg.id,
              text: newMsg.text,
              createdAt: new Date(newMsg.created_at),
              user: { _id: newMsg.user_id, name: newMsg.user_name }
            }]));
          }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, receiverId]);

  // 3. Send Message Logic (Updated with Notifications)
  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!currentUser) return;
    
    // A. Update UI immediately
    setMessages(prev => GiftedChat.append(prev, newMessages));
    const { text } = newMessages[0];

    // B. Save to Database
    const { error } = await supabase.from('messages').insert({
      text,
      user_id: currentUser._id,
      receiver_id: receiverId,
      user_name: currentUser.name,
      created_at: new Date(),
    });

    if (error) {
      console.error("Error sending message to DB:", error);
      return;
    }

    // C. Send Push Notification
    try {
      // Fetch the receiver's push token
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', receiverId)
        .single();

      // If they have a token, fire the notification
      if (receiverProfile?.push_token) {
        await sendPushNotification(
          receiverProfile.push_token, 
          currentUser.name, // Title: Sender's Name
          text              // Body: The Message
        );
      }
    } catch (pushError) {
      console.log("Notification check failed (message sent anyway):", pushError);
    }

  }, [currentUser, receiverId]);

  // UI Components
  const renderBubble = (props: any) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: colors.tint },
        left: { backgroundColor: colors.inputBackground },
      }}
      textStyle={{
        right: { color: '#fff' },
        left: { color: colors.text },
      }}
    />
  );

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={{
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        padding: 5,
      }}
    />
  );

  const renderComposer = (props: any) => (
    <Composer
      {...props}
      textInputStyle={{
        color: colors.text,
        backgroundColor: colors.inputBackground,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingTop: 8.5,
      }}
    />
  );

  const renderSend = (props: any) => (
    <Send {...props}>
      <View style={{ marginBottom: 5, marginRight: 5 }}>
        <Ionicons name="send" size={32} color={colors.tint} />
      </View>
    </Send>
  );

  if (loading || !currentUser) {
    return <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.inputBackground }]}>
             <Text style={[styles.avatarText, { color: colors.tint }]}>{receiverName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{receiverName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
      >
        <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={currentUser}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderComposer={renderComposer}
          renderSend={renderSend}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    height: 60,
  },
  backButton: { marginRight: 15 },
  headerInfo: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 16, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
});