import { useTheme } from '@/context/ThemeContext'; // <--- IMPORT HOOK
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme(); // <--- USE HOOK
  const [notifications, setNotifications] = useState(true);

  return (
    // Replace hardcoded colors with `colors.xyz`
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
            onValueChange={toggleTheme} // <--- CALL FUNCTION
            value={isDark} // <--- BIND TO STATE
          />
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Notifications (Dummy for now) */}
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
            onValueChange={setNotifications}
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