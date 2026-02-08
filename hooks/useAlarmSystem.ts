import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

export type AudioOutput = 'default' | 'speaker';

// Lista de sons longos. Adicione todos os seus sons da pasta /assets/sounds/longs/ aqui.
// O Metro Bundler (usado pelo Expo) precisa saber de todos os assets em tempo de compilação.
const longAlarmSounds = [
  require('@/assets/sounds/longs/long_alarm_1.mp3'),
  require('@/assets/sounds/longs/long_alarm_2.mp3'),
  require('@/assets/sounds/longs/long_alarm_3.mp3'),
  require('@/assets/sounds/longs/long_alarm_4.mp3'),
  require('@/assets/sounds/longs/long_alarm_5.mp3'),
  require('@/assets/sounds/longs/long_alarm_6.mp3'),
];

export function useAlarmSystem() {
  const [audioOutput, setAudioOutput] = useState<AudioOutput>('default');
  const chimeSoundRef = useRef<Audio.Sound | null>(null);
  const currentAlarmSoundRef = useRef<Audio.Sound | null>(null); // Ref para o som de alarme carregado
  
  // Para controlar o tempo de parada (setTimeout em RN retorna um number)
  const stopTimerRef = useRef<number | null>(null);

  const configureAudio = useCallback(async (output: AudioOutput) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: output !== 'speaker',
      });
    } catch (e) { console.log('Erro ao configurar áudio:', e); }
  }, []);

  const loadSounds = useCallback(async () => {
    try {
      // Carrega o som de sino a partir dos assets locais
      const { sound: chime } = await Audio.Sound.createAsync(
        require('@/assets/sounds/chime.mp3'), // ATENÇÃO: Verifique se o caminho está correto
        { isLooping: true }
      );
      chimeSoundRef.current = chime;
    } catch (error) { console.log('Erro ao carregar som de sino:', error); }
  }, []);

  // Efeito para carregar sons na montagem e descarregar na desmontagem
  useEffect(() => {
    loadSounds();
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      chimeSoundRef.current?.unloadAsync();
      currentAlarmSoundRef.current?.unloadAsync(); // Garante que o alarme atual seja descarregado
    };
  }, [loadSounds]);

  // Efeito para reconfigurar o áudio quando a saída mudar
  useEffect(() => {
    configureAudio(audioOutput);
  }, [audioOutput, configureAudio]);

  // Função auxiliar para parar sons após X tempo
  const stopAfter = useCallback((sound: Audio.Sound, durationMs: number) => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);

    stopTimerRef.current = setTimeout(async () => {
      try {
        await sound.stopAsync();
      } catch (e) { console.log('Erro ao parar som:', e); }
    }, durationMs);
  }, []);

  const playAlarm = useCallback(async () => {
    console.log("🔊 ALARME (8 segundos)");
    Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]); 
    try {
      // 1. Descarrega o som anterior para liberar memória
      if (currentAlarmSoundRef.current) {
        await currentAlarmSoundRef.current.unloadAsync();
      }

      // 2. Escolhe um som aleatório da lista
      const randomIndex = Math.floor(Math.random() * longAlarmSounds.length);
      const randomSoundSource = longAlarmSounds[randomIndex];

      // 3. Carrega e toca o novo som
      const { sound } = await Audio.Sound.createAsync(
        randomSoundSource,
        { isLooping: true }
      );
      currentAlarmSoundRef.current = sound;
      await sound.playFromPositionAsync(0);
      stopAfter(sound, 8000); // Para após 8 segundos
    } catch (e) { console.log('Erro ao tocar alarme:', e); }
  }, [stopAfter]);

  const playChime = useCallback(async () => {
    console.log("🔔 SINO (3 segundos)");
    Vibration.vibrate([0, 200, 100, 200]);
    try {
      if (chimeSoundRef.current) {
        await chimeSoundRef.current.playFromPositionAsync(0);
        stopAfter(chimeSoundRef.current, 3000); // Para após 3 segundos (entre 2 e 5)
      }
    } catch (e) { console.log('Erro ao tocar sino:', e); }
  }, [stopAfter]);

  return { playAlarm, playChime, audioOutput, setAudioOutput };
}