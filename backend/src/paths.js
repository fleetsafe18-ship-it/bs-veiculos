import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// No Railway, com um Volume montado, RAILWAY_VOLUME_MOUNT_PATH aponta pro
// diretório persistente (ex: /data) — banco e fotos vivem lá, sobrevivendo a
// redeploys. Sem essa variável (dev local), cai na raiz do backend, como sempre.
export const baseDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..');
export const dataDir = path.join(baseDir, 'data');
export const uploadsDir = path.join(baseDir, 'uploads');
