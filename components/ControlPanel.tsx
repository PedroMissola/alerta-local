import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, TextInput, Button, 
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions 
} from 'react-native';
import { AudioOutput } from '../hooks/useAlarmSystem';

interface ControlPanelProps {
  radius: string;
  setRadius: (v: string) => void;
  interval: string;
  setInterval: (v: string) => void;
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  distance: number;
  hasTarget: boolean;
  audioOutput: AudioOutput;
  setAudioOutput: (v: AudioOutput) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSave: (name: string) => void;
  onSearchAddress: (query: string) => void;
  isSearching: boolean;
}

export function ControlPanel({ 
  radius, setRadius, 
  interval, setInterval, 
  isMonitoring, onToggleMonitoring,
  distance, hasTarget,
  audioOutput, setAudioOutput,
  isExpanded, onToggleExpand,
  onSave,
  onSearchAddress,
  isSearching
}: ControlPanelProps) {
  
  const [saveName, setSaveName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'search'>('config');

  const handleSavePress = () => {
    if (!saveName.trim()) {
      Alert.alert('Nome inválido', 'Digite um nome para salvar o local.');
      return;
    }
    onSave(saveName);
    setSaveName('');
  };

  const handleSearchPress = () => {
    if (!searchQuery.trim()) return;
    onSearchAddress(searchQuery);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.wrapper, isExpanded ? styles.wrapperExpanded : styles.wrapperCollapsed]}
    >
      {/* HEADER (ALÇA) - SEMPRE VISÍVEL */}
      <TouchableOpacity activeOpacity={0.9} onPress={onToggleExpand} style={styles.header}>
        <View style={styles.handle} />
        <Text style={styles.headerTitle}>
          {isExpanded ? "Painel de Controle (Toque para fechar)" : (hasTarget ? `📍 Distância: ${distance}m` : "Toque para Configurar")}
        </Text>
      </TouchableOpacity>

      {/* CONTEÚDO COM SCROLL */}
      {isExpanded && (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ABAS */}
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'config' && styles.activeTab]} 
              onPress={() => setActiveTab('config')}
            >
              <Text style={[styles.tabText, activeTab === 'config' && styles.activeTabText]}>Configurar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'search' && styles.activeTab]} 
              onPress={() => setActiveTab('search')}
            >
              <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>Buscar Local</Text>
            </TouchableOpacity>
          </View>

          {/* ABA CONFIGURAR */}
          {activeTab === 'config' && (
            <View>
                <View style={styles.saveBox}>
                  <Text style={styles.label}>Salvar Local Atual:</Text>
                  <View style={styles.saveRow}>
                    <TextInput 
                      style={[styles.input, { flex: 1, marginRight: 10 }]} 
                      placeholder="Nome (ex: Casa)"
                      value={saveName}
                      onChangeText={setSaveName}
                    />
                    <Button title="Salvar" onPress={handleSavePress} disabled={!hasTarget} />
                  </View>
                </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Raio Alerta (m)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={radius} onChangeText={setRadius} 
                    keyboardType="numeric" placeholder="500"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Intervalo (m)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={interval} onChangeText={setInterval} 
                    keyboardType="numeric" placeholder="100"
                  />
                </View>
              </View>

              <Text style={styles.label}>Saída de Áudio:</Text>
              <View style={styles.audioSelector}>
                <TouchableOpacity 
                  style={[styles.audioBtn, audioOutput === 'default' && styles.audioBtnActive]}
                  onPress={() => setAudioOutput('default')}
                >
                  <Text style={[styles.audioText, audioOutput === 'default' && styles.audioTextActive]}>Automático</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.audioBtn, audioOutput === 'speaker' && styles.audioBtnActive]}
                  onPress={() => setAudioOutput('speaker')}
                >
                  <Text style={[styles.audioText, audioOutput === 'speaker' && styles.audioTextActive]}>Alto-Falante</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ABA BUSCAR */}
          {activeTab === 'search' && (
            <View style={styles.searchContainer}>
              <Text style={styles.label}>Buscar Endereço ou Coordenadas:</Text>
              <Text style={styles.hint}>{'Ex: "Av Paulista, 1000" ou "-23.55, -46.63"'}</Text>              
              <View style={styles.searchRow}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginRight: 10 }]} 
                  placeholder="Digite aqui..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchPress}
                />
                {isSearching ? (
                  <ActivityIndicator color="blue" />
                ) : (
                  <Button title="Buscar" onPress={handleSearchPress} />
                )}
              </View>
            </View>
          )}

          {/* BOTÃO GRANDE NO FINAL DO SCROLL */}
          <View style={styles.footerSpacer} />
        </ScrollView>
      )}

      {/* RODAPÉ FIXO (BOTÃO INICIAR) - Fica fora do ScrollView para estar sempre visível se quiser, 
          ou dentro se quiser que role junto. Aqui deixei FIXO no fundo do painel. */}
      <View style={styles.fixedFooter}>
          <Button 
          title={isMonitoring ? "PARAR MONITORAMENTO" : "INICIAR MONITORAMENTO"}
          color={isMonitoring ? "#d9534f" : "#5cb85c"}
          onPress={onToggleMonitoring}
          />
      </View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute', 
    left: 0, 
    right: 0,
    backgroundColor: 'white', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    elevation: 20, 
    zIndex: 10,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 5,
    overflow: 'hidden' // Garante que nada saia das bordas arredondadas
  },
  wrapperCollapsed: {
    bottom: 0,
    height: 120, // Altura pequena quando fechado
  },
  wrapperExpanded: {
    top: 40, // Começa um pouco abaixo do topo da tela (SafeArea)
    bottom: 0, // Vai até o final da tela
    height: 'auto' // Deixa o flex/top/bottom controlarem
  },
  header: {
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  handle: { 
    width: 40, 
    height: 5, 
    borderRadius: 3, 
    backgroundColor: '#ccc', 
    marginBottom: 8 
  },
  headerTitle: { 
    fontWeight: 'bold', 
    color: '#555', 
    fontSize: 14 
  },
  
  // Estilo do ScrollView
  scrollContent: {
    padding: 20,
    paddingBottom: 100 // Espaço extra para o teclado não cobrir o último item
  },

  tabs: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#2196F3' },
  tabText: { color: '#888', fontWeight: 'bold' },
  activeTabText: { color: '#2196F3' },

  saveBox: { marginBottom: 20 },
  saveRow: { flexDirection: 'row', alignItems: 'center' },
  searchContainer: { marginBottom: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  hint: { fontSize: 10, color: '#999', marginBottom: 5 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  inputGroup: { width: '48%' },
  label: { fontSize: 12, color: '#666', marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12,
    fontSize: 16, textAlign: 'center', backgroundColor: '#f9f9f9',
  },
  audioSelector: {
    flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0',
    borderRadius: 8, padding: 4, marginTop: 5
  },
  audioBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 6 },
  audioBtnActive: { backgroundColor: '#fff', elevation: 2 },
  audioText: { fontSize: 12, color: '#666' },
  audioTextActive: { color: '#000', fontWeight: 'bold' },
  
  footerSpacer: { height: 50 }, // Espaço para não ficar colado no botão fixo
  
  fixedFooter: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  }
});