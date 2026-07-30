import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';

const ROUTE_COMPLETE_CHIME = require('../assets/sounds/auto-check-in-chime.wav');

let audioModeConfigured = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeConfigured) {
    return;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
  audioModeConfigured = true;
}

export async function playRouteCompleteSuccessSound(): Promise<void> {
  try {
    await ensureAudioMode();

    const { sound } = await Audio.Sound.createAsync(ROUTE_COMPLETE_CHIME, {
      shouldPlay: true,
      volume: 0.32,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch (error) {
    console.warn('[RouteComplete] success sound failed:', error);
  }
}

export function playRouteCompleteSuccessHaptic(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
