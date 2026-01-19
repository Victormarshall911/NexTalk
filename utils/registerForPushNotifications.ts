import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is open
// Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <--- Added this
    shouldShowList: true,   // <--- Added this
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Platform.OS === 'web') {
    console.log("Push notifications are not fully supported on standard web without a service worker.");
    return;
  }

  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If we don't have permission yet, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }

  // Get the token that identifies this device
  // Note: You must use your Project ID from app.json if using EAS
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId, 
    });
    console.log("Push Token:", tokenData.data);
    return tokenData.data; // <--- This is the token you save to Supabase
  } catch (error) {
    console.error("Error fetching push token", error);
    return null;
  }
}