import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, TouchableWithoutFeedback } from 'react-native';
import { WebView } from 'react-native-webview'; 
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ControlPanel } from '@/components/ControlPanel';
import { useAlarmSystem } from '@/hooks/useAlarmSystem';
import { DatabaseService } from '@/services/database';

// O HTML do Leaflet continua o mesmo de antes...
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
        // Centraliza o mapa no novo alvo
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

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null); 

  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [target, setTarget] = useState<{latitude: number, longitude: number} | null>(null);
  const [distance, setDistance] = useState<number>(0);
  
  const [radiusInput, setRadiusInput] = useState('500');
  const [intervalInput, setIntervalInput] = useState('100');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true); 
  const [isSearching, setIsSearching] = useState(false); // NOVO STATE

  const { playAlarm, playChime, audioOutput, setAudioOutput } = useAlarmSystem();
  const hasEnteredZoneRef = useRef(false);
  const lastAlertDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    try { DatabaseService.init(); } catch (e) { console.log("Erro DB", e); }
  }, []);

  useEffect(() => {
    if (params.lat && params.lng) {
        const lat = parseFloat(params.lat as string);
        const lng = parseFloat(params.lng as string);
        const rad = params.rad as string;
        const int = params.int as string;
        const name = params.name as string;

        handleNewTarget(lat, lng, parseInt(rad)); 
        setRadiusInput(rad);
        setIntervalInput(int);
        setIsPanelExpanded(false);
        Alert.alert("Local Carregado", `Alvo definido para: ${name}`);
    }
  }, [params]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permissão negada', 'Precisamos do GPS.');
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (newLoc) => {
          setLocation(newLoc.coords);
          webViewRef.current?.injectJavaScript(
            `window.updateUserPosition(${newLoc.coords.latitude}, ${newLoc.coords.longitude}); true;`
          );
        }
      );
    })();
    return () => { subscription?.remove(); };
  }, []);

  useEffect(() => {
    if (target) {
       webViewRef.current?.injectJavaScript(
         `window.updateTarget(${target.latitude}, ${target.longitude}, ${parseInt(radiusInput) || 500}); true;`
       );
    }
  }, [radiusInput]); 

  useEffect(() => {
    if (location && target && isMonitoring) checkProximity(location);
  }, [location, target, isMonitoring]);

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(toRad(lon2 - lon1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const checkProximity = (currentCoords: Location.LocationObjectCoords) => {
    if (!target) return;
    const dist = Math.round(getDistanceInMeters(currentCoords.latitude, currentCoords.longitude, target.latitude, target.longitude));
    setDistance(dist);

    const radius = parseInt(radiusInput) || 500;
    const interval = parseInt(intervalInput) || 100;

    if (dist <= radius) {
      if (!hasEnteredZoneRef.current) {
        hasEnteredZoneRef.current = true;
        lastAlertDistanceRef.current = dist;
        playAlarm();
      } else if (lastAlertDistanceRef.current !== null && (lastAlertDistanceRef.current - dist) >= interval) {
        lastAlertDistanceRef.current = dist;
        playChime();
      }
    } else {
      hasEnteredZoneRef.current = false;
      lastAlertDistanceRef.current = null;
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_CLICK') {
        handleNewTarget(data.lat, data.lng, parseInt(radiusInput));
      }
    } catch (e) { console.log("Erro msg webview", e); }
  };

  const handleNewTarget = (lat: number, lng: number, radius: number) => {
    setTarget({ latitude: lat, longitude: lng });
    webViewRef.current?.injectJavaScript(
      `window.updateTarget(${lat}, ${lng}, ${radius || 500}); true;`
    );
    setIsMonitoring(false);
    hasEnteredZoneRef.current = false;
    lastAlertDistanceRef.current = null;
    // setIsPanelExpanded(true); // Opcional: manter aberto ou fechar
  };

  const toggleMonitoring = () => {
    if (!target) return Alert.alert('Erro', 'Marque um ponto no mapa.');
    const novoEstado = !isMonitoring;
    setIsMonitoring(novoEstado);
    if (!novoEstado) {
      hasEnteredZoneRef.current = false;
      lastAlertDistanceRef.current = null;
    } else {
      setIsPanelExpanded(false);
    }
  };

  const handleSaveToDB = (name: string) => {
    if (!target) return;
    try {
        DatabaseService.addAlert(name, target.latitude, target.longitude, parseInt(radiusInput), parseInt(intervalInput));
        Alert.alert("Sucesso", "Local salvo!");
    } catch (e) { Alert.alert("Erro", "Falha ao salvar."); }
  };

  // --- NOVA FUNÇÃO DE BUSCA ---
  const handleSearchAddress = async (query: string) => {
    setIsSearching(true);
    try {
        // Tenta ver se é coordenada direta (Ex: -23.5, -46.6)
        const coords = query.split(',').map(s => parseFloat(s.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            handleNewTarget(coords[0], coords[1], parseInt(radiusInput));
            Alert.alert("Coordenada", "Local definido manualmente.");
            setIsSearching(false);
            return;
        }

        // Se não for coordenada, busca no Nominatim
        // IMPORTANTE: O User-Agent é obrigatório pela política do OSM
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`, 
            { headers: { 'User-Agent': 'AlertaLocalApp/1.0' } }
        );
        const data = await response.json();

        if (data && data.length > 0) {
            const firstResult = data[0];
            const lat = parseFloat(firstResult.lat);
            const lon = parseFloat(firstResult.lon);
            handleNewTarget(lat, lon, parseInt(radiusInput));
            Alert.alert("Encontrado", firstResult.display_name);
        } else {
            Alert.alert("Ops", "Nenhum local encontrado.");
        }
    } catch (error) {
        Alert.alert("Erro", "Falha na busca. Verifique sua internet.");
    } finally {
        setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: LEAFLET_HTML }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      {isPanelExpanded && (
        <TouchableWithoutFeedback onPress={() => setIsPanelExpanded(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
      )}

      <ControlPanel 
        radius={radiusInput} setRadius={setRadiusInput}
        interval={intervalInput} setInterval={setIntervalInput}
        isMonitoring={isMonitoring} onToggleMonitoring={toggleMonitoring}
        distance={distance} hasTarget={!!target}
        audioOutput={audioOutput} setAudioOutput={setAudioOutput}
        isExpanded={isPanelExpanded}
        onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
        onSave={handleSaveToDB}
        // NOVAS PROPS
        onSearchAddress={handleSearchAddress}
        isSearching={isSearching}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1 },
  map: { flex: 1, backgroundColor: '#eee' }, 
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
  }
});