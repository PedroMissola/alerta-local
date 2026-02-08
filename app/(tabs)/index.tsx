import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Alert, TouchableWithoutFeedback, Vibration } from 'react-native';
import { WebView } from 'react-native-webview'; 
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ControlPanel } from '@/components/ControlPanel';
import { useAlarmSystem } from '@/hooks/useAlarmSystem';
import { DatabaseService } from '@/services/database';
import {
  ProximityDetector,
  ProximityConfig,
  saveProximityConfig,
  clearProximityData,
  Coordinates,
} from '@/services/proximityService';
import {
  startBackgroundMonitoring,
  stopBackgroundMonitoring,
  requestNotificationPermissions,
} from '@/services/backgroundTask';

// ============================================================
// HTML DO MAPA (LEAFLET)
// ============================================================

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([0, 0], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var userMarker = null;
    var targetMarker = null;
    var targetCircle = null;

    var userIcon = L.divIcon({
      className: 'user-marker',
      html: '<div style="background-color: #2196F3; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>',
      iconSize: [20, 20]
    });

    window.updateUserPosition = function(lat, lng) {
      if (!userMarker) {
        userMarker = L.marker([lat, lng], {icon: userIcon}).addTo(map);
        map.setView([lat, lng], 15);
      } else {
        userMarker.setLatLng([lat, lng]);
      }
    };

    window.updateTarget = function(lat, lng, radius) {
      if (targetMarker) map.removeLayer(targetMarker);
      if (targetCircle) map.removeLayer(targetCircle);

      if (lat && lng) {
        targetMarker = L.marker([lat, lng]).addTo(map);
        targetCircle = L.circle([lat, lng], {
          color: 'red', fillColor: '#f03', fillOpacity: 0.2, radius: radius || 500
        }).addTo(map);
        map.setView([lat, lng], 16);
      }
    };

    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'MAP_CLICK', lat: e.latlng.lat, lng: e.latlng.lng
      }));
    });
  </script>
