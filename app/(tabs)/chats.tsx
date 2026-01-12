import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatsScreen() {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch latest messages involving me
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`user_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !messages) {
      setLoading(false);
      return;
    }

    // 2. Identify who we are talking to
    const conversationMap = new Map();
    const otherUserIds = new Set(); 

    messages.forEach((msg) => {
      // Determine the "Other" person's ID
      const otherUserId = msg.user_id === user.id ? msg.receiver_id : msg.user_id;
      
      if (!conversationMap.has(otherUserId)) {
        otherUserIds.add(otherUserId);
        conversationMap.set(otherUserId, {
          id: otherUserId,
          lastMessage: msg.text,
          date: new Date(msg.created_at),
          name: 'Loading...', // Temporary placeholder
        });
      }
    });

    // 3. Fetch REAL Profiles for these users to get correct names
    if (otherUserIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(otherUserIds));

      if (profiles) {
        profiles.forEach(profile => {
          const conversation = conversationMap.get(profile.id);
          if (conversation) {
            // Use the Real Name from Profile
            conversation.name = profile.full_name || profile.email || 'Unknown';
          }
        });
      }
    }

    setConversations(Array.from(conversationMap.values()));
    setLoading(false);
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
        <Text style={[styles.message, { color: colors.subText }]} numberOfLines={1}>
          {item.lastMessage}
        </Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: '700' },
  time: { fontSize: 12 },
  message: { fontSize: 14 },
  emptyState: { flex: 1, alignItems: 'center', marginTop: 50 }
});