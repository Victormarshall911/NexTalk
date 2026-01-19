import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications'; // Import Notifications
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // Added useEffect
import { Alert, Linking, SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase'; // Import Supabase if you want to save the token
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotifications'; // <--- Import your helper

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(false); // Default to false until we check

  // 1. Check current permission status when screen loads
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifications(status === 'granted');
  };

  // 2. Handle the Toggle Action
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // User is trying to turn ON notifications
      const token = await registerForPushNotificationsAsync();
      
      if (token) {
        setNotifications(true);
        // OPTIONAL: Save token to Supabase for the current user
        saveTokenToSupabase(token);
      } else {
        // If they declined permissions previously, we might need to send them to settings
        setNotifications(false);
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your phone settings to receive updates.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() }
          ]
        );
      }
    } else {
      // User is trying to turn OFF notifications
      // Note: You can't programmatically revoke permissions on iOS/Android.
      // You can only stop sending them from your server or tell the user to go to settings.
      setNotifications(false);
      Alert.alert("Notifications Disabled", "You won't receive updates anymore.");
    }
  };

  const saveTokenToSupabase = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles') // Ensure you have a 'profiles' table
        .update({ push_token: token })
        .eq('id', user.id);

      if (error) console.error("Error saving token:", error);
    } catch (e) {
      console.error("Supabase error:", e);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Theme Option */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#374151' : '#EEF2FF' }]}>
               <Ionicons name="moon" size={20} color={colors.tint} />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>Dark Theme</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={'#fff'}
            onValueChange={toggleTheme}
            value={isDark}
          />
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Notifications */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
             <View style={[styles.iconContainer, { backgroundColor: isDark ? '#374151' : '#FEF3C7' }]}>
               <Ionicons name="notifications" size={20} color={isDark ? '#FBBF24' : '#D97706'} />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>Allow Notifications</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={'#fff'}
            onValueChange={handleNotificationToggle} // <--- UPDATED HANDLER
            value={notifications}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: { fontSize: 16, fontWeight: '500' },
  separator: { height: 1, marginLeft: 48 },
});