import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration, Platform } from 'react-native';

export type AudioOutput = 'default' | 'speaker' | 'headphones' | 'off';

interface SoundPool {
  chime: Audio.Sound | null;
  currentAlarm: Audio.Sound | null;
}

const ALARM_SOUNDS = [
  require('@/assets/sounds/longs/long_alarm_1.mp3'),
  require('@/assets/sounds/longs/long_alarm_2.mp3'),
  require('@/assets/sounds/longs/long_alarm_3.mp3'),
  require('@/assets/sounds/longs/long_alarm_4.mp3'),
  require('@/assets/sounds/longs/long_alarm_5.mp3'),
  require('@/assets/sounds/longs/long_alarm_6.mp3'),
];

const CHIME_SOUND = require('@/assets/sounds/chime.mp3');

export function useAlarmSystem() {
  const [audioOutput, setAudioOutput] = useState<AudioOutput>('default');
  const soundPoolRef = useRef<SoundPool>({ chime: null, currentAlarm: null });
  
  // Timer para auto-parar sons (corrigido para React Native)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const configureAudioMode = useCallback(async (output: AudioOutput) => {
    if (output === 'off') return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: output === 'headphones',
        ...(Platform.OS === 'ios' && output === 'speaker' && {
          // Força alto-falante no iOS
          playsInSilentModeIOS: true,
        }),
      });
    } catch (error) {
      console.error('[AlarmSystem] Erro ao configurar áudio:', error);
    }
  }, []);

  // ============================================================
  // CARREGAMENTO DE SONS
  // ============================================================

  const loadSounds = useCallback(async () => {
    try {
      // Carrega sino (loop)
      const { sound: chime } = await Audio.Sound.createAsync(
        CHIME_SOUND,
        { isLooping: true, volume: 1.0 }
      );
      soundPoolRef.current.chime = chime;
    } catch (error) {
      console.error('[AlarmSystem] Erro ao carregar sons:', error);
    }
  }, []);

  // ============================================================
  // CLEANUP GERAL
  // ============================================================

  const cleanupSounds = useCallback(async () => {
    const { chime, currentAlarm } = soundPoolRef.current;

    try {
      if (chime) {
        await chime.stopAsync();
        await chime.unloadAsync();
      }
      if (currentAlarm) {
        await currentAlarm.stopAsync();
        await currentAlarm.unloadAsync();
      }
    } catch (error) {
      console.error('[AlarmSystem] Erro ao limpar sons:', error);
    }

    soundPoolRef.current = { chime: null, currentAlarm: null };

    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  // ============================================================
  // EFEITOS
  // ============================================================

  // Inicialização
  useEffect(() => {
    loadSounds();
    return () => {
      cleanupSounds();
    };
  }, [loadSounds, cleanupSounds]);

  // Atualiza modo de áudio quando output muda
  useEffect(() => {
    configureAudioMode(audioOutput);
  }, [audioOutput, configureAudioMode]);

  // ============================================================
  // HELPER: PARAR SOM APÓS TIMEOUT
  // ============================================================

  const scheduleStop = useCallback((sound: Audio.Sound, durationMs: number) => {
    // Limpa timer anterior
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
    }

    stopTimerRef.current = setTimeout(async () => {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.stopAsync();
        }
      } catch (error) {
        console.error('[AlarmSystem] Erro ao parar som:', error);
      }
    }, durationMs);
  }, []);

  // ============================================================
  // TOCAR ALARME LONGO
  // ============================================================

  const playAlarm = useCallback(async () => {
    console.log('🔊 [AlarmSystem] Tocando ALARME');

    // Vibração forte
    Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);

    if (audioOutput === 'off') {
      console.log('🔇 [AlarmSystem] Áudio desabilitado');
      return;
    }

    try {
      // Descarrega alarme anterior se existir
      if (soundPoolRef.current.currentAlarm) {
        await soundPoolRef.current.currentAlarm.stopAsync();
        await soundPoolRef.current.currentAlarm.unloadAsync();
      }

      // Seleciona alarme aleatório
      const randomIndex = Math.floor(Math.random() * ALARM_SOUNDS.length);
      const { sound } = await Audio.Sound.createAsync(
        ALARM_SOUNDS[randomIndex],
        { isLooping: true, volume: 1.0 }
      );

      soundPoolRef.current.currentAlarm = sound;

      // Toca e agenda parada após 8 segundos
      await sound.playAsync();
      scheduleStop(sound, 8000);
    } catch (error) {
      console.error('[AlarmSystem] Erro ao tocar alarme:', error);
    }
  }, [audioOutput, scheduleStop]);

  // ============================================================
  // TOCAR SINO (CHIME)
  // ============================================================

  const playChime = useCallback(async () => {
    console.log('🔔 [AlarmSystem] Tocando SINO');

    // Vibração curta
    Vibration.vibrate([0, 200, 100, 200]);

    if (audioOutput === 'off') {
      console.log('🔇 [AlarmSystem] Áudio desabilitado');
      return;
    }

    const { chime } = soundPoolRef.current;
    if (!chime) {
      console.warn('[AlarmSystem] Som de sino não carregado');
      return;
    }

    try {
      // Para e volta ao início
      await chime.stopAsync();
      await chime.setPositionAsync(0);
      await chime.playAsync();

      // Agenda parada após 3 segundos
      scheduleStop(chime, 3000);
    } catch (error) {
      console.error('[AlarmSystem] Erro ao tocar sino:', error);
    }
  }, [audioOutput, scheduleStop]);

  // ============================================================
  // RETORNO
  // ============================================================

  return {
    playAlarm,
    playChime,
    audioOutput,
    setAudioOutput,
  };
}