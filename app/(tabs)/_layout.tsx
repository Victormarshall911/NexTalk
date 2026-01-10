import { useTheme } from '@/context/ThemeContext'; // <--- Import Hook
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const { colors, isDark } = useTheme(); // <--- Get Colors

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280', // Dim grey for inactive
        headerShown: false,
        tabBarStyle: { 
          height: 60, 
          paddingBottom: 10,
          backgroundColor: colors.card, // <--- Dynamic Background
          borderTopColor: colors.border, // <--- Dynamic Border
        },
      }}>
      
      <Tabs.Screen
        name="chats" 
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="chatbubbles" color={color} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'People',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="people" color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons size={28} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}