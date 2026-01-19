import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Ref to track current user ID for the realtime subscription
  const currentUserId = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      
      // Cleanup subscription on unmount/blur if needed (optional)
      return () => {
        supabase.removeAllChannels();
      };
    }, [])
  );

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    currentUserId.current = user.id;

    // 1. Fetch ALL messages involving me (ordered newest first)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`user_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !messages) {
      setLoading(false);
      return;
    }

    // 2. Process Messages into Conversations
    const conversationMap = new Map();
    const otherUserIds = new Set(); 

    messages.forEach((msg) => {
      const isMe = msg.user_id === user.id;
      const otherUserId = isMe ? msg.receiver_id : msg.user_id;
      
      // Initialize conversation if not exists
      if (!conversationMap.has(otherUserId)) {
        otherUserIds.add(otherUserId);
        conversationMap.set(otherUserId, {
          id: otherUserId,
          lastMessage: msg.text,
          date: new Date(msg.created_at),
          name: 'Loading...',
          unreadCount: 0, // <--- Init Count
        });
      }

      // 3. Count Unread Messages
      // If I am NOT the sender, and it is NOT read, add to count
      if (!isMe && msg.is_read === false) {
        const conv = conversationMap.get(otherUserId);
        conv.unreadCount += 1;
      }
    });

    // 4. Fetch Names
    if (otherUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(otherUserIds));

      if (profiles) {
        profiles.forEach(profile => {
          const conversation = conversationMap.get(profile.id);
          if (conversation) {
            conversation.name = profile.full_name || profile.email || 'Unknown';
          }
        });
      }
    }

    setConversations(Array.from(conversationMap.values()));
    setLoading(false);
    
    // 5. Setup Realtime Listener for New Messages (Badges)
    setupRealtimeListener(user.id);
  };

  const setupRealtimeListener = (userId: string) => {
    supabase.channel('chats_list_updates')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `receiver_id=eq.${userId}` // Only listen for msgs sent TO me
        },
        (payload) => {
          // When a new message arrives, we just re-fetch to keep it simple and accurate
          // Alternatively, you could manually update the state array for better performance
          fetchConversations();
        }
      )
      .subscribe();
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, { borderBottomColor: colors.border }]} 
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}> 
        <Text style={[styles.avatarText, { color: colors.tint }]}>
          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text> 
          <Text style={[styles.time, { color: colors.subText }]}>
            {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={styles.row}>
          <Text style={[styles.message, { color: colors.subText }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          
          {/* BADGE COMPONENT */}
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
      </View>
      
      <FlatList 
        data={conversations} 
        renderItem={renderItem} 
        keyExtractor={item => item.id}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                 <Text style={{color: colors.subText, fontSize: 16}}>No conversations yet</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 30, fontWeight: '800' },
  card: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }, // Align items center
  name: { fontSize: 16, fontWeight: '700' },
  time: { fontSize: 12 },
  message: { fontSize: 14, flex: 1 }, // Added flex 1 to push badge to right
  emptyState: { flex: 1, alignItems: 'center', marginTop: 50 },
  badge: { 
    backgroundColor: '#FF3B30', 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 4,
    marginLeft: 10 
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});