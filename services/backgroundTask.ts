import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {
  ProximityDetector,
  ProximityEvent,
  loadProximityConfig,
  loadProximityState,
  saveProximityState
} from './proximityService';

export const LOCATION_TASK_NAME = 'background-location-task';

// ============================================================
// CONFIGURAÇÃO DE NOTIFICAÇÕES
// ============================================================

/**
 * Define como notificações aparecem quando o app está aberto.
 * Se o app estiver fechado, o SO controla a exibição.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permissão para notificações (chamar no app init)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[BackgroundTask] Permissão de notificação negada');
    return false;
  }

  return true;
}

// ============================================================
// HELPER: DISPARO DE NOTIFICAÇÃO
// ============================================================

async function sendProximityNotification(event: ProximityEvent, distance: number) {
  try {
    let title = '📍 Alerta de Proximidade';
    let body = '';

    switch (event.type) {
      case 'ZONE_ENTERED':
        title = '🎯 VOCÊ CHEGOU!';
        body = `Você entrou na zona de alerta! Distância: ${distance}m`;
        break;

      case 'INTERVAL_CROSSED':
        title = '📍 APROXIMANDO';
        body = `Você está a ${distance}m do destino!`;
        break;

      case 'ZONE_EXITED':
        title = '↩️ Saiu da Zona';
        body = 'Você saiu da área monitorada';
        break;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        vibrate: [0, 500, 200, 500],
        data: { distance, eventType: event.type },
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Dispara imediatamente
    });

    console.log(`[BackgroundTask] Notificação enviada: ${event.type} (${distance}m)`);
  } catch (error) {
    console.error('[BackgroundTask] Erro ao enviar notificação:', error);
  }
}

// ============================================================
// DEFINIÇÃO DA TASK
// ============================================================

/**
 * Task executada em background pelo Expo Location.
 * 
 * FLUXO:
 * 1. Recebe atualização de localização
 * 2. Carrega config e estado do storage
 * 3. Usa ProximityDetector para analisar posição
 * 4. Se houver evento, dispara notificação
 * 5. Salva novo estado no storage
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('[BackgroundTask] Erro na task:', error);
    return;
  }

  if (!data) {
    console.warn('[BackgroundTask] Data vazio');
    return;
  }

  const { locations } = data;
  const currentLocation = locations[0];

  if (!currentLocation?.coords) {
    console.warn('[BackgroundTask] Localização inválida');
    return;
  }

  try {
    // 1. Carrega configuração do alvo
    const config = await loadProximityConfig();
    if (!config) {
      console.log('[BackgroundTask] Sem alvo configurado, ignorando');
      return;
    }

    // 2. Carrega estado anterior (se existir)
    const savedState = await loadProximityState();
    const detector = new ProximityDetector();

    // Restaura estado se existir
    if (savedState) {
      // Hack: injeta estado via método privado (ideal seria ter um setter)
      (detector as any).state = savedState;
    }

    // 3. Analisa nova posição
    const currentCoords = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };

    const { distance, event } = detector.checkPosition(currentCoords, config);

    console.log(
      `[BackgroundTask] Posição: ${distance}m | ` +
      `Evento: ${event?.type || 'nenhum'}`
    );

    // 4. Se houve evento, notifica
    if (event) {
      await sendProximityNotification(event, distance);
    }

    // 5. Salva novo estado para próxima iteração
    await saveProximityState(detector.getState());

  } catch (error) {
    console.error('[BackgroundTask] Erro ao processar localização:', error);
  }
});

// ============================================================
// HELPERS PARA CONTROLE DA TASK
// ============================================================

/**
 * Verifica se a task está rodando
 */
export async function isBackgroundTaskRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}

/**
 * Inicia monitoramento em background
 */
export async function startBackgroundMonitoring(): Promise<void> {
  // Verifica se já está rodando
  const isRunning = await isBackgroundTaskRunning();
  if (isRunning) {
    console.log('[BackgroundTask] Já está rodando');
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 10, // Checa a cada 10 metros
    deferredUpdatesInterval: 5000, // Economia de bateria
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Alerta Local Ativo',
      notificationBody: 'Monitorando sua proximidade...',
      notificationColor: '#2196F3',
    },
  });

  console.log('[BackgroundTask] Iniciado');
}

/**
 * Para monitoramento em background
 */
export async function stopBackgroundMonitoring(): Promise<void> {
  const isRunning = await isBackgroundTaskRunning();
  if (!isRunning) {
    console.log('[BackgroundTask] Não está rodando');
    return;
  }

  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  console.log('[BackgroundTask] Parado');
}