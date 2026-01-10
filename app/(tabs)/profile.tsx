import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const { colors } = useTheme(); // <--- Get dynamic colors
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setProfile({
        email: user.email,
        full_name: user.user_metadata?.full_name || 'User',
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    // Dynamic Background
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Avatar Placeholder */}
        <View style={[styles.avatarContainer, { backgroundColor: colors.inputBackground }]}>
           <Text style={[styles.avatarText, { color: colors.tint }]}>
             {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
           </Text>
        </View>

        {/* User Details */}
        <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name || 'Loading...'}</Text>
        <Text style={[styles.email, { color: colors.subText }]}>{profile?.email}</Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Sign Out Button */}
        <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.inputBackground }]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // We removed background colors here so the inline styles take priority
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  content: { alignItems: 'center', paddingTop: 50 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: { fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: '700', marginBottom: 5 },
  email: { fontSize: 16, marginBottom: 30 },
  divider: { width: '80%', height: 1, marginBottom: 30 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
  },
  signOutText: { color: '#EF4444', fontSize: 18, fontWeight: '600', marginLeft: 10 },
});