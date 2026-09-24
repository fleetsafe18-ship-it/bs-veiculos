import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../../lib/api.js';
import { assetUrl } from '../../lib/api.js';
import { comprimirFotos } from '../../lib/imageCompression.js';

const TIPOS = [
  { valor: 'carro', label: 'Carro' },
  { valor: 'moto', label: 'Moto' },
  { valor: 'caminhao', label: 'Caminhão' },
  { valor: 'outro', label: 'Outro' },
];

const VAZIO = {
  tipo: 'carro',
  marca: '',
  modelo: '',
  ano: '',
  km: '',
  combustivel: '',
  cambio: '',
  cor: '',
  preco: '',
  descricao: '',
  detalhes_extras: '',
  disponivel: true,
};

export default function VehicleForm() {
  const { id } = useParams();
  const editando = id !== undefined;
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [dados, setDados] = useState(VAZIO);
  const [veiculoId, setVeiculoId] = useState(editando ? id : null);
  const [fotos, setFotos] = useState([]);
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [statusFotos, setStatusFotos] = useState(null); // null | 'otimizando' | 'enviando'
  const [erro, setErro] = useState(null);
  const [arrastando, setArrastando] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api
      .adminBuscarVeiculo(id)
      .then((v) => {
        setDados({
          tipo: v.tipo,
          marca: v.marca,
          modelo: v.modelo,
          ano: v.ano,
          km: v.km,
          combustivel: v.combustivel,
          cambio: v.cambio,
          cor: v.cor,
          preco: v.preco,
          descricao: v.descricao,
          detalhes_extras: v.detalhes_extras,
          disponivel: v.disponivel,
        });
        setFotos(v.fotos || []);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  function campo(chave) {
    return {
      value: dados[chave],
      onChange: (e) => setDados((d) => ({ ...d, [chave]: e.target.value })),
    };
  }

  // Preço é digitado como texto puro (só dígitos, guardado como inteiro em reais).
  // Um <input type="number"> não serve aqui: ele só entende "." como separador
  // decimal, nunca como separador de milhar — "71.900" digitado nele vira 71.9.
  function digitosDoPreco(preco) {
    const n = Math.round(Number(preco) || 0);
    return n > 0 ? String(n) : '';
  }

  function formatarMilhar(digitos) {
    if (!digitos) return '';
    return Number(digitos).toLocaleString('pt-BR');
  }

  function onChangePreco(e) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 9);
    setDados((d) => ({ ...d, preco: digitos }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      if (veiculoId) {
        await api.adminAtualizarVeiculo(veiculoId, dados);
        navigate('/admin');
      } else {
        const criado = await api.adminCriarVeiculo(dados);
        setVeiculoId(criado.id);
        navigate(`/admin/veiculos/${criado.id}`, { replace: true });
      }
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function onEnviarFotos(e) {
    const arquivos = Array.from(e.target.files || []);
    if (arquivos.length === 0) return;
    setErro(null);

    setStatusFotos('otimizando');
    const paraEnviar = await comprimirFotos(arquivos);

    setStatusFotos('enviando');
    try {
      const novasFotos = await api.adminEnviarFotos(veiculoId, paraEnviar);
      setFotos((f) => [...f, ...novasFotos]);
    } catch (e) {
      setErro(e.message || 'Falha ao enviar fotos. Tente novamente.');
    } finally {
      setStatusFotos(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removerFoto(fotoId) {
    await api.adminRemoverFoto(veiculoId, fotoId);
    setFotos((f) => f.filter((foto) => foto.id !== fotoId));
  }

  function onDragStart(index) {
    setArrastando(index);
  }

  function onDragOver(e, index) {
    e.preventDefault();
    if (arrastando === null || arrastando === index) return;
    setFotos((f) => {
      const nova = [...f];
      const [item] = nova.splice(arrastando, 1);
      nova.splice(index, 0, item);
      return nova;
    });
    setArrastando(index);
  }

  async function onDragEnd() {
    setArrastando(null);
    await api.adminReordenarFotos(veiculoId, fotos.map((f) => f.id));
  }

  if (carregando) {
    return <div style={{ color: 'var(--text-faint)' }}>Carregando…</div>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '0 0 28px', letterSpacing: -0.5 }}>
        {editando ? 'Editar veículo' : 'Novo veículo'}
      </h1>

      {erro && <div style={{ color: '#E23D3D', marginBottom: 16 }}>{erro}</div>}

      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div>
          <label style={fieldLabel}>Tipo</label>
          <select {...campo('tipo')} style={inputStyle}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Disponível</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44 }}>
            <input
              type="checkbox"
              checked={dados.disponivel}
              onChange={(e) => setDados((d) => ({ ...d, disponivel: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: '#0F6CF1' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {dados.disponivel ? 'Sim, aparece na vitrine' : 'Não, marcado como vendido'}
            </span>
          </div>
        </div>

        <div>
          <label style={fieldLabel}>Marca *</label>
          <input {...campo('marca')} required style={inputStyle} placeholder="Honda" />
        </div>
        <div>
          <label style={fieldLabel}>Modelo *</label>
          <input {...campo('modelo')} required style={inputStyle} placeholder="Civic Touring" />
        </div>

        <div>
          <label style={fieldLabel}>Ano *</label>
          <input type="number" {...campo('ano')} required style={inputStyle} placeholder="2021" />
        </div>
        <div>
          <label style={fieldLabel}>Km</label>
          <input type="number" {...campo('km')} style={inputStyle} placeholder="38500" />
        </div>

        <div>
          <label style={fieldLabel}>Combustível</label>
          <input {...campo('combustivel')} style={inputStyle} placeholder="Flex" />
        </div>
        <div>
          <label style={fieldLabel}>Câmbio</label>
          <input {...campo('cambio')} style={inputStyle} placeholder="Automático" />
        </div>

        <div>
          <label style={fieldLabel}>Cor</label>
          <input {...campo('cor')} style={inputStyle} placeholder="Prata" />
        </div>
        <div>
          <label style={fieldLabel}>Preço (R$) *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatarMilhar(digitosDoPreco(dados.preco))}
            onChange={onChangePreco}
            required
            style={inputStyle}
            placeholder="98.900"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={fieldLabel}>Descrição</label>
          <textarea {...campo('descricao')} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={fieldLabel}>Detalhes extras</label>
          <textarea
            {...campo('detalhes_extras')}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Único dono, IPVA pago, revisões em dia…"
          />
        </div>
      </div>

      <div>
        <label style={fieldLabel}>Fotos</label>

        {!veiculoId ? (
          <div
            style={{
              border: '1px dashed var(--border-strong)',
              borderRadius: 6,
              padding: '18px 20px',
              fontSize: 13,
              color: 'var(--text-faint)',
            }}
          >
            Cadastre o veículo (botão abaixo) para liberar o upload de fotos.
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '0 0 12px' }}>
              A primeira foto é usada como capa no card da vitrine. Arraste para reordenar.
            </p>

            {erro && (
              <div
                style={{
                  background: 'rgba(226,61,61,0.1)',
                  border: '1px solid rgba(226,61,61,0.35)',
                  color: '#E23D3D',
                  borderRadius: 6,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                {erro}
              </div>
            )}

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px dashed var(--border-strong)',
                borderRadius: 6,
                padding: '12px 20px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              {statusFotos === 'otimizando' ? 'Otimizando fotos…' : statusFotos === 'enviando' ? 'Enviando…' : '+ Adicionar fotos'}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onEnviarFotos}
                disabled={!!statusFotos}
                style={{ display: 'none' }}
              />
            </label>

            {fotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {fotos.map((foto, i) => (
                  <div
                    key={foto.id}
                    draggable
                    onDragStart={() => onDragStart(i)}
                    onDragOver={(e) => onDragOver(e, i)}
                    onDragEnd={onDragEnd}
                    style={{
                      position: 'relative',
                      height: 90,
                      borderRadius: 5,
                      border: i === 0 ? '2px solid var(--accent)' : '1px solid var(--border-strong)',
                      backgroundImage: `url(${assetUrl(foto.url)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      cursor: 'grab',
                    }}
                  >
                    {i === 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#0F0F11',
                          background: 'var(--accent)',
                          padding: '2px 6px',
                          borderRadius: 999,
                        }}
                      >
                        CAPA
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removerFoto(foto.id)}
                      aria-label="Remover foto"
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(15,15,17,0.75)',
                        color: '#fff',
                        fontSize: 13,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="submit"
          disabled={salvando}
          className="cta-link shine"
          style={{
            background: 'linear-gradient(135deg,var(--accent),var(--accent-soft))',
            color: '#0F0F11',
            fontWeight: 700,
            fontSize: 14,
            padding: '13px 26px',
            borderRadius: 4,
            border: 'none',
            cursor: 'pointer',
            opacity: salvando ? 0.7 : 1,
          }}
        >
          {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar e continuar'}
        </button>
      </div>
      </form>
    </div>
  );
}

const fieldLabel = {
  display: 'block',
  fontSize: 12,
  color: 'var(--text-faint)',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  color: 'var(--text)',
  fontSize: 14,
  padding: '12px 14px',
  outline: 'none',
  boxSizing: 'border-box',
};