</body>
</html>
`;

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);

  // --- ESTADOS ---
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [target, setTarget] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number>(0);
  
  const [radiusInput, setRadiusInput] = useState('500');
  const [intervalInput, setIntervalInput] = useState('100');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // --- HOOKS ---
  const { playAlarm, playChime, audioOutput, setAudioOutput } = useAlarmSystem();
  
  // Detector de proximidade para foreground
  const detectorRef = useRef(new ProximityDetector());

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  useEffect(() => {
    // Inicializa banco de dados
    try {
      DatabaseService.init();
    } catch (e) {
      console.error('[HomeScreen] Erro ao iniciar DB:', e);
    }

    // Solicita permissão de notificações
    requestNotificationPermissions();
  }, []);

  // ============================================================
  // CONTROLE DE ALVO
  // ============================================================

  /**
   * Define novo alvo no mapa e reseta monitoramento
   */
  const handleNewTarget = useCallback(async (lat: number, lng: number) => {
    Vibration.vibrate(50);

    const newTarget: Coordinates = { latitude: lat, longitude: lng };
    setTarget(newTarget);

    // Atualiza visual do mapa
    const radius = parseInt(radiusInput) || 500;
    webViewRef.current?.injectJavaScript(
      `window.updateTarget(${lat}, ${lng}, ${radius}); true;`
    );

    // Salva configuração para background
    const config: ProximityConfig = {
      targetCoords: newTarget,
      radius,
      interval: parseInt(intervalInput) || 100,
    };
    await saveProximityConfig(config);

    // Reseta detector foreground
    detectorRef.current.reset();

    // Para monitoramento se estiver ativo
    if (isMonitoring) {
      await stopMonitoringInternal();
    }

    setIsPanelExpanded(true);
  }, [radiusInput, intervalInput, isMonitoring]);

  // ============================================================
  // ATUALIZAÇÃO DE CONFIGURAÇÕES
  // ============================================================

  /**
   * Atualiza raio e intervalo no storage e mapa
   */
  useEffect(() => {
    if (!target) return;

    const updateConfig = async () => {
      const config: ProximityConfig = {
        targetCoords: target,
        radius: parseInt(radiusInput) || 500,
        interval: parseInt(intervalInput) || 100,
      };
      await saveProximityConfig(config);

      // Atualiza visual
      webViewRef.current?.injectJavaScript(
        `window.updateTarget(${target.latitude}, ${target.longitude}, ${config.radius}); true;`
      );
    };

    updateConfig();
  }, [radiusInput, intervalInput, target]);

  // ============================================================
  // PARÂMETROS DE NAVEGAÇÃO (Tela "Salvos")
  // ============================================================

  useEffect(() => {
    if (!params.lat || !params.lng) return;

    const lat = parseFloat(params.lat as string);
    const lng = parseFloat(params.lng as string);
    const rad = params.rad as string;
    const int = params.int as string;

    // Evita loop se já é o mesmo alvo
    if (target && 
        Math.abs(target.latitude - lat) < 0.00001 && 
        Math.abs(target.longitude - lng) < 0.00001) {
      return;
    }

    // Atualiza
    setRadiusInput(rad);
    setIntervalInput(int);
    handleNewTarget(lat, lng);
    setIsPanelExpanded(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lat, params.lng, params.rad, params.int]);

  // ============================================================
  // GPS FOREGROUND
  // ============================================================

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startGPS = async () => {
      // Permissão foreground
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert('Erro', 'Permissão de GPS é necessária');
        return;
      }

      // Permissão background (avisa mas não bloqueia)
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        Alert.alert(
          'Atenção',
          'Sem permissão de localização "Permitir o Tempo Todo", o alarme pode não funcionar com a tela bloqueada.'
        );
      }

      // Inicia monitoramento
      subscription = await Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.High, 
          distanceInterval: 5 
        },
        (newLoc) => {
          const coords: Coordinates = {
            latitude: newLoc.coords.latitude,
            longitude: newLoc.coords.longitude,
          };
          setLocation(coords);

          // Atualiza bolinha azul no mapa
          webViewRef.current?.injectJavaScript(
            `window.updateUserPosition(${coords.latitude}, ${coords.longitude}); true;`
          );
        }
      );
    };

    startGPS();

    return () => {
      subscription?.remove();
    };
  }, []);

  // ============================================================
  // LÓGICA DE PROXIMIDADE (FOREGROUND)
  // ============================================================

  useEffect(() => {
    if (!location || !target || !isMonitoring) return;

    const config: ProximityConfig = {
      targetCoords: target,
      radius: parseInt(radiusInput) || 500,
      interval: parseInt(intervalInput) || 100,
    };

    const { distance: dist, event } = detectorRef.current.checkPosition(location, config);
    setDistance(dist);

    // Dispara som/vibração se houver evento
    if (event) {
      switch (event.type) {
        case 'ZONE_ENTERED':
          console.log('[HomeScreen] Entrou na zona!');
          playAlarm();
          break;

        case 'INTERVAL_CROSSED':
          console.log(`[HomeScreen] Intervalo cruzado: ${event.delta}m`);
          playChime();
          break;

        case 'ZONE_EXITED':
          console.log('[HomeScreen] Saiu da zona');
          break;
      }
    }
  }, [location, target, isMonitoring, radiusInput, intervalInput, playAlarm, playChime]);

  // ============================================================
  // CONTROLE DE MONITORAMENTO
  // ============================================================

  const startMonitoringInternal = async () => {
    if (!target) {
      Alert.alert('Erro', 'Marque um ponto no mapa primeiro');
      return;
    }

    // Reseta detector
    detectorRef.current.reset();

    // Inicia background task
    try {
      await startBackgroundMonitoring();
      setIsMonitoring(true);
      setIsPanelExpanded(false);
      console.log('[HomeScreen] Monitoramento iniciado');
    } catch (error) {
      console.error('[HomeScreen] Erro ao iniciar:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o monitoramento');
    }
  };

  const stopMonitoringInternal = async () => {
    try {
      await stopBackgroundMonitoring();
      await clearProximityData();
      detectorRef.current.reset();
      setIsMonitoring(false);
      console.log('[HomeScreen] Monitoramento parado');
    } catch (error) {
      console.error('[HomeScreen] Erro ao parar:', error);
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoringInternal();
    } else {
      startMonitoringInternal();
    }
  };

  // ============================================================
  // HANDLERS DE UI
  // ============================================================

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_CLICK') {
        handleNewTarget(data.lat, data.lng);
      }
    } catch (e) {
      console.error('[HomeScreen] Erro ao processar mensagem WebView:', e);
    }
  };

  const handleSaveToDB = (name: string) => {
    if (!target) return;

    try {
      DatabaseService.addAlert(
        name,
        target.latitude,
        target.longitude,
        parseInt(radiusInput),
        parseInt(intervalInput)
      );
      Alert.alert('Sucesso', 'Local salvo!');
    } catch (e) {
      console.error('[HomeScreen] Erro ao salvar:', e);
      Alert.alert('Erro', 'Falha ao salvar');
    }
  };

  const handleSearchAddress = async (query: string) => {
    setIsSearching(true);

    try {
      // Tenta interpretar como coordenada manual
      const coords = query.split(',').map(s => parseFloat(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        await handleNewTarget(coords[0], coords[1]);
        Alert.alert('Coordenada', 'Local definido manualmente');
        return;
      }

      // Busca no Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'AlertaLocalApp/1.0' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        await handleNewTarget(parseFloat(result.lat), parseFloat(result.lon));
        Alert.alert('Encontrado', result.display_name);
      } else {
        Alert.alert('Ops', 'Nenhum local encontrado');
      }
    } catch (error) {
      console.error('[HomeScreen] Erro na busca:', error);
      Alert.alert('Erro', 'Falha na busca. Verifique sua internet.');
    } finally {
      setIsSearching(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: LEAFLET_HTML }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {isPanelExpanded && (
        <TouchableWithoutFeedback onPress={() => setIsPanelExpanded(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      <ControlPanel
        radius={radiusInput}
        setRadius={setRadiusInput}
        interval={intervalInput}
        setInterval={setIntervalInput}
        isMonitoring={isMonitoring}
        onToggleMonitoring={toggleMonitoring}
        distance={distance}
        hasTarget={!!target}
        audioOutput={audioOutput}
        setAudioOutput={setAudioOutput}
        isExpanded={isPanelExpanded}
        onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
        onSave={handleSaveToDB}
        onSearchAddress={handleSearchAddress}
        isSearching={isSearching}
      />
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
    backgroundColor: '#eee',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
  },
});