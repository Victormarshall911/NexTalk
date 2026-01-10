import { useTheme } from '@/context/ThemeContext'; // <--- Import Hook
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function UsersList() {
  const { colors } = useTheme(); // <--- Get Colors
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    // ... (Your existing fetch logic) ...
    const fetchUsers = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*');
      if (data && currentUser) {
        const others = data.filter(u => u.id !== currentUser.id);
        setUsers(others);
        setFilteredUsers(others);
      }
    };
    fetchUsers();
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (text) {
      const filtered = users.filter(user => 
        (user.full_name || '').toLowerCase().includes(text.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>People</Text>
        
        {/* Search Box */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.subText} style={{marginRight: 10}} />
          <TextInput 
            placeholder="Search for friends..." 
            style={[styles.searchInput, { color: colors.text }]} // <--- Dynamic Text Color
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor={colors.subText} // <--- Dynamic Placeholder
          />
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.userCard, { backgroundColor: colors.card }]} 
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={[styles.avatarContainer, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.avatarText, { color: colors.tint }]}>
                {item.full_name ? item.full_name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.userName, { color: colors.text }]}>{item.full_name || 'Unknown'}</Text>
              <Text style={[styles.userEmail, { color: colors.subText }]}>{item.email}</Text>
            </View>
            <Ionicons name="chatbubble-outline" size={24} color={colors.tint} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, height: 40 },
  searchInput: { flex: 1, fontSize: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: 1 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 20, fontWeight: '600' },
  textContainer: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600' },
  userEmail: { fontSize: 14 },
});