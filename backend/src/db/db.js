import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { dataDir } from '../paths.js';

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'bsveiculos.sqlite3'));
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL DEFAULT 'carro',
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    ano INTEGER NOT NULL,
    km INTEGER NOT NULL DEFAULT 0,
    combustivel TEXT NOT NULL DEFAULT '',
    cambio TEXT NOT NULL DEFAULT '',
    cor TEXT NOT NULL DEFAULT '',
    preco REAL NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    detalhes_extras TEXT NOT NULL DEFAULT '',
    disponivel INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS veiculo_fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0
  )
`);

export default db;
