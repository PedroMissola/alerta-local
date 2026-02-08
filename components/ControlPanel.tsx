import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AudioOutput } from '../hooks/useAlarmSystem';

// ============================================================
// TIPOS
// ============================================================

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

// ============================================================
// COMPONENTE
// ============================================================

export function ControlPanel({
  radius,
  setRadius,
  interval,
  setInterval,
  isMonitoring,
  onToggleMonitoring,
  distance,
  hasTarget,
  audioOutput,
  setAudioOutput,
  isExpanded,
  onToggleExpand,
  onSave,
  onSearchAddress,
  isSearching,
}: ControlPanelProps) {
  const [saveName, setSaveName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'search'>('config');

  // --- HANDLERS ---

  const handleSavePress = () => {
    if (!saveName.trim()) {
      Alert.alert('Erro', 'Nome inválido');
      return;
    }
    onSave(saveName);
    setSaveName('');
  };

  const handleSearchPress = () => {
    if (searchQuery.trim()) {
      onSearchAddress(searchQuery);
    }
  };

  // --- COMPONENTE DE OPÇÃO DE ÁUDIO ---

  const AudioOption = ({ type, label }: { type: AudioOutput; label: string }) => (
    <TouchableOpacity
      style={[styles.audioOption, audioOutput === type && styles.audioOptionActive]}
      onPress={() => setAudioOutput(type)}
    >
      <Text style={[styles.audioText, audioOutput === type && styles.audioTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // --- RENDER ---

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.wrapper, isExpanded ? styles.wrapperExpanded : styles.wrapperCollapsed]}
    >
      {/* HEADER */}
      <TouchableOpacity activeOpacity={0.9} onPress={onToggleExpand} style={styles.header}>
        <View style={styles.handle} />
        <Text style={styles.headerTitle}>
          {isExpanded
            ? 'Painel de Controle'
            : hasTarget
            ? `📍 Distância: ${distance}m`
            : 'Toque para Configurar'}
        </Text>
      </TouchableOpacity>

      {/* CONTEÚDO (quando expandido) */}
      {isExpanded && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* TABS */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'config' && styles.activeTab]}
              onPress={() => setActiveTab('config')}
            >
              <Text style={[styles.tabText, activeTab === 'config' && styles.activeTabText]}>
                Configurar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'search' && styles.activeTab]}
              onPress={() => setActiveTab('search')}
            >
              <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
                Buscar Local
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB: CONFIGURAR */}
          {activeTab === 'config' && (
            <View>
              {/* Salvar Local */}
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

              {/* Raio e Intervalo */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Raio Alerta (m)</Text>
                  <TextInput
                    style={styles.input}
                    value={radius}
                    onChangeText={setRadius}
                    keyboardType="numeric"
                    placeholder="500"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Intervalo (m)</Text>
                  <TextInput
                    style={styles.input}
                    value={interval}
                    onChangeText={setInterval}
                    keyboardType="numeric"
                    placeholder="100"
                  />
                </View>
              </View>

              {/* Modo de Áudio */}
              <Text style={styles.label}>Modo de Áudio:</Text>
              <View style={styles.audioGrid}>
                <View style={styles.audioRow}>
                  <AudioOption type="default" label="Automático" />
                  <AudioOption type="speaker" label="Alto-Falante" />
                </View>
                <View style={styles.audioRow}>
                  <AudioOption type="headphones" label="Fone/Discreto" />
                  <AudioOption type="off" label="Silencioso" />
                </View>
              </View>
            </View>
          )}

          {/* TAB: BUSCAR LOCAL */}
          {activeTab === 'search' && (
            <View style={styles.searchContainer}>
              <Text style={styles.label}>Buscar Endereço ou Coordenadas:</Text>
              <Text style={styles.hint}>Ex: &quot;Av Paulista, 1000&quot; ou &quot;-23.55, -46.63&quot;</Text>
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

          <View style={styles.footerSpacer} />
        </ScrollView>
      )}

      {/* BOTÃO FIXO */}
      <View style={styles.fixedFooter}>
        <Button
          title={isMonitoring ? 'PARAR MONITORAMENTO' : 'INICIAR MONITORAMENTO'}
          color={isMonitoring ? '#d9534f' : '#5cb85c'}
          onPress={onToggleMonitoring}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

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
    overflow: 'hidden',
  },
  wrapperCollapsed: {
    bottom: 0,
    height: 120,
  },
  wrapperExpanded: {
    top: 40,
    bottom: 0,
    height: 'auto',
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
    marginBottom: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: '#2196F3',
  },
  tabText: {
    color: '#888',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#2196F3',
  },
  saveBox: {
    marginBottom: 20,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  hint: {
    fontSize: 10,
    color: '#999',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputGroup: {
    width: '48%',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
  },
  audioGrid: {
    marginTop: 5,
    marginBottom: 20,
  },
  audioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  audioOption: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  audioOptionActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    elevation: 2,
  },
  audioText: {
    fontSize: 12,
    color: '#666',
  },
  audioTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  footerSpacer: {
    height: 50,
  },
  fixedFooter: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});