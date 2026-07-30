import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { logAutoCheckInConfirmationDev } from '@/utils/auto-check-in-confirmation';
import { runAutoCheckInSuccessHaptic } from '@/utils/auto-check-in-confirmation';

const CHECK_IN_CHIME = require('../assets/sounds/auto-check-in-chime.wav');

let audioModeConfigured = false;

async function ensureCheckInAudioMode(): Promise<void> {
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

export async function fireAutoCheckInSuccessChime(): Promise<void> {
  try {
    await ensureCheckInAudioMode();

    const { sound } = await Audio.Sound.createAsync(CHECK_IN_CHIME, {
      shouldPlay: true,
      volume: 0.75,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });

    logAutoCheckInConfirmationDev('chime played');
  } catch (error) {
    logAutoCheckInConfirmationDev('confirmation UI error', error);
  }
}

export function fireAutoCheckInSuccessHaptic(): Promise<void> {
  return runAutoCheckInSuccessHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
}

/** Haptic + chime after successful automatic check-in (errors are non-fatal). */
export function fireAutoCheckInConfirmationFeedback(): void {
  void fireAutoCheckInSuccessHaptic();
  void fireAutoCheckInSuccessChime();
}
