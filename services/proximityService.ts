export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ProximityConfig {
  targetCoords: Coordinates;
  radius: number;        // Distância para considerar "dentro da zona" (metros)
  interval: number;      // Intervalo mínimo para alertas sucessivos (metros)
}

export interface ProximityState {
  isInsideZone: boolean;
  lastAlertDistance: number | null;
}

export type ProximityEvent = 
  | { type: 'ZONE_ENTERED'; distance: number }
  | { type: 'INTERVAL_CROSSED'; distance: number; delta: number }
  | { type: 'ZONE_EXITED' };

// ============================================================
// CÁLCULO DE DISTÂNCIA (HAVERSINE)
// ============================================================

/**
 * Calcula distância entre dois pontos usando fórmula de Haversine.
 * @returns Distância em metros (arredondada)
 */
export function calculateDistance(
  point1: Coordinates, 
  point2: Coordinates
): number {
  const R = 6371e3; // Raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);

  const a = 
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(point1.latitude)) * 
    Math.cos(toRad(point2.latitude)) * 
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c);
}

// ============================================================
// DETECTOR DE EVENTOS DE PROXIMIDADE
// ============================================================

export class ProximityDetector {
  private state: ProximityState = {
    isInsideZone: false,
    lastAlertDistance: null,
  };

  /**
   * Reseta o estado interno (útil ao mudar de alvo)
   */
  reset(): void {
    this.state = {
      isInsideZone: false,
      lastAlertDistance: null,
    };
  }

  /**
   * Analisa nova posição e retorna evento se necessário.
   * 
   * LÓGICA:
   * 1. Calcula distância atual
   * 2. SE distância <= raio:
   *    - SE primeira vez na zona → ZONE_ENTERED
   *    - SE já estava e andou >= intervalo → INTERVAL_CROSSED
   * 3. SE distância > raio E estava dentro → ZONE_EXITED
   * 
   * @returns Evento de proximidade OU null se nada mudou
   */
  checkPosition(
    currentPos: Coordinates,
    config: ProximityConfig
  ): { distance: number; event: ProximityEvent | null } {
    const distance = calculateDistance(currentPos, config.targetCoords);
    const { radius, interval } = config;
    
    // --- DENTRO DA ZONA ---
    if (distance <= radius) {
      // Primeira entrada?
      if (!this.state.isInsideZone) {
        this.state.isInsideZone = true;
        this.state.lastAlertDistance = distance;
        
        return {
          distance,
          event: { type: 'ZONE_ENTERED', distance }
        };
      }
      
      // Já estava, verificar intervalo
      if (this.state.lastAlertDistance !== null) {
        const delta = this.state.lastAlertDistance - distance;
        
        if (delta >= interval) {
          this.state.lastAlertDistance = distance;
          
          return {
            distance,
            event: { type: 'INTERVAL_CROSSED', distance, delta }
          };
        }
      }
      
      // Dentro mas sem evento
      return { distance, event: null };
    }
    
    // --- FORA DA ZONA ---
    if (this.state.isInsideZone) {
      // Acabou de sair
      this.state.isInsideZone = false;
      this.state.lastAlertDistance = null;
      
      return {
        distance,
        event: { type: 'ZONE_EXITED' }
      };
    }
    
    // Fora e já estava fora
    return { distance, event: null };
  }

  /**
   * Retorna estado atual (útil para debug)
   */
  getState(): Readonly<ProximityState> {
    return { ...this.state };
  }
}

// ============================================================
// STORAGE HELPERS (Para Background/Foreground Sync)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CONFIG: 'proximity_config',
  STATE: 'proximity_state',
} as const;

/**
 * Salva configuração no storage (para background ler)
 */
export async function saveProximityConfig(config: ProximityConfig): Promise<void> {
  await AsyncStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
}

/**
 * Carrega configuração do storage
 */
export async function loadProximityConfig(): Promise<ProximityConfig | null> {
  const json = await AsyncStorage.getItem(KEYS.CONFIG);
  return json ? JSON.parse(json) : null;
}

/**
 * Salva estado no storage (para sincronizar foreground/background)
 */
export async function saveProximityState(state: ProximityState): Promise<void> {
  await AsyncStorage.setItem(KEYS.STATE, JSON.stringify(state));
}

/**
 * Carrega estado do storage
 */
export async function loadProximityState(): Promise<ProximityState | null> {
  const json = await AsyncStorage.getItem(KEYS.STATE);
  return json ? JSON.parse(json) : null;
}

/**
 * Limpa toda configuração e estado (ao parar monitoramento)
 */
export async function clearProximityData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CONFIG, KEYS.STATE]);
}