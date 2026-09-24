import imageCompression from 'browser-image-compression';

const OPCOES = {
  maxWidthOrHeight: 1920,
  initialQuality: 0.8,
  maxSizeMB: 2.5,
  useWebWorker: true,
};

// Comprime cada foto no navegador antes do upload — essencial em conexão de
// dados móveis, onde uma foto de 8-15MB de celular (ou HEIC de iPhone, que o
// Safari já decodifica nativamente aqui) travava o envio. Se uma foto
// específica falhar a compressão (formato raro, arquivo corrompido), ela
// segue pro upload do jeito que veio, sem travar as outras — o backend sabe
// lidar com o arquivo original de qualquer forma.
export async function comprimirFotos(arquivos) {
  const resultados = [];
  for (const arquivo of arquivos) {
    try {
      const comprimido = await imageCompression(arquivo, OPCOES);
      resultados.push(new File([comprimido], arquivo.name, { type: comprimido.type }));
    } catch {
      resultados.push(arquivo);
    }
  }
  return resultados;
}
