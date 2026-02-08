import * as SQLite from 'expo-sqlite';

// Abre (ou cria) o banco de dados
const db = SQLite.openDatabaseSync('alerta_local.db');

export interface SavedAlert {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  interval_m: number;
  created_at: string;
}

export const DatabaseService = {
  // Inicializa a tabela
  init: () => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius INTEGER NOT NULL,
        interval_m INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },

  // Adiciona um novo ponto
  addAlert: (name: string, lat: number, lng: number, radius: number, interval: number) => {
    const statement = db.prepareSync(
      'INSERT INTO alerts (name, latitude, longitude, radius, interval_m) VALUES ($name, $lat, $lng, $rad, $int)'
    );
    const result = statement.executeSync({ 
      $name: name, 
      $lat: lat, 
      $lng: lng, 
      $rad: radius, 
      $int: interval 
    });
    return result.lastInsertRowId;
  },

  // Busca todos os pontos
  getAllAlerts: (): SavedAlert[] => {
    return db.getAllSync<SavedAlert>('SELECT * FROM alerts ORDER BY created_at DESC');
  },

  // Deleta um ponto
  deleteAlert: (id: number) => {
    db.runSync('DELETE FROM alerts WHERE id = ?', id);
  }
};