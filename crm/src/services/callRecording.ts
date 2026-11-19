import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { CallRecordingModule } = NativeModules;

export interface AudioRecordingFile {
  uri: string;
  name: string;
  size: number;
  type: string;
  timestamp?: number;
}

/**
 * Request necessary Android permissions for reading audio & recording microphone notes
 */
export async function requestCallRecordingPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Platform.Version as number;
    const permissionsToRequest: any[] = [
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ];

    if (apiLevel >= 33) {
      // Android 13+ uses granular media permissions
      permissionsToRequest.push(
        (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_AUDIO || 'android.permission.READ_MEDIA_AUDIO'
      );
    } else {
      // Android 12 and below uses storage permission
      permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
    }

    const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
    return Object.values(results).some(
      status => status === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.warn('Error requesting audio permissions:', err);
    return false;
  }
}

/**
 * Pick an audio file from phone storage using Android system picker
 */
export async function pickAudioRecording(): Promise<AudioRecordingFile | null> {
  if (Platform.OS !== 'android' || !CallRecordingModule) {
    console.warn('CallRecordingModule is only available on Android');
    return null;
  }

  try {
    await requestCallRecordingPermissions();
    const result = await CallRecordingModule.pickAudioFile();
    if (result && !result.cancelled && result.uri) {
      return {
        uri: result.uri,
        name: result.name || 'call_recording.m4a',
        size: result.size || 0,
        type: result.type || 'audio/m4a',
      };
    }
    return null;
  } catch (err: any) {
    if (err.code === 'E_CANCELLED') return null;
    console.error('Error picking audio recording:', err);
    throw err;
  }
}

/**
 * Automatically scan device MediaStore and Call Recording folders for audio recorded during/after the call
 */
export async function findLatestCallRecording(sinceTimestampMs?: number): Promise<AudioRecordingFile | null> {
  if (Platform.OS !== 'android' || !CallRecordingModule) {
    return null;
  }

  try {
    await requestCallRecordingPermissions();
    // Default search window: within the last 15 minutes
    const sinceTime = sinceTimestampMs || Date.now() - 15 * 60 * 1000;
    const result = await CallRecordingModule.findRecentRecording(sinceTime);
    if (result && result.uri) {
      return {
        uri: result.uri,
        name: result.name || 'detected_recording.m4a',
        size: result.size || 0,
        type: result.type || 'audio/m4a',
        timestamp: result.timestamp,
      };
    }
    return null;
  } catch (err) {
    console.warn('Error scanning for recent call recording:', err);
    return null;
  }
}

/**
 * Start direct microphone recording for voice memo/summary
 */
export async function startVoiceRecording(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CallRecordingModule) return false;

  try {
    const hasPerm = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (hasPerm !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Microphone permission denied.');
    }
    await CallRecordingModule.startVoiceRecording();
    return true;
  } catch (err) {
    console.error('Error starting voice recording:', err);
    throw err;
  }
}

/**
 * Stop microphone recording and return the saved audio file
 */
export async function stopVoiceRecording(): Promise<AudioRecordingFile> {
  if (Platform.OS !== 'android' || !CallRecordingModule) {
    throw new Error('Voice recording not supported on this platform.');
  }

  const result = await CallRecordingModule.stopVoiceRecording();
  return {
    uri: result.uri,
    name: result.name || 'voice_note.m4a',
    size: result.size || 0,
    type: result.type || 'audio/m4a',
  };
}

/**
 * Cancel microphone recording without saving
 */
export async function cancelVoiceRecording(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CallRecordingModule) return false;
  try {
    return await CallRecordingModule.cancelVoiceRecording();
  } catch {
    return false;
  }
}
