import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatabaseService, SavedAlert } from '@/services/database';
import { Ionicons } from '@expo/vector-icons'; // Ícones já vem no Expo

export default function SavedScreen() {
  const [alerts, setAlerts] = useState<SavedAlert[]>([]);
  const router = useRouter();

  // Carrega os dados toda vez que a tela ganha foco (quando você clica na aba)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = () => {
    try {
      const data = DatabaseService.getAllAlerts();
      setAlerts(data);
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Confirmar", "Deseja apagar este local?", [
        { text: "Cancelar" },
        { text: "Apagar", style: 'destructive', onPress: () => {
            DatabaseService.deleteAlert(id);
            loadData();
        }}
    ]);
  };

  const handleUseLocation = (item: SavedAlert) => {
    // Vamos mandar o usuário de volta para o mapa com os parâmetros
    // O router.push para a home ('/') pode passar parametros via query
    router.push({
        pathname: '/',
        params: {
            lat: item.latitude,
            lng: item.longitude,
            rad: item.radius,
            int: item.interval_m,
            name: item.name
        }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Meus Locais Salvos</Text>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum local salvo ainda.</Text>
            <Text style={styles.emptySubText}>Marque um ponto no mapa e clique em salvar.</Text>
        </View>
      ) : (
        <FlatList
            data={alerts}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
            <View style={styles.card}>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSub}>
                        Raio: {item.radius}m | Intervalo: {item.interval_m}m
                    </Text>
                    <Text style={styles.cardCoords}>
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </Text>
                </View>
                
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleUseLocation(item)} style={styles.useBtn}>
                        <Ionicons name="map-outline" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.delBtn}>
                         <Ionicons name="trash-outline" size={24} color="#ff4444" />
                    </TouchableOpacity>
                </View>
            </View>
            )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 20, color: '#333' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, color: '#888', fontWeight: 'bold' },
  emptySubText: { fontSize: 14, color: '#aaa', marginTop: 5 },
  listContent: { padding: 15 },
  card: {
    backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardSub: { fontSize: 14, color: '#666', marginTop: 5 },
  cardCoords: { fontSize: 12, color: '#999', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  useBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8 },
  delBtn: { backgroundColor: '#fff0f0', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ffcccc' }
});