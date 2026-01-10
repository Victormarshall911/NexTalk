import { ThemeProvider } from '@/context/ThemeContext'; // <--- IMPORT
import { supabase } from '@/lib/supabase';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

function RootLayoutNav() {
  const [session, setSession] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (session && inAuthGroup) router.replace('/(tabs)');
    else if (!session && !inAuthGroup) router.replace('/(auth)/login');
  }, [session, initialized, segments]);

  if (!initialized) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  return <Slot />;
}

// Wrap the main layout with ThemeProvider
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}