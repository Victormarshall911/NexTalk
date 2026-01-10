import { useTheme } from '@/context/ThemeContext'; // <--- Import Hook
import { supabase } from '@/lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatsScreen() {
  const { colors } = useTheme(); // <--- Get Colors
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const fetchConversations = async () => {
    // ... (Your existing fetch logic remains exactly the same) ...
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`user_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    const conversationMap = new Map();
    data.forEach((msg) => {
      const otherUserId = msg.user_id === user.id ? msg.receiver_id : msg.user_id;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          id: otherUserId,
          lastMessage: msg.text,
          date: new Date(msg.created_at),
          name: msg.user_id === user.id ? 'Chat' : msg.user_name, 
        });
      }
    });

    setConversations(Array.from(conversationMap.values()));
    setLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.card, { borderBottomColor: colors.border }]} // <--- Dynamic Border
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.inputBackground }]}> 
        <Text style={[styles.avatarText, { color: colors.tint }]}>
          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name || 'User'}</Text> 
          <Text style={[styles.time, { color: colors.subText }]}>
            {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.message, { color: colors.subText }]} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
      </View>
      
      <FlatList data={conversations} renderItem={renderItem} keyExtractor={item => item.id} />
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
});