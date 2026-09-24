import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import * as veiculosRepo from '../db/veiculosRepo.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadsDir } from '../paths.js';

fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_FOTOS_POR_ENVIO = 24;
const LADO_MAXIMO_PX = 2400;
const QUALIDADE_JPEG = 85;

// Guarda o arquivo em memória (não em disco) — cada foto passa pelo sharp
// antes de ser gravada, então o storage bruto do multer é só um buffer
// temporário. Aceita qualquer image/*, incluindo HEIC de iPhone: o sharp
// decodifica e sempre grava como .jpg, então o formato de origem não importa
// pro resultado final (nem pro navegador que depois vai exibir a foto).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: MAX_FOTOS_POR_ENVIO },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`"${file.originalname}" não é uma imagem`));
    }
  },
});

function removerArquivoDaFoto(foto) {
  if (!foto || !foto.url || !foto.url.startsWith('/uploads/')) return;
  const caminho = path.join(uploadsDir, path.basename(foto.url));
  fs.unlink(caminho, () => {});
}

export const adminRouter = Router();

adminRouter.use(requireAuth);

// Lista todos os veículos, disponíveis ou não
adminRouter.get('/veiculos', async (req, res) => {
  const veiculos = await veiculosRepo.listTodos();
  res.json(veiculos);
});

adminRouter.get('/veiculos/:id', async (req, res) => {
  const veiculo = await veiculosRepo.getPorId(req.params.id);
  if (!veiculo) {
    return res.status(404).json({ erro: 'Veículo não encontrado' });
  }
  res.json(veiculo);
});

adminRouter.post('/veiculos', async (req, res) => {
  const { marca, modelo, ano, preco } = req.body || {};

  if (!marca || !modelo || !ano || !preco) {
    return res.status(400).json({ erro: 'marca, modelo, ano e preco são obrigatórios' });
  }

  const veiculo = await veiculosRepo.criar(req.body);
  res.status(201).json(veiculo);
});

adminRouter.put('/veiculos/:id', async (req, res) => {
  const veiculo = await veiculosRepo.atualizar(req.params.id, req.body || {});

  if (!veiculo) {
    return res.status(404).json({ erro: 'Veículo não encontrado' });
  }

  res.json(veiculo);
});

adminRouter.delete('/veiculos/:id', async (req, res) => {
  const veiculo = await veiculosRepo.getPorId(req.params.id);
  if (!veiculo) {
    return res.status(404).json({ erro: 'Veículo não encontrado' });
  }

  await veiculosRepo.remover(req.params.id);
  veiculo.fotos.forEach(removerArquivoDaFoto);

  res.status(204).send();
});

// ===== Fotos do veículo =====

adminRouter.post('/veiculos/:id/fotos', (req, res) => {
  upload.array('fotos', MAX_FOTOS_POR_ENVIO)(req, res, async (err) => {
    if (err) {
      // multer manda "File too large" nesse formato quando estoura o limite
      const mensagem = err.code === 'LIMIT_FILE_SIZE'
        ? 'Uma das fotos passa de 25MB, mesmo já comprimida. Tente uma foto menor.'
        : err.message;
      return res.status(400).json({ erro: mensagem });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }

    const veiculo = await veiculosRepo.getPorId(req.params.id);
    if (!veiculo) {
      return res.status(404).json({ erro: 'Veículo não encontrado' });
    }

    // Processa o lote inteiro antes de gravar qualquer coisa no banco: se uma
    // foto falhar, nenhuma do lote fica "pendurada" sem aparecer em lugar
    // nenhum — o usuário sempre vê um erro claro, nunca um upload silencioso.
    const urls = [];
    const arquivosGravados = [];
    try {
      for (const file of req.files) {
        const nomeArquivo = `${uuidv4()}.jpg`;
        const destino = path.join(uploadsDir, nomeArquivo);
        try {
          await sharp(file.buffer)
            .rotate() // aplica a orientação EXIF antes de descartar os metadados
            .resize({ width: LADO_MAXIMO_PX, height: LADO_MAXIMO_PX, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: QUALIDADE_JPEG })
            .toFile(destino);
        } catch {
          throw new Error(`Não foi possível processar "${file.originalname}" — formato não suportado ou arquivo corrompido.`);
        }
        arquivosGravados.push(destino);
        urls.push(`/uploads/${nomeArquivo}`);
      }
    } catch (erroProcessamento) {
      arquivosGravados.forEach((caminho) => fs.unlink(caminho, () => {}));
      return res.status(400).json({ erro: erroProcessamento.message });
    }

    const fotos = await veiculosRepo.adicionarFotos(req.params.id, urls);
    res.status(201).json(fotos);
  });
});

adminRouter.put('/veiculos/:id/fotos/ordem', async (req, res) => {
  const { ordem } = req.body || {};

  if (!Array.isArray(ordem) || ordem.length === 0) {
    return res.status(400).json({ erro: 'ordem deve ser uma lista de ids de foto' });
  }

  const fotos = await veiculosRepo.reordenarFotos(req.params.id, ordem);
  res.json(fotos);
});

adminRouter.delete('/veiculos/:id/fotos/:fotoId', async (req, res) => {
  const foto = await veiculosRepo.removerFoto(req.params.fotoId);
  if (!foto) {
    return res.status(404).json({ erro: 'Foto não encontrada' });
  }

  removerArquivoDaFoto(foto);
  res.status(204).send();
});
