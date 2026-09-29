/* ============================================================
   AAC Assistência Técnica Especializada — Sistema de Gestão
   Ordens de serviço, produtos, vendas, clientes e dashboard.
   ============================================================ */

'use strict';

/* ==================== Constantes ==================== */

const EMPRESA = {
  nome: 'AAC Assistência Técnica Especializada',
  endereco: 'Rua Tavares de Lyra, 3918 - Iná, São José dos Pinhais - PR, 83065-180',
  telefone: '(41) 98459-0345',
  instagram: '@aaceletronicos',
};

const STATUS = [
  { id: 'aguardando', nome: 'Aguardando análise', cor: '#6b7280' },
  { id: 'orcamento',  nome: 'Em orçamento',       cor: '#d97706' },
  { id: 'aprovado',   nome: 'Aprovado',           cor: '#2563eb' },
  { id: 'reparo',     nome: 'Em reparo',          cor: '#7c3aed' },
  { id: 'pronto',     nome: 'Pronto',             cor: '#0d9488' },
  { id: 'entregue',   nome: 'Entregue',           cor: '#16a34a' },
  { id: 'cancelado',  nome: 'Cancelado',          cor: '#dc2626' },
];

const TIPOS_EQUIPAMENTO = ['Celular', 'Notebook', 'Computador', 'Tablet', 'Videogame', 'Caixa de Som', 'Fone de Ouvido', 'Smartwatch', 'Outro'];

const CATEGORIAS = ['Celulares', 'Capas e Películas', 'Carregadores e Cabos', 'Fones de Ouvido', 'Caixas de Som', 'Informática', 'Periféricos', 'Smartwatch', 'Peças', 'Acessórios', 'Outros'];

const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Transferência', 'Outro'];

const estado = {
  rota: 'dashboard',
  filtroStatus: '',
  buscaOrdens: '',
  buscaProdutos: '',
  filtroCategoria: '',
  buscaClientes: '',
  carrinho: [],
};

/* ==================== Utilitários ==================== */

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const _fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
function fmtMoeda(n) { return _fmtBRL.format(Number(n) || 0); }

function parseMoeda(s) {
  if (typeof s === 'number') return s;
  s = String(s || '').replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtData(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'; }
function fmtDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function ehHoje(iso) {
  if (!iso) return false;
  const d = new Date(iso), h = new Date();
  return d.getDate() === h.getDate() && d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
}

function ehMesAtual(iso) {
  if (!iso) return false;
  const d = new Date(iso), h = new Date();
  return d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
}

function pad(n) { return String(n).padStart(4, '0'); }

function statusInfo(id) { return STATUS.find((s) => s.id === id) || STATUS[0]; }
function badgeStatus(id) {
  const s = statusInfo(id);
  return `<span class="badge" style="background:${s.cor}">${esc(s.nome)}</span>`;
}

function toast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function totalOrcamento(orc) {
  if (!orc) return 0;
  const pecas = (orc.pecas || []).reduce((t, p) => t + (Number(p.valor) || 0), 0);
  return pecas + (Number(orc.maoDeObra) || 0);
}

/* ==================== Imagens / Fotos ==================== */

function comprimirImagem(arquivo) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const MAX = 1280;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((b) => resolve(b || arquivo), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(arquivo); };
    img.src = url;
  });
}

function blobParaDataURL(blob) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

function dataURLParaBlob(d) {
  const [meta, dados] = d.split(',');
  const m = meta.match(/data:(.*?)(;|$)/);
  const mime = (m && m[1]) || 'image/jpeg';
  const bin = atob(dados);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function definirSrcBlob(img, blob) {
  const url = URL.createObjectURL(blob);
  img.onload = () => URL.revokeObjectURL(url);
  img.src = url;
}

function abrirLightbox(blob) {
  const lb = document.getElementById('lightbox');
  definirSrcBlob(document.getElementById('lightbox-img'), blob);
  lb.classList.remove('oculto');
}

/* ---------- Câmera ---------- */

let _streamCamera = null;
let _camFrontal = false;
let _aoCapturar = null;

async function abrirCamera(aoCapturar) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('Câmera não disponível neste navegador. Use "Enviar fotos".', 'aviso');
    return;
  }
  _aoCapturar = aoCapturar;
  document.getElementById('modal-camera').classList.remove('oculto');
  await iniciarStreamCamera();
}

async function iniciarStreamCamera() {
  pararStreamCamera();
  try {
    _streamCamera = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: _camFrontal ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    document.getElementById('video-camera').srcObject = _streamCamera;
  } catch (e) {
    fecharCamera();
    toast('Não foi possível acessar a câmera. Verifique a permissão ou use "Enviar fotos".', 'erro');
  }
}

function pararStreamCamera() {
  if (_streamCamera) {
    _streamCamera.getTracks().forEach((t) => t.stop());
    _streamCamera = null;
  }
}

function fecharCamera() {
  pararStreamCamera();
  document.getElementById('modal-camera').classList.add('oculto');
  _aoCapturar = null;
}

function capturarFotoCamera() {
  const video = document.getElementById('video-camera');
  if (!video.videoWidth) return;
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  const flash = document.getElementById('camera-flash');
  flash.classList.remove('oculto');
  setTimeout(() => flash.classList.add('oculto'), 130);
  c.toBlob(async (b) => {
    if (b && _aoCapturar) {
      const comprimida = await comprimirImagem(b);
      _aoCapturar(comprimida);
      toast('Foto capturada 📷');
    }
  }, 'image/jpeg', 0.9);
}

/* ---------- Gerenciador de fotos (formulários) ---------- */

function criarGerenciadorFotos(container, fotosIniciais) {
  const fotos = (fotosIniciais || []).map((f) => ({ blob: f.blob }));

  function render() {
    container.innerHTML = `
      <div class="fotos-grade">${fotos.map((f, i) => `
        <div class="foto-thumb">
          <img data-i="${i}" alt="Foto ${i + 1}">
          <button type="button" class="foto-rem" data-i="${i}" title="Remover">✕</button>
        </div>`).join('')}
      </div>
      <div class="fotos-acoes">
        <button type="button" class="btn btn-sec btn-pequeno" data-acao="camera">📷 Tirar foto</button>
        <label class="btn btn-sec btn-pequeno">🖼️ Enviar fotos
          <input type="file" accept="image/*" multiple>
        </label>
      </div>`;

    container.querySelectorAll('img[data-i]').forEach((img) => {
      const f = fotos[+img.dataset.i];
      definirSrcBlob(img, f.blob);
      img.onclick = () => abrirLightbox(f.blob);
    });
    container.querySelectorAll('.foto-rem').forEach((b) => {
      b.onclick = () => { fotos.splice(+b.dataset.i, 1); render(); };
    });
    container.querySelector('[data-acao="camera"]').onclick = () =>
      abrirCamera((blob) => { fotos.push({ blob }); render(); });
    container.querySelector('input[type="file"]').onchange = async (e) => {
      for (const arq of e.target.files) {
        fotos.push({ blob: await comprimirImagem(arq) });
      }
      render();
      e.target.value = '';
    };
  }

  render();
  return { obterFotos: () => fotos };
}

function renderFotosLeitura(container, fotos) {
  if (!fotos || !fotos.length) {
    container.innerHTML = '<p class="texto-suave">Nenhuma foto registrada.</p>';
    return;
  }
  container.innerHTML = `<div class="fotos-grade">${fotos.map((f, i) => `
    <div class="foto-thumb"><img data-i="${i}" alt="Foto ${i + 1}"></div>`).join('')}</div>`;
  container.querySelectorAll('img[data-i]').forEach((img) => {
    const f = fotos[+img.dataset.i];
    definirSrcBlob(img, f.blob);
    img.onclick = () => abrirLightbox(f.blob);
  });
}

/* ==================== Modal genérico ==================== */

function abrirModal(html) {
  const caixa = document.getElementById('modal-caixa');
  caixa.innerHTML = html;
  document.getElementById('modal').classList.remove('oculto');
  caixa.querySelectorAll('[data-fechar-modal]').forEach((b) => (b.onclick = fecharModal));
  return caixa;
}

function fecharModal() {
  document.getElementById('modal').classList.add('oculto');
  document.getElementById('modal-caixa').innerHTML = '';
}

function tituloModal(t) {
  return `<div class="modal-titulo"><h2>${esc(t)}</h2><button type="button" class="modal-fechar" data-fechar-modal>✕</button></div>`;
}

/* ==================== Impressão ==================== */

function imprimir(html) {
  document.getElementById('area-impressao').innerHTML = html;
  setTimeout(() => window.print(), 60);
}

function cabecalhoRecibo() {
  return `
    <div class="recibo-cabecalho">
      <h1>${esc(EMPRESA.nome)}</h1>
      <p>${esc(EMPRESA.endereco)}</p>
      <p>Telefone/WhatsApp: ${esc(EMPRESA.telefone)} · Instagram: ${esc(EMPRESA.instagram)}</p>
    </div>`;
}

/* ==================== Navegação ==================== */

const ROTAS = {
  dashboard: { titulo: 'Dashboard', render: renderDashboard },
  ordens:    { titulo: 'Ordens de Serviço', render: renderOrdens },
  vendas:    { titulo: 'Vendas', render: renderVendas },
  produtos:  { titulo: 'Produtos', render: renderProdutos },
  clientes:  { titulo: 'Clientes', render: renderClientes },
  backup:    { titulo: 'Backup dos Dados', render: renderBackup },
};

function navegar(rota) {
  estado.rota = rota;
  const r = ROTAS[rota];
  document.getElementById('titulo-pagina').textContent = r.titulo;
  document.querySelectorAll('.nav-item').forEach((b) =>
    b.classList.toggle('ativo', b.dataset.rota === rota));
  fecharMenuMobile();
  document.getElementById('topo-acoes').innerHTML = '';
  r.render();
}

function definirAcoesTopo(html, aoMontar) {
  const el = document.getElementById('topo-acoes');
  el.innerHTML = html;
  if (aoMontar) aoMontar(el);
}

function fecharMenuMobile() {
  document.getElementById('sidebar').classList.remove('aberta');
  document.getElementById('sidebar-fundo').classList.remove('visivel');
}

/* ==================== Dashboard ==================== */

async function renderDashboard() {
  const vista = document.getElementById('vista');
  const [ordens, produtos, vendas, clientes] = await Promise.all([
    dbListar('ordens'), dbListar('produtos'), dbListar('vendas'), dbListar('clientes'),
  ]);

  const porStatus = {};
  STATUS.forEach((s) => (porStatus[s.id] = 0));
  ordens.forEach((o) => { porStatus[o.status] = (porStatus[o.status] || 0) + 1; });

  const abertas = ordens.filter((o) => !['entregue', 'cancelado'].includes(o.status));
  const vendasHoje = vendas.filter((v) => ehHoje(v.criadoEm));
  const totalVendasHoje = vendasHoje.reduce((t, v) => t + v.total, 0);
  const vendasMes = vendas.filter((v) => ehMesAtual(v.criadoEm));
  const totalVendasMes = vendasMes.reduce((t, v) => t + v.total, 0);
  const osEntreguesMes = ordens.filter((o) => o.status === 'entregue' && ehMesAtual(o.entregueEm));
  const totalServicosMes = osEntreguesMes.reduce((t, o) => t + totalOrcamento(o.orcamento), 0);
  const osProntasHoje = ordens.filter((o) => o.status === 'entregue' && ehHoje(o.entregueEm));
  const estoqueBaixo = produtos.filter((p) => Number(p.estoque) <= Number(p.estoqueMin ?? 2));
  const mapaClientes = new Map(clientes.map((c) => [c.id, c]));

  const ultimas = [...ordens].sort((a, b) => b.id - a.id).slice(0, 6);

  vista.innerHTML = `
    <div class="grade-cards">
      <div class="card-resumo destaque">
        <span class="rotulo">💰 Faturamento do mês</span>
        <span class="valor">${fmtMoeda(totalVendasMes + totalServicosMes)}</span>
        <span class="detalhe">Vendas ${fmtMoeda(totalVendasMes)} · Serviços ${fmtMoeda(totalServicosMes)}</span>
      </div>
      <div class="card-resumo">
        <span class="rotulo">🛠️ OS em aberto</span>
        <span class="valor">${abertas.length}</span>
        <span class="detalhe">${porStatus.pronto || 0} pronta(s) para entrega</span>
      </div>
      <div class="card-resumo">
        <span class="rotulo">🛒 Vendas hoje</span>
        <span class="valor">${vendasHoje.length}</span>
        <span class="detalhe">${fmtMoeda(totalVendasHoje)} · ${osProntasHoje.length} OS entregue(s) hoje</span>
      </div>
      <div class="card-resumo">
        <span class="rotulo">📦 Estoque baixo</span>
        <span class="valor">${estoqueBaixo.length}</span>
        <span class="detalhe">produto(s) para repor</span>
      </div>
    </div>

    <div class="cartao">
      <h2>🛠️ Ordens de serviço por status</h2>
      <div class="chips-status">${STATUS.map((s) => `
        <button class="chip" data-status="${s.id}">
          <span class="ponto" style="background:${s.cor}"></span>${esc(s.nome)}
          <span class="qtd">${porStatus[s.id] || 0}</span>
        </button>`).join('')}
      </div>
    </div>

    <div class="os-grade">
      <div class="cartao">
        <h2>🕓 Últimas ordens de serviço</h2>
        ${ultimas.length ? `<div class="tabela-envolto"><table class="tabela"><tbody>
          ${ultimas.map((o) => {
            const c = mapaClientes.get(o.clienteId);
            return `<tr class="clicavel" data-os="${o.id}">
              <td class="num">#${esc(o.numero)}</td>
              <td>${esc(c ? c.nome : '—')}<br><span class="texto-suave">${esc(o.tipo)} ${esc(o.marca || '')} ${esc(o.modelo || '')}</span></td>
              <td class="texto-direita">${badgeStatus(o.status)}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>` : '<div class="vazio"><div class="icone">🛠️</div>Nenhuma ordem de serviço ainda.</div>'}
      </div>

      <div class="cartao">
        <h2>⚠️ Produtos com estoque baixo</h2>
        ${estoqueBaixo.length ? `<div class="tabela-envolto"><table class="tabela">
          <thead><tr><th>Produto</th><th>Estoque</th><th>Mínimo</th></tr></thead><tbody>
          ${estoqueBaixo.slice(0, 8).map((p) => `<tr class="clicavel" data-prod="${p.id}">
            <td>${esc(p.nome)}</td>
            <td><span class="tag-estoque ${Number(p.estoque) <= 0 ? 'zerado' : 'baixo'}">${p.estoque}</span></td>
            <td>${p.estoqueMin ?? 2}</td>
          </tr>`).join('')}
        </tbody></table></div>` : '<div class="vazio"><div class="icone">✅</div>Estoque em dia!</div>'}
      </div>
    </div>`;

  vista.querySelectorAll('.chip[data-status]').forEach((b) => {
    b.onclick = () => { estado.filtroStatus = b.dataset.status; navegar('ordens'); };
  });
  vista.querySelectorAll('tr[data-os]').forEach((tr) => {
    tr.onclick = () => renderOrdemDetalhe(+tr.dataset.os);
  });
  vista.querySelectorAll('tr[data-prod]').forEach((tr) => {
    tr.onclick = () => { navegar('produtos'); };
  });
}

/* ==================== Clientes ==================== */

function rotuloCliente(c) {
  return c.telefone ? `${c.nome} - ${c.telefone}` : c.nome;
}

function clientePorRotulo(clientes, valor) {
  const v = (valor || '').trim().toLowerCase();
  if (!v) return null;
  return clientes.find((c) => rotuloCliente(c).toLowerCase() === v)
      || clientes.find((c) => c.nome.toLowerCase() === v);
}

async function renderClientes() {
  const vista = document.getElementById('vista');
  const clientes = await dbListar('clientes');
  const busca = estado.buscaClientes.toLowerCase();
  const filtrados = clientes
    .filter((c) => !busca || [c.nome, c.telefone, c.cpf, c.email].some((v) => (v || '').toLowerCase().includes(busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  definirAcoesTopo(`<button class="btn btn-primario" id="btn-novo-cliente">➕ <span class="rotulo-btn">Novo cliente</span></button>`,
    (el) => { el.querySelector('#btn-novo-cliente').onclick = () => modalCliente(null, () => renderClientes()); });

  vista.innerHTML = `
    <div class="barra-busca">
      <input type="search" id="busca-clientes" placeholder="🔍 Buscar por nome, telefone, CPF ou e-mail..." value="${esc(estado.buscaClientes)}">
    </div>
    <div class="cartao">
      ${filtrados.length ? `<div class="tabela-envolto"><table class="tabela">
        <thead><tr><th>Nome</th><th>Telefone</th><th>CPF/CNPJ</th><th>E-mail</th><th></th></tr></thead>
        <tbody>${filtrados.map((c) => `
          <tr class="clicavel" data-id="${c.id}">
            <td><strong>${esc(c.nome)}</strong></td>
            <td>${esc(c.telefone || '—')}</td>
            <td>${esc(c.cpf || '—')}</td>
            <td>${esc(c.email || '—')}</td>
            <td class="texto-direita"><button class="btn btn-sec btn-pequeno" data-editar="${c.id}">✏️ Editar</button></td>
          </tr>`).join('')}
        </tbody></table></div>`
      : `<div class="vazio"><div class="icone">👥</div>${busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</div>`}
    </div>`;

  const inputBusca = vista.querySelector('#busca-clientes');
  inputBusca.oninput = () => { estado.buscaClientes = inputBusca.value; renderClientes(); };
  if (busca) { inputBusca.focus(); inputBusca.setSelectionRange(inputBusca.value.length, inputBusca.value.length); }

  vista.querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.onclick = (e) => {
      if (e.target.closest('[data-editar]')) return;
      modalClienteDetalhe(+tr.dataset.id);
    };
  });
  vista.querySelectorAll('[data-editar]').forEach((b) => {
    b.onclick = async () => {
      const c = await dbObter('clientes', +b.dataset.editar);
      modalCliente(c, () => renderClientes());
    };
  });
}

function modalCliente(cliente, aoSalvar) {
  const c = cliente || {};
  const caixa = abrirModal(`
    ${tituloModal(cliente ? 'Editar cliente' : 'Novo cliente')}
    <form id="form-cliente">
      <div class="form-grade">
        <div class="campo largo">
          <label>Nome completo <span class="obrig">*</span></label>
          <input name="nome" required value="${esc(c.nome)}" placeholder="Ex.: João da Silva">
        </div>
        <div class="campo">
          <label>Telefone / WhatsApp</label>
          <input name="telefone" value="${esc(c.telefone)}" placeholder="(41) 9 9999-9999" inputmode="tel">
        </div>
        <div class="campo">
          <label>CPF / CNPJ</label>
          <input name="cpf" value="${esc(c.cpf)}" placeholder="000.000.000-00" inputmode="numeric">
        </div>
        <div class="campo largo">
          <label>E-mail</label>
          <input name="email" type="email" value="${esc(c.email)}" placeholder="email@exemplo.com">
        </div>
        <div class="campo largo">
          <label>Endereço</label>
          <input name="endereco" value="${esc(c.endereco)}" placeholder="Rua, número, bairro, cidade">
        </div>
      </div>
      <div class="form-acoes">
        ${cliente ? '<button type="button" class="btn btn-perigo" id="btn-excluir-cliente">🗑️ Excluir</button>' : ''}
        <button type="button" class="btn btn-sec" data-fechar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">💾 Salvar</button>
      </div>
    </form>`);

  caixa.querySelector('#form-cliente').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const dados = {
      nome: f.get('nome').trim(),
      telefone: f.get('telefone').trim(),
      cpf: f.get('cpf').trim(),
      email: f.get('email').trim(),
      endereco: f.get('endereco').trim(),
    };
    let salvo;
    if (cliente) {
      salvo = { ...cliente, ...dados };
      await dbSalvar('clientes', salvo);
    } else {
      dados.criadoEm = new Date().toISOString();
      const id = await dbAdicionar('clientes', dados);
      salvo = { ...dados, id };
    }
    fecharModal();
    toast('Cliente salvo com sucesso!');
    if (aoSalvar) aoSalvar(salvo);
  };

  const btnExcluir = caixa.querySelector('#btn-excluir-cliente');
  if (btnExcluir) {
    btnExcluir.onclick = async () => {
      if (!confirm(`Excluir o cliente "${cliente.nome}"?\nAs ordens de serviço dele NÃO serão apagadas.`)) return;
      await dbExcluir('clientes', cliente.id);
      fecharModal();
      toast('Cliente excluído.');
      if (aoSalvar) aoSalvar(null);
    };
  }
}

async function modalClienteDetalhe(id) {
  const [c, ordens, vendas] = await Promise.all([
    dbObter('clientes', id), dbListar('ordens'), dbListar('vendas'),
  ]);
  if (!c) return;
  const minhasOrdens = ordens.filter((o) => o.clienteId === id).sort((a, b) => b.id - a.id);
  const minhasVendas = vendas.filter((v) => v.clienteId === id).sort((a, b) => b.id - a.id);

  const caixa = abrirModal(`
    ${tituloModal(c.nome)}
    <dl class="lista-definicao" style="margin-bottom:18px">
      <dt>Telefone</dt><dd>${esc(c.telefone || '—')}</dd>
      <dt>CPF/CNPJ</dt><dd>${esc(c.cpf || '—')}</dd>
      <dt>E-mail</dt><dd>${esc(c.email || '—')}</dd>
      <dt>Endereço</dt><dd>${esc(c.endereco || '—')}</dd>
      <dt>Cliente desde</dt><dd>${fmtData(c.criadoEm)}</dd>
    </dl>

    <h2 style="font-size:15px;margin-bottom:8px">🛠️ Histórico de serviços (${minhasOrdens.length})</h2>
    ${minhasOrdens.length ? `<div class="tabela-envolto"><table class="tabela"><tbody>
      ${minhasOrdens.map((o) => `<tr class="clicavel" data-os="${o.id}">
        <td class="num">#${esc(o.numero)}</td>
        <td>${esc(o.tipo)} ${esc(o.marca || '')} ${esc(o.modelo || '')}<br><span class="texto-suave">${fmtData(o.criadoEm)}</span></td>
        <td>${fmtMoeda(totalOrcamento(o.orcamento))}</td>
        <td class="texto-direita">${badgeStatus(o.status)}</td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="texto-suave">Nenhum serviço registrado.</p>'}

    <h2 style="font-size:15px;margin:16px 0 8px">🛒 Compras (${minhasVendas.length})</h2>
    ${minhasVendas.length ? `<div class="tabela-envolto"><table class="tabela"><tbody>
      ${minhasVendas.map((v) => `<tr>
        <td class="num">#${esc(v.numero)}</td>
        <td>${fmtData(v.criadoEm)} · ${v.itens.length} item(ns)</td>
        <td class="texto-direita"><strong>${fmtMoeda(v.total)}</strong></td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p class="texto-suave">Nenhuma compra registrada.</p>'}

    <div class="form-acoes">
      <button type="button" class="btn btn-sec" data-fechar-modal>Fechar</button>
      <button type="button" class="btn btn-primario" id="btn-editar-cli">✏️ Editar cliente</button>
    </div>`);

  caixa.querySelector('#btn-editar-cli').onclick = () => modalCliente(c, () => renderClientes());
  caixa.querySelectorAll('tr[data-os]').forEach((tr) => {
    tr.onclick = () => { fecharModal(); renderOrdemDetalhe(+tr.dataset.os); };
  });
}

/* ==================== Ordens de Serviço ==================== */

async function renderOrdens() {
  const vista = document.getElementById('vista');
  const [ordens, clientes] = await Promise.all([dbListar('ordens'), dbListar('clientes')]);
  const mapaClientes = new Map(clientes.map((c) => [c.id, c]));

  definirAcoesTopo(`<button class="btn btn-primario" id="btn-nova-os">➕ <span class="rotulo-btn">Nova OS</span></button>`,
    (el) => { el.querySelector('#btn-nova-os').onclick = () => renderFormOrdem(null); });

  const porStatus = {};
  STATUS.forEach((s) => (porStatus[s.id] = ordens.filter((o) => o.status === s.id).length));

  const busca = estado.buscaOrdens.toLowerCase();
  const filtradas = ordens
    .filter((o) => !estado.filtroStatus || o.status === estado.filtroStatus)
    .filter((o) => {
      if (!busca) return true;
      const c = mapaClientes.get(o.clienteId);
      return [o.numero, c && c.nome, o.tipo, o.marca, o.modelo, o.serie, o.defeito]
        .some((v) => (v || '').toLowerCase().includes(busca));
    })
    .sort((a, b) => b.id - a.id);

  vista.innerHTML = `
    <div class="chips-status">
      <button class="chip ${!estado.filtroStatus ? 'ativo' : ''}" data-status="">Todas <span class="qtd">${ordens.length}</span></button>
      ${STATUS.map((s) => `
        <button class="chip ${estado.filtroStatus === s.id ? 'ativo' : ''}" data-status="${s.id}">
          <span class="ponto" style="background:${s.cor}"></span>${esc(s.nome)} <span class="qtd">${porStatus[s.id]}</span>
        </button>`).join('')}
    </div>
    <div class="barra-busca">
      <input type="search" id="busca-os" placeholder="🔍 Buscar por nº da OS, cliente, equipamento, IMEI..." value="${esc(estado.buscaOrdens)}">
    </div>
    <div class="cartao">
      ${filtradas.length ? `<div class="tabela-envolto"><table class="tabela">
        <thead><tr><th>OS</th><th>Data</th><th>Cliente</th><th>Equipamento</th><th>Orçamento</th><th>Status</th></tr></thead>
        <tbody>${filtradas.map((o) => {
          const c = mapaClientes.get(o.clienteId);
          return `<tr class="clicavel" data-id="${o.id}">
            <td class="num">#${esc(o.numero)}</td>
            <td>${fmtData(o.criadoEm)}</td>
            <td>${esc(c ? c.nome : '—')}</td>
            <td>${esc(o.tipo)} ${esc(o.marca || '')} ${esc(o.modelo || '')}</td>
            <td>${totalOrcamento(o.orcamento) ? fmtMoeda(totalOrcamento(o.orcamento)) : '<span class="texto-suave">—</span>'}</td>
            <td>${badgeStatus(o.status)}</td>
          </tr>`;
        }).join('')}
      </tbody></table></div>`
      : `<div class="vazio"><div class="icone">🛠️</div>Nenhuma ordem de serviço ${estado.filtroStatus || busca ? 'encontrada com esses filtros' : 'cadastrada ainda'}.</div>`}
    </div>`;

  vista.querySelectorAll('.chip[data-status]').forEach((b) => {
    b.onclick = () => { estado.filtroStatus = b.dataset.status; renderOrdens(); };
  });
  const inputBusca = vista.querySelector('#busca-os');
  inputBusca.oninput = () => { estado.buscaOrdens = inputBusca.value; renderOrdens(); };
  if (busca) { inputBusca.focus(); inputBusca.setSelectionRange(inputBusca.value.length, inputBusca.value.length); }
  vista.querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.onclick = () => renderOrdemDetalhe(+tr.dataset.id);
  });
}

async function renderFormOrdem(ordemId) {
  const vista = document.getElementById('vista');
  const ordem = ordemId ? await dbObter('ordens', ordemId) : null;
  const clientes = await dbListar('clientes');
  const clienteAtual = ordem ? clientes.find((c) => c.id === ordem.clienteId) : null;

  document.getElementById('titulo-pagina').textContent = ordem ? `Editar OS #${ordem.numero}` : 'Nova Ordem de Serviço';
  definirAcoesTopo('');

  const o = ordem || {};
  vista.innerHTML = `
    <form id="form-os">
      <div class="cartao">
        <h2>👤 Cliente</h2>
        <div class="form-grade">
          <div class="campo largo">
            <label>Cliente <span class="obrig">*</span></label>
            <div style="display:flex;gap:8px">
              <input id="campo-cliente" list="dl-clientes" style="flex:1" required
                placeholder="Digite para buscar o cliente..."
                value="${esc(clienteAtual ? rotuloCliente(clienteAtual) : '')}">
              <button type="button" class="btn btn-sec" id="btn-novo-cliente-os">➕ Novo</button>
            </div>
            <datalist id="dl-clientes">
              ${clientes.map((c) => `<option value="${esc(rotuloCliente(c))}">`).join('')}
            </datalist>
          </div>
        </div>
      </div>

      <div class="cartao">
        <h2>📱 Equipamento</h2>
        <div class="form-grade">
          <div class="campo">
            <label>Tipo de equipamento <span class="obrig">*</span></label>
            <select name="tipo" required>
              ${TIPOS_EQUIPAMENTO.map((t) => `<option ${o.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="campo">
            <label>Marca</label>
            <input name="marca" value="${esc(o.marca)}" placeholder="Ex.: Samsung, Apple, Dell">
          </div>
          <div class="campo">
            <label>Modelo</label>
            <input name="modelo" value="${esc(o.modelo)}" placeholder="Ex.: Galaxy S23, iPhone 13">
          </div>
          <div class="campo">
            <label>Nº de série / IMEI</label>
            <input name="serie" value="${esc(o.serie)}" placeholder="IMEI ou número de série">
          </div>
          <div class="campo largo">
            <label>Defeito relatado pelo cliente <span class="obrig">*</span></label>
            <textarea name="defeito" required placeholder="Descreva o problema relatado...">${esc(o.defeito)}</textarea>
          </div>
          <div class="campo largo">
            <label>Estado do aparelho na entrada</label>
            <textarea name="estado" placeholder="Ex.: tela trincada no canto, riscos na traseira, liga normalmente...">${esc(o.estado)}</textarea>
          </div>
          <div class="campo largo">
            <label>Acessórios entregues</label>
            <input name="acessorios" value="${esc(o.acessorios)}" placeholder="Ex.: carregador, capa, chip, cartão de memória">
          </div>
          <div class="campo largo">
            <label>Observações internas</label>
            <textarea name="observacoes" placeholder="Anotações internas (não saem no recibo de entrada)">${esc(o.observacoes)}</textarea>
          </div>
        </div>
      </div>

      <div class="cartao">
        <h2>📷 Fotos do equipamento na entrada</h2>
        <p class="texto-suave" style="margin-bottom:12px">Registre avarias e a condição do aparelho. Isso protege a loja e o cliente.</p>
        <div id="fotos-os"></div>
      </div>

      <div class="form-acoes">
        <button type="button" class="btn btn-sec" id="btn-cancelar-os">Cancelar</button>
        <button type="submit" class="btn btn-primario">💾 ${ordem ? 'Salvar alterações' : 'Abrir Ordem de Serviço'}</button>
      </div>
    </form>`;

  const gerFotos = criarGerenciadorFotos(vista.querySelector('#fotos-os'), o.fotos);
  let listaClientes = clientes;

  vista.querySelector('#btn-novo-cliente-os').onclick = () => {
    modalCliente(null, async (novo) => {
      listaClientes = await dbListar('clientes');
      document.getElementById('dl-clientes').innerHTML =
        listaClientes.map((c) => `<option value="${esc(rotuloCliente(c))}">`).join('');
      if (novo) document.getElementById('campo-cliente').value = rotuloCliente(novo);
    });
  };

  vista.querySelector('#btn-cancelar-os').onclick = () =>
    ordem ? renderOrdemDetalhe(ordem.id) : navegar('ordens');

  vista.querySelector('#form-os').onsubmit = async (e) => {
    e.preventDefault();
    const cliente = clientePorRotulo(listaClientes, document.getElementById('campo-cliente').value);
    if (!cliente) {
      toast('Selecione um cliente da lista ou cadastre um novo.', 'erro');
      return;
    }
    const f = new FormData(e.target);
    const dados = {
      clienteId: cliente.id,
      tipo: f.get('tipo'),
      marca: f.get('marca').trim(),
      modelo: f.get('modelo').trim(),
      serie: f.get('serie').trim(),
      defeito: f.get('defeito').trim(),
      estado: f.get('estado').trim(),
      acessorios: f.get('acessorios').trim(),
      observacoes: f.get('observacoes').trim(),
      fotos: gerFotos.obterFotos(),
    };

    if (ordem) {
      const atualizada = { ...ordem, ...dados };
      await dbSalvar('ordens', atualizada);
      toast('OS atualizada!');
      renderOrdemDetalhe(ordem.id);
    } else {
      const agora = new Date().toISOString();
      const nova = {
        ...dados,
        status: 'aguardando',
        orcamento: { pecas: [], maoDeObra: 0 },
        historico: [{ data: agora, status: 'aguardando', obs: 'Ordem de serviço aberta' }],
        criadoEm: agora,
      };
      const id = await dbAdicionar('ordens', nova);
      nova.id = id;
      nova.numero = pad(id);
      await dbSalvar('ordens', nova);
      toast(`OS #${nova.numero} aberta com sucesso!`);
      renderOrdemDetalhe(id);
    }
  };
}

async function renderOrdemDetalhe(id) {
  const vista = document.getElementById('vista');
  const ordem = await dbObter('ordens', id);
  if (!ordem) { navegar('ordens'); return; }
  const cliente = await dbObter('clientes', ordem.clienteId);

  document.getElementById('titulo-pagina').textContent = `OS #${ordem.numero}`;
  definirAcoesTopo(`<button class="btn btn-sec" id="btn-voltar-os">← <span class="rotulo-btn">Voltar</span></button>`,
    (el) => { el.querySelector('#btn-voltar-os').onclick = () => navegar('ordens'); });

  const total = totalOrcamento(ordem.orcamento);
  const pecas = (ordem.orcamento && ordem.orcamento.pecas) || [];

  vista.innerHTML = `
    <div class="os-cabecalho">
      <h2>OS #${esc(ordem.numero)}</h2>
      ${badgeStatus(ordem.status)}
      <span class="texto-suave">aberta em ${fmtDataHora(ordem.criadoEm)}</span>
    </div>

    <div class="cartao">
      <h2>🔄 Atualizar status</h2>
      <div class="form-grade">
        <div class="campo">
          <label>Novo status</label>
          <select id="sel-status">
            ${STATUS.map((s) => `<option value="${s.id}" ${ordem.status === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Observação (opcional)</label>
          <input id="obs-status" placeholder="Ex.: cliente aprovou pelo WhatsApp">
        </div>
        <div class="campo" style="justify-content:flex-end">
          <label>&nbsp;</label>
          <button class="btn btn-primario" id="btn-atualizar-status">Atualizar status</button>
        </div>
      </div>
    </div>

    <div class="os-grade">
      <div>
        <div class="cartao">
          <h2>👤 Cliente</h2>
          <dl class="lista-definicao">
            <dt>Nome</dt><dd>${esc(cliente ? cliente.nome : 'Cliente removido')}</dd>
            <dt>Telefone</dt><dd>${esc(cliente && cliente.telefone || '—')}</dd>
            <dt>CPF/CNPJ</dt><dd>${esc(cliente && cliente.cpf || '—')}</dd>
          </dl>
        </div>

        <div class="cartao">
          <h2>📱 Equipamento</h2>
          <dl class="lista-definicao">
            <dt>Tipo</dt><dd>${esc(ordem.tipo)}</dd>
            <dt>Marca / Modelo</dt><dd>${esc([ordem.marca, ordem.modelo].filter(Boolean).join(' ') || '—')}</dd>
            <dt>Série / IMEI</dt><dd>${esc(ordem.serie || '—')}</dd>
            <dt>Defeito relatado</dt><dd>${esc(ordem.defeito || '—')}</dd>
            <dt>Estado na entrada</dt><dd>${esc(ordem.estado || '—')}</dd>
            <dt>Acessórios</dt><dd>${esc(ordem.acessorios || '—')}</dd>
            ${ordem.observacoes ? `<dt>Observações</dt><dd>${esc(ordem.observacoes)}</dd>` : ''}
          </dl>
        </div>

        <div class="cartao">
          <h2>📷 Fotos da entrada</h2>
          <div id="fotos-leitura"></div>
        </div>
      </div>

      <div>
        <div class="cartao">
          <h2>💰 Orçamento</h2>
          ${pecas.length || (ordem.orcamento && ordem.orcamento.maoDeObra) ? `
            <div class="resumo-orcamento">
              ${pecas.map((p) => `<div class="linha"><span>${esc(p.descricao)}</span><span>${fmtMoeda(p.valor)}</span></div>`).join('')}
              <div class="linha"><span>Mão de obra</span><span>${fmtMoeda(ordem.orcamento.maoDeObra)}</span></div>
              <div class="linha total"><span>Total</span><span>${fmtMoeda(total)}</span></div>
            </div>`
          : '<p class="texto-suave">Nenhum orçamento lançado ainda.</p>'}
          <div class="form-acoes" style="margin-top:14px">
            <button class="btn btn-primario btn-pequeno" id="btn-orcamento">✏️ ${pecas.length || total ? 'Editar' : 'Lançar'} orçamento</button>
          </div>
        </div>

        <div class="cartao">
          <h2>🕓 Histórico</h2>
          <ul class="timeline">
            ${[...(ordem.historico || [])].reverse().map((h) => `
              <li>
                <strong>${esc(statusInfo(h.status).nome)}</strong>
                ${h.obs ? ` — ${esc(h.obs)}` : ''}
                <span class="quando">${fmtDataHora(h.data)}</span>
              </li>`).join('')}
          </ul>
        </div>

        <div class="cartao">
          <h2>🖨️ Documentos e ações</h2>
          <div class="form-acoes" style="justify-content:flex-start;margin-top:0">
            <button class="btn btn-sec btn-pequeno" id="btn-recibo-entrada">📄 Recibo de entrada</button>
            <button class="btn btn-sec btn-pequeno" id="btn-recibo-saida">📄 Recibo de saída</button>
            <button class="btn btn-sec btn-pequeno" id="btn-editar-os">✏️ Editar OS</button>
            <button class="btn btn-perigo btn-pequeno" id="btn-excluir-os">🗑️ Excluir OS</button>
          </div>
        </div>
      </div>
    </div>`;

  renderFotosLeitura(vista.querySelector('#fotos-leitura'), ordem.fotos);

  vista.querySelector('#btn-atualizar-status').onclick = async () => {
    const novo = vista.querySelector('#sel-status').value;
    const obs = vista.querySelector('#obs-status').value.trim();
    if (novo === ordem.status && !obs) { toast('A OS já está nesse status.', 'aviso'); return; }
    ordem.status = novo;
    ordem.historico = ordem.historico || [];
    ordem.historico.push({ data: new Date().toISOString(), status: novo, obs });
    if (novo === 'entregue' && !ordem.entregueEm) ordem.entregueEm = new Date().toISOString();
    await dbSalvar('ordens', ordem);
    toast('Status atualizado!');
    renderOrdemDetalhe(id);
  };

  vista.querySelector('#btn-orcamento').onclick = () => modalOrcamento(ordem);
  vista.querySelector('#btn-editar-os').onclick = () => renderFormOrdem(id);
  vista.querySelector('#btn-recibo-entrada').onclick = () => imprimirReciboEntrada(ordem, cliente);
  vista.querySelector('#btn-recibo-saida').onclick = () => imprimirReciboSaida(ordem, cliente);
  vista.querySelector('#btn-excluir-os').onclick = async () => {
    if (!confirm(`Excluir definitivamente a OS #${ordem.numero}?`)) return;
    await dbExcluir('ordens', id);
    toast('OS excluída.');
    navegar('ordens');
  };
}

function modalOrcamento(ordem) {
  const orc = ordem.orcamento || { pecas: [], maoDeObra: 0 };
  let pecas = (orc.pecas || []).map((p) => ({ ...p }));
  if (!pecas.length) pecas.push({ descricao: '', valor: '' });

  const caixa = abrirModal(`
    ${tituloModal(`Orçamento — OS #${ordem.numero}`)}
    <div id="lista-pecas"></div>
    <button type="button" class="btn btn-sec btn-pequeno" id="btn-add-peca" style="margin-bottom:16px">➕ Adicionar peça</button>
    <div class="form-grade">
      <div class="campo">
        <label>Mão de obra (R$)</label>
        <input id="campo-mo" inputmode="decimal" value="${orc.maoDeObra || ''}" placeholder="0,00">
      </div>
      <div class="campo">
        <label>Total</label>
        <input id="campo-total" disabled style="font-weight:800">
      </div>
    </div>
    <div class="form-acoes">
      <button type="button" class="btn btn-sec" data-fechar-modal>Cancelar</button>
      <button type="button" class="btn btn-primario" id="btn-salvar-orc">💾 Salvar orçamento</button>
    </div>`);

  const elLista = caixa.querySelector('#lista-pecas');

  function calcular() {
    const totPecas = pecas.reduce((t, p) => t + parseMoeda(p.valor), 0);
    const mo = parseMoeda(caixa.querySelector('#campo-mo').value);
    caixa.querySelector('#campo-total').value = fmtMoeda(totPecas + mo);
  }

  function renderPecas() {
    elLista.innerHTML = pecas.map((p, i) => `
      <div class="linha-peca">
        <input data-i="${i}" data-campo="descricao" placeholder="Peça / serviço (ex.: Tela frontal original)" value="${esc(p.descricao)}">
        <input data-i="${i}" data-campo="valor" class="valor-peca" inputmode="decimal" placeholder="Valor (R$)" value="${esc(p.valor)}">
        <button type="button" class="btn btn-perigo btn-pequeno" data-rem="${i}">✕</button>
      </div>`).join('');
    elLista.querySelectorAll('input').forEach((inp) => {
      inp.oninput = () => { pecas[+inp.dataset.i][inp.dataset.campo] = inp.value; calcular(); };
    });
    elLista.querySelectorAll('[data-rem]').forEach((b) => {
      b.onclick = () => { pecas.splice(+b.dataset.rem, 1); renderPecas(); calcular(); };
    });
    calcular();
  }

  renderPecas();
  caixa.querySelector('#btn-add-peca').onclick = () => { pecas.push({ descricao: '', valor: '' }); renderPecas(); };
  caixa.querySelector('#campo-mo').oninput = calcular;

  caixa.querySelector('#btn-salvar-orc').onclick = async () => {
    ordem.orcamento = {
      pecas: pecas
        .filter((p) => p.descricao.trim() || parseMoeda(p.valor))
        .map((p) => ({ descricao: p.descricao.trim() || 'Peça', valor: parseMoeda(p.valor) })),
      maoDeObra: parseMoeda(caixa.querySelector('#campo-mo').value),
    };
    if (ordem.status === 'aguardando') {
      ordem.status = 'orcamento';
      ordem.historico = ordem.historico || [];
      ordem.historico.push({ data: new Date().toISOString(), status: 'orcamento', obs: 'Orçamento lançado' });
    }
    await dbSalvar('ordens', ordem);
    fecharModal();
    toast('Orçamento salvo!');
    renderOrdemDetalhe(ordem.id);
  };
}

/* ---------- Recibos de OS ---------- */

function imprimirReciboEntrada(ordem, cliente) {
  imprimir(`
    <div class="recibo">
      ${cabecalhoRecibo()}
      <h2>COMPROVANTE DE ENTRADA — ORDEM DE SERVIÇO Nº ${esc(ordem.numero)}</h2>
      <p>Data de entrada: ${fmtDataHora(ordem.criadoEm)}</p>

      <h2>Cliente</h2>
      <table>
        <tr><td><strong>Nome:</strong> ${esc(cliente ? cliente.nome : '—')}</td><td><strong>Telefone:</strong> ${esc(cliente && cliente.telefone || '—')}</td></tr>
        <tr><td><strong>CPF/CNPJ:</strong> ${esc(cliente && cliente.cpf || '—')}</td><td><strong>E-mail:</strong> ${esc(cliente && cliente.email || '—')}</td></tr>
      </table>

      <h2>Equipamento</h2>
      <table>
        <tr><td><strong>Tipo:</strong> ${esc(ordem.tipo)}</td><td><strong>Marca/Modelo:</strong> ${esc([ordem.marca, ordem.modelo].filter(Boolean).join(' ') || '—')}</td></tr>
        <tr><td colspan="2"><strong>Nº de série / IMEI:</strong> ${esc(ordem.serie || '—')}</td></tr>
        <tr><td colspan="2"><strong>Defeito relatado:</strong> ${esc(ordem.defeito || '—')}</td></tr>
        <tr><td colspan="2"><strong>Estado do aparelho na entrada:</strong> ${esc(ordem.estado || '—')}</td></tr>
        <tr><td colspan="2"><strong>Acessórios entregues:</strong> ${esc(ordem.acessorios || 'Nenhum')}</td></tr>
        <tr><td colspan="2"><strong>Fotos registradas na entrada:</strong> ${(ordem.fotos || []).length}</td></tr>
      </table>

      <div class="termos">
        <strong>Condições gerais:</strong><br>
        1. O prazo para análise e orçamento é de até 5 (cinco) dias úteis.<br>
        2. O orçamento será informado por telefone/WhatsApp e o reparo será executado somente após aprovação do cliente.<br>
        3. Equipamentos não retirados no prazo de 90 (noventa) dias após a comunicação da conclusão do serviço poderão ser vendidos para custear as despesas, conforme art. 644 do Código Civil.<br>
        4. A loja não se responsabiliza por dados armazenados no aparelho. Recomendamos a realização de backup prévio.<br>
        5. A garantia dos serviços executados é de 90 (noventa) dias, conforme o Código de Defesa do Consumidor, e cobre exclusivamente o serviço/peça descritos na OS.
      </div>

      <div class="assinaturas">
        <div>Assinatura do cliente</div>
        <div>Responsável — ${esc(EMPRESA.nome)}</div>
      </div>
    </div>`);
}

function imprimirReciboSaida(ordem, cliente) {
  const orc = ordem.orcamento || { pecas: [], maoDeObra: 0 };
  const total = totalOrcamento(orc);
  imprimir(`
    <div class="recibo">
      ${cabecalhoRecibo()}
      <h2>COMPROVANTE DE SAÍDA / ENTREGA — ORDEM DE SERVIÇO Nº ${esc(ordem.numero)}</h2>
      <p>Entrada: ${fmtDataHora(ordem.criadoEm)} &nbsp;·&nbsp; Saída: ${fmtDataHora(ordem.entregueEm || new Date().toISOString())}</p>

      <h2>Cliente</h2>
      <table>
        <tr><td><strong>Nome:</strong> ${esc(cliente ? cliente.nome : '—')}</td><td><strong>Telefone:</strong> ${esc(cliente && cliente.telefone || '—')}</td></tr>
      </table>

      <h2>Equipamento</h2>
      <table>
        <tr><td><strong>Tipo:</strong> ${esc(ordem.tipo)}</td><td><strong>Marca/Modelo:</strong> ${esc([ordem.marca, ordem.modelo].filter(Boolean).join(' ') || '—')}</td></tr>
        <tr><td colspan="2"><strong>Nº de série / IMEI:</strong> ${esc(ordem.serie || '—')}</td></tr>
      </table>

      <h2>Serviços executados</h2>
      <table>
        <tr><th>Descrição</th><th style="width:120px">Valor</th></tr>
        ${(orc.pecas || []).map((p) => `<tr><td>${esc(p.descricao)}</td><td>${fmtMoeda(p.valor)}</td></tr>`).join('')}
        <tr><td>Mão de obra</td><td>${fmtMoeda(orc.maoDeObra)}</td></tr>
      </table>
      <p class="total-grande">TOTAL: ${fmtMoeda(total)}</p>

      <div class="termos">
        <strong>Garantia:</strong> os serviços executados possuem garantia de 90 (noventa) dias a contar da data de entrega,
        conforme o Código de Defesa do Consumidor. A garantia cobre exclusivamente o serviço/peça descritos nesta OS e não
        cobre danos causados por mau uso, quedas, contato com líquidos ou intervenção de terceiros.
      </div>

      <div class="assinaturas">
        <div>Assinatura do cliente</div>
        <div>Responsável — ${esc(EMPRESA.nome)}</div>
      </div>
    </div>`);
}

/* ==================== Produtos ==================== */

async function renderProdutos() {
  const vista = document.getElementById('vista');
  const produtos = await dbListar('produtos');

  definirAcoesTopo(`<button class="btn btn-primario" id="btn-novo-prod">➕ <span class="rotulo-btn">Novo produto</span></button>`,
    (el) => { el.querySelector('#btn-novo-prod').onclick = () => modalProduto(null); });

  const busca = estado.buscaProdutos.toLowerCase();
  const filtrados = produtos
    .filter((p) => !estado.filtroCategoria || p.categoria === estado.filtroCategoria)
    .filter((p) => !busca || [p.nome, p.marca, p.modelo, p.sku, p.codigoBarras, p.categoria, p.descricao]
      .some((v) => (v || '').toLowerCase().includes(busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const categoriasUsadas = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort();

  vista.innerHTML = `
    <div class="barra-busca">
      <input type="search" id="busca-prod" placeholder="🔍 Buscar por nome, marca, SKU, código de barras..." value="${esc(estado.buscaProdutos)}">
      <select id="filtro-cat">
        <option value="">Todas as categorias</option>
        ${categoriasUsadas.map((c) => `<option ${estado.filtroCategoria === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
    </div>
    ${filtrados.length ? `<div class="grade-produtos">${filtrados.map((p) => {
      const est = Number(p.estoque) || 0;
      const min = Number(p.estoqueMin ?? 2);
      const tag = est <= 0 ? 'zerado' : est <= min ? 'baixo' : '';
      return `
      <div class="card-produto" data-id="${p.id}">
        <div class="foto" data-foto="${p.id}">📦</div>
        <div class="corpo">
          <span class="nome">${esc(p.nome)}</span>
          <span class="cat">${esc(p.categoria || 'Sem categoria')}${p.sku ? ' · ' + esc(p.sku) : ''}</span>
          <div class="rodape">
            <span class="preco">${fmtMoeda(p.precoVenda)}</span>
            <span class="tag-estoque ${tag}">${est <= 0 ? 'Esgotado' : est + ' un.'}</span>
          </div>
        </div>
      </div>`;
    }).join('')}</div>`
    : `<div class="cartao"><div class="vazio"><div class="icone">📦</div>${busca || estado.filtroCategoria ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda. Clique em "Novo produto" para começar.'}</div></div>`}`;

  // Miniaturas (primeira foto de cada produto)
  filtrados.forEach((p) => {
    if (p.fotos && p.fotos.length) {
      const cont = vista.querySelector(`[data-foto="${p.id}"]`);
      if (cont) {
        cont.innerHTML = '<img alt="">';
        definirSrcBlob(cont.querySelector('img'), p.fotos[0].blob);
      }
    }
  });

  const inputBusca = vista.querySelector('#busca-prod');
  inputBusca.oninput = () => { estado.buscaProdutos = inputBusca.value; renderProdutos(); };
  if (busca) { inputBusca.focus(); inputBusca.setSelectionRange(inputBusca.value.length, inputBusca.value.length); }
  vista.querySelector('#filtro-cat').onchange = (e) => { estado.filtroCategoria = e.target.value; renderProdutos(); };
  vista.querySelectorAll('.card-produto').forEach((card) => {
    card.onclick = () => modalProdutoDetalhe(+card.dataset.id);
  });
}

function modalProduto(produto) {
  const p = produto || {};
  const caixa = abrirModal(`
    ${tituloModal(produto ? 'Editar produto' : 'Novo produto')}
    <form id="form-produto">
      <div class="form-grade">
        <div class="campo largo">
          <label>Nome do produto <span class="obrig">*</span></label>
          <input name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Fone Bluetooth JBL Tune 510BT">
        </div>
        <div class="campo">
          <label>Categoria</label>
          <select name="categoria">
            ${CATEGORIAS.map((c) => `<option ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Marca</label>
          <input name="marca" value="${esc(p.marca)}" placeholder="Ex.: JBL">
        </div>
        <div class="campo">
          <label>Modelo</label>
          <input name="modelo" value="${esc(p.modelo)}" placeholder="Ex.: Tune 510BT">
        </div>
        <div class="campo">
          <label>Código / SKU</label>
          <input name="sku" value="${esc(p.sku)}" placeholder="Gerado automaticamente se vazio">
        </div>
        <div class="campo">
          <label>Código de barras</label>
          <input name="codigoBarras" value="${esc(p.codigoBarras)}" inputmode="numeric" placeholder="EAN / código de barras">
        </div>
        <div class="campo">
          <label>Preço de custo (R$)</label>
          <input name="precoCusto" inputmode="decimal" value="${p.precoCusto ?? ''}" placeholder="0,00">
        </div>
        <div class="campo">
          <label>Preço de venda (R$) <span class="obrig">*</span></label>
          <input name="precoVenda" required inputmode="decimal" value="${p.precoVenda ?? ''}" placeholder="0,00">
        </div>
        <div class="campo">
          <label>Quantidade em estoque</label>
          <input name="estoque" type="number" min="0" value="${p.estoque ?? 0}">
        </div>
        <div class="campo">
          <label>Estoque mínimo (alerta)</label>
          <input name="estoqueMin" type="number" min="0" value="${p.estoqueMin ?? 2}">
        </div>
        <div class="campo largo">
          <label>Descrição detalhada</label>
          <textarea name="descricao" placeholder="Características, garantia, cor, compatibilidade...">${esc(p.descricao)}</textarea>
        </div>
        <div class="campo largo">
          <label>Fotos do produto</label>
          <div id="fotos-produto"></div>
        </div>
      </div>
      <div class="form-acoes">
        ${produto ? '<button type="button" class="btn btn-perigo" id="btn-excluir-prod">🗑️ Excluir</button>' : ''}
        <button type="button" class="btn btn-sec" data-fechar-modal>Cancelar</button>
        <button type="submit" class="btn btn-primario">💾 Salvar produto</button>
      </div>
    </form>`);

  const gerFotos = criarGerenciadorFotos(caixa.querySelector('#fotos-produto'), p.fotos);

  caixa.querySelector('#form-produto').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const dados = {
      nome: f.get('nome').trim(),
      categoria: f.get('categoria'),
      marca: f.get('marca').trim(),
      modelo: f.get('modelo').trim(),
      sku: f.get('sku').trim(),
      codigoBarras: f.get('codigoBarras').trim(),
      precoCusto: parseMoeda(f.get('precoCusto')),
      precoVenda: parseMoeda(f.get('precoVenda')),
      estoque: Math.max(0, parseInt(f.get('estoque'), 10) || 0),
      estoqueMin: Math.max(0, parseInt(f.get('estoqueMin'), 10) || 0),
      descricao: f.get('descricao').trim(),
      fotos: gerFotos.obterFotos(),
    };

    if (produto) {
      await dbSalvar('produtos', { ...produto, ...dados });
    } else {
      dados.criadoEm = new Date().toISOString();
      const id = await dbAdicionar('produtos', dados);
      if (!dados.sku) {
        dados.id = id;
        dados.sku = 'P' + pad(id);
        await dbSalvar('produtos', dados);
      }
    }
    fecharModal();
    toast('Produto salvo com sucesso!');
    if (estado.rota === 'produtos') renderProdutos();
  };

  const btnExcluir = caixa.querySelector('#btn-excluir-prod');
  if (btnExcluir) {
    btnExcluir.onclick = async () => {
      if (!confirm(`Excluir o produto "${produto.nome}"?`)) return;
      await dbExcluir('produtos', produto.id);
      fecharModal();
      toast('Produto excluído.');
      renderProdutos();
    };
  }
}

async function modalProdutoDetalhe(id) {
  const p = await dbObter('produtos', id);
  if (!p) return;
  const est = Number(p.estoque) || 0;
  const min = Number(p.estoqueMin ?? 2);

  const caixa = abrirModal(`
    ${tituloModal(p.nome)}
    <div id="fotos-prod-leitura" style="margin-bottom:16px"></div>
    <dl class="lista-definicao">
      <dt>Categoria</dt><dd>${esc(p.categoria || '—')}</dd>
      <dt>Marca / Modelo</dt><dd>${esc([p.marca, p.modelo].filter(Boolean).join(' ') || '—')}</dd>
      <dt>SKU</dt><dd>${esc(p.sku || '—')}</dd>
      <dt>Cód. de barras</dt><dd>${esc(p.codigoBarras || '—')}</dd>
      <dt>Preço de custo</dt><dd>${fmtMoeda(p.precoCusto)}</dd>
      <dt>Preço de venda</dt><dd><strong style="color:var(--verde)">${fmtMoeda(p.precoVenda)}</strong></dd>
      <dt>Estoque</dt><dd><span class="tag-estoque ${est <= 0 ? 'zerado' : est <= min ? 'baixo' : ''}">${est} unidade(s)</span></dd>
      ${p.descricao ? `<dt>Descrição</dt><dd>${esc(p.descricao)}</dd>` : ''}
    </dl>
    <div class="form-acoes">
      <button type="button" class="btn btn-sec" data-fechar-modal>Fechar</button>
      <button type="button" class="btn btn-primario" id="btn-editar-prod">✏️ Editar produto</button>
    </div>`);

  renderFotosLeitura(caixa.querySelector('#fotos-prod-leitura'), p.fotos);
  caixa.querySelector('#btn-editar-prod').onclick = () => modalProduto(p);
}

/* ==================== Vendas (PDV) ==================== */

async function renderVendas() {
  const vista = document.getElementById('vista');
  const [vendas, clientes] = await Promise.all([dbListar('vendas'), dbListar('clientes')]);
  const mapaClientes = new Map(clientes.map((c) => [c.id, c]));
  const ordenadas = [...vendas].sort((a, b) => b.id - a.id);

  definirAcoesTopo(`<button class="btn btn-verde" id="btn-nova-venda">🛒 <span class="rotulo-btn">Nova venda</span></button>`,
    (el) => { el.querySelector('#btn-nova-venda').onclick = () => renderPDV(); });

  const hoje = vendas.filter((v) => ehHoje(v.criadoEm));
  const mes = vendas.filter((v) => ehMesAtual(v.criadoEm));

  vista.innerHTML = `
    <div class="grade-cards">
      <div class="card-resumo">
        <span class="rotulo">Vendas hoje</span>
        <span class="valor">${fmtMoeda(hoje.reduce((t, v) => t + v.total, 0))}</span>
        <span class="detalhe">${hoje.length} venda(s)</span>
      </div>
      <div class="card-resumo">
        <span class="rotulo">Vendas no mês</span>
        <span class="valor">${fmtMoeda(mes.reduce((t, v) => t + v.total, 0))}</span>
        <span class="detalhe">${mes.length} venda(s)</span>
      </div>
    </div>

    <div class="cartao">
      <h2>🧾 Histórico de vendas</h2>
      ${ordenadas.length ? `<div class="tabela-envolto"><table class="tabela">
        <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th class="texto-direita">Total</th></tr></thead>
        <tbody>${ordenadas.map((v) => {
          const c = mapaClientes.get(v.clienteId);
          return `<tr class="clicavel" data-id="${v.id}">
            <td class="num">#${esc(v.numero)}</td>
            <td>${fmtDataHora(v.criadoEm)}</td>
            <td>${esc(c ? c.nome : (v.clienteNome || 'Consumidor'))}</td>
            <td>${v.itens.reduce((t, i) => t + i.qtd, 0)}</td>
            <td>${esc(v.formaPagamento)}</td>
            <td class="texto-direita"><strong>${fmtMoeda(v.total)}</strong></td>
          </tr>`;
        }).join('')}
      </tbody></table></div>`
      : '<div class="vazio"><div class="icone">🛒</div>Nenhuma venda registrada ainda. Clique em "Nova venda" para começar.</div>'}
    </div>`;

  vista.querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.onclick = () => modalVendaDetalhe(+tr.dataset.id);
  });
}

async function renderPDV() {
  const vista = document.getElementById('vista');
  const [produtos, clientes] = await Promise.all([dbListar('produtos'), dbListar('clientes')]);

  document.getElementById('titulo-pagina').textContent = 'Nova Venda';
  definirAcoesTopo(`<button class="btn btn-sec" id="btn-voltar-vendas">← <span class="rotulo-btn">Voltar</span></button>`,
    (el) => { el.querySelector('#btn-voltar-vendas').onclick = () => navegar('vendas'); });

  vista.innerHTML = `
    <div class="pdv">
      <div class="cartao">
        <h2>📦 Produtos</h2>
        <div class="barra-busca" style="margin-bottom:12px">
          <input type="search" id="pdv-busca" placeholder="🔍 Nome, SKU ou código de barras (Enter adiciona)" autofocus>
        </div>
        <div class="pdv-resultados" id="pdv-resultados"></div>
      </div>

      <div class="cartao">
        <h2>🧾 Carrinho</h2>
        <div id="pdv-carrinho"></div>
        <div class="form-grade" style="margin-top:14px">
          <div class="campo largo">
            <label>Cliente (opcional)</label>
            <input id="pdv-cliente" list="dl-clientes-pdv" placeholder="Consumidor final">
            <datalist id="dl-clientes-pdv">
              ${clientes.map((c) => `<option value="${esc(rotuloCliente(c))}">`).join('')}
            </datalist>
          </div>
          <div class="campo">
            <label>Desconto (R$)</label>
            <input id="pdv-desconto" inputmode="decimal" placeholder="0,00">
          </div>
          <div class="campo">
            <label>Forma de pagamento</label>
            <select id="pdv-pagamento">
              ${FORMAS_PAGAMENTO.map((f) => `<option>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="pdv-total"><span>Total</span><span id="pdv-total">R$ 0,00</span></div>
        <div class="form-acoes">
          <button class="btn btn-sec" id="pdv-limpar">Limpar</button>
          <button class="btn btn-verde" id="pdv-finalizar" style="flex:1">✅ Finalizar venda</button>
        </div>
      </div>
    </div>`;

  const elResultados = vista.querySelector('#pdv-resultados');
  const elCarrinho = vista.querySelector('#pdv-carrinho');
  const elBusca = vista.querySelector('#pdv-busca');
  const elDesconto = vista.querySelector('#pdv-desconto');

  function subtotal() {
    return estado.carrinho.reduce((t, i) => t + i.preco * i.qtd, 0);
  }

  function renderCarrinho() {
    if (!estado.carrinho.length) {
      elCarrinho.innerHTML = '<p class="texto-suave">Carrinho vazio. Toque em um produto para adicionar.</p>';
    } else {
      elCarrinho.innerHTML = estado.carrinho.map((i, idx) => `
        <div class="carrinho-item">
          <div class="nome">
            <strong>${esc(i.nome)}</strong><br>
            <span class="texto-suave">${fmtMoeda(i.preco)} un.</span>
          </div>
          <div class="qtd-controle">
            <button data-menos="${idx}">−</button>
            <span>${i.qtd}</span>
            <button data-mais="${idx}">+</button>
          </div>
          <strong style="min-width:84px;text-align:right">${fmtMoeda(i.preco * i.qtd)}</strong>
        </div>`).join('');
    }
    const desc = parseMoeda(elDesconto.value);
    vista.querySelector('#pdv-total').textContent = fmtMoeda(Math.max(0, subtotal() - desc));

    elCarrinho.querySelectorAll('[data-mais]').forEach((b) => {
      b.onclick = () => {
        const item = estado.carrinho[+b.dataset.mais];
        if (item.qtd + 1 > item.estoqueDisp) { toast('Estoque insuficiente para esse produto.', 'aviso'); return; }
        item.qtd++;
        renderCarrinho();
      };
    });
    elCarrinho.querySelectorAll('[data-menos]').forEach((b) => {
      b.onclick = () => {
        const item = estado.carrinho[+b.dataset.menos];
        item.qtd--;
        if (item.qtd <= 0) estado.carrinho.splice(+b.dataset.menos, 1);
        renderCarrinho();
      };
    });
  }

  function adicionar(p) {
    const est = Number(p.estoque) || 0;
    const noCarrinho = estado.carrinho.find((i) => i.produtoId === p.id);
    const qtdAtual = noCarrinho ? noCarrinho.qtd : 0;
    if (qtdAtual + 1 > est) { toast('Estoque insuficiente: ' + p.nome, 'aviso'); return; }
    if (noCarrinho) noCarrinho.qtd++;
    else estado.carrinho.push({ produtoId: p.id, nome: p.nome, preco: Number(p.precoVenda) || 0, qtd: 1, estoqueDisp: est });
    renderCarrinho();
  }

  function renderResultados() {
    const q = elBusca.value.trim().toLowerCase();
    const lista = produtos
      .filter((p) => (Number(p.estoque) || 0) > 0 || !q)
      .filter((p) => !q || [p.nome, p.sku, p.codigoBarras, p.marca, p.modelo].some((v) => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 30);

    if (!produtos.length) {
      elResultados.innerHTML = '<p class="texto-suave">Nenhum produto cadastrado. Cadastre produtos na aba "Produtos".</p>';
      return;
    }
    if (!lista.length) {
      elResultados.innerHTML = '<p class="texto-suave">Nenhum produto encontrado.</p>';
      return;
    }
    elResultados.innerHTML = lista.map((p) => {
      const est = Number(p.estoque) || 0;
      return `
      <button type="button" class="pdv-item" data-id="${p.id}" ${est <= 0 ? 'disabled' : ''}>
        <span class="sem-foto" data-foto="${p.id}">📦</span>
        <span class="info">
          <strong>${esc(p.nome)}</strong>
          <span class="texto-suave">${esc(p.sku || '')} · ${est} em estoque</span>
        </span>
        <span class="preco">${fmtMoeda(p.precoVenda)}</span>
      </button>`;
    }).join('');

    lista.forEach((p) => {
      if (p.fotos && p.fotos.length) {
        const cont = elResultados.querySelector(`[data-foto="${p.id}"]`);
        if (cont) {
          cont.innerHTML = '<img alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">';
          definirSrcBlob(cont.querySelector('img'), p.fotos[0].blob);
        }
      }
    });

    elResultados.querySelectorAll('.pdv-item').forEach((b) => {
      b.onclick = () => {
        const p = produtos.find((x) => x.id === +b.dataset.id);
        if (p) adicionar(p);
      };
    });
  }

  elBusca.oninput = renderResultados;
  elBusca.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const q = elBusca.value.trim().toLowerCase();
    if (!q) return;
    const exato = produtos.find((p) =>
      (p.codigoBarras || '').toLowerCase() === q || (p.sku || '').toLowerCase() === q);
    if (exato) {
      adicionar(exato);
      elBusca.value = '';
      renderResultados();
    }
  };
  elDesconto.oninput = renderCarrinho;

  vista.querySelector('#pdv-limpar').onclick = () => {
    estado.carrinho = [];
    renderCarrinho();
  };

  vista.querySelector('#pdv-finalizar').onclick = async () => {
    if (!estado.carrinho.length) { toast('Adicione produtos ao carrinho.', 'aviso'); return; }

    // Revalida estoque com dados atuais
    for (const item of estado.carrinho) {
      const p = await dbObter('produtos', item.produtoId);
      if (!p || (Number(p.estoque) || 0) < item.qtd) {
        toast(`Estoque insuficiente: ${item.nome}`, 'erro');
        return;
      }
    }

    const sub = subtotal();
    const desconto = Math.min(parseMoeda(elDesconto.value), sub);
    const clienteSel = clientePorRotulo(clientes, vista.querySelector('#pdv-cliente').value);

    const venda = {
      clienteId: clienteSel ? clienteSel.id : null,
      clienteNome: clienteSel ? clienteSel.nome : (vista.querySelector('#pdv-cliente').value.trim() || 'Consumidor'),
      itens: estado.carrinho.map((i) => ({ produtoId: i.produtoId, nome: i.nome, qtd: i.qtd, preco: i.preco })),
      subtotal: sub,
      desconto,
      total: Math.max(0, sub - desconto),
      formaPagamento: vista.querySelector('#pdv-pagamento').value,
      criadoEm: new Date().toISOString(),
    };

    const id = await dbAdicionar('vendas', venda);
    venda.id = id;
    venda.numero = pad(id);
    await dbSalvar('vendas', venda);

    // Baixa automática de estoque (no banco e na lista em tela)
    for (const item of estado.carrinho) {
      const p = await dbObter('produtos', item.produtoId);
      if (p) {
        p.estoque = Math.max(0, (Number(p.estoque) || 0) - item.qtd);
        await dbSalvar('produtos', p);
      }
      const local = produtos.find((x) => x.id === item.produtoId);
      if (local) local.estoque = Math.max(0, (Number(local.estoque) || 0) - item.qtd);
    }

    estado.carrinho = [];
    renderCarrinho();
    renderResultados();
    const caixa = abrirModal(`
      ${tituloModal('✅ Venda concluída!')}
      <p style="font-size:16px;margin-bottom:6px">Venda <strong>#${venda.numero}</strong> registrada.</p>
      <p style="font-size:22px;font-weight:800;color:var(--verde);margin-bottom:18px">${fmtMoeda(venda.total)} · ${esc(venda.formaPagamento)}</p>
      <div class="form-acoes" style="justify-content:flex-start">
        <button class="btn btn-primario" id="btn-imprimir-venda">🖨️ Imprimir comprovante</button>
        <button class="btn btn-verde" id="btn-outra-venda">🛒 Nova venda</button>
        <button class="btn btn-sec" id="btn-ir-vendas">Ver vendas</button>
      </div>`);
    caixa.querySelector('#btn-imprimir-venda').onclick = () => imprimirReciboVenda(venda);
    caixa.querySelector('#btn-outra-venda').onclick = () => { fecharModal(); renderPDV(); };
    caixa.querySelector('#btn-ir-vendas').onclick = () => { fecharModal(); navegar('vendas'); };
  };

  renderResultados();
  renderCarrinho();
}

async function modalVendaDetalhe(id) {
  const v = await dbObter('vendas', id);
  if (!v) return;
  const cliente = v.clienteId ? await dbObter('clientes', v.clienteId) : null;

  const caixa = abrirModal(`
    ${tituloModal(`Venda #${v.numero}`)}
    <dl class="lista-definicao" style="margin-bottom:16px">
      <dt>Data</dt><dd>${fmtDataHora(v.criadoEm)}</dd>
      <dt>Cliente</dt><dd>${esc(cliente ? cliente.nome : (v.clienteNome || 'Consumidor'))}</dd>
      <dt>Pagamento</dt><dd>${esc(v.formaPagamento)}</dd>
    </dl>
    <div class="tabela-envolto"><table class="tabela">
      <thead><tr><th>Produto</th><th>Qtd</th><th class="texto-direita">Valor</th></tr></thead>
      <tbody>${v.itens.map((i) => `<tr>
        <td>${esc(i.nome)}</td><td>${i.qtd}</td>
        <td class="texto-direita">${fmtMoeda(i.preco * i.qtd)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="resumo-orcamento" style="margin-top:12px">
      <div class="linha"><span>Subtotal</span><span>${fmtMoeda(v.subtotal)}</span></div>
      ${v.desconto ? `<div class="linha"><span>Desconto</span><span>− ${fmtMoeda(v.desconto)}</span></div>` : ''}
      <div class="linha total"><span>Total</span><span>${fmtMoeda(v.total)}</span></div>
    </div>
    <div class="form-acoes">
      <button class="btn btn-perigo" id="btn-estornar">↩️ Estornar venda</button>
      <button class="btn btn-sec" data-fechar-modal>Fechar</button>
      <button class="btn btn-primario" id="btn-reimprimir">🖨️ Imprimir comprovante</button>
    </div>`);

  caixa.querySelector('#btn-reimprimir').onclick = () => imprimirReciboVenda(v);
  caixa.querySelector('#btn-estornar').onclick = async () => {
    if (!confirm(`Estornar a venda #${v.numero}?\nO estoque dos produtos será devolvido e a venda será excluída.`)) return;
    for (const item of v.itens) {
      const p = await dbObter('produtos', item.produtoId);
      if (p) {
        p.estoque = (Number(p.estoque) || 0) + item.qtd;
        await dbSalvar('produtos', p);
      }
    }
    await dbExcluir('vendas', id);
    fecharModal();
    toast('Venda estornada e estoque devolvido.');
    renderVendas();
  };
}

function imprimirReciboVenda(v) {
  imprimir(`
    <div class="recibo">
      ${cabecalhoRecibo()}
      <h2>COMPROVANTE DE VENDA Nº ${esc(v.numero)}</h2>
      <p>Data: ${fmtDataHora(v.criadoEm)} &nbsp;·&nbsp; Cliente: ${esc(v.clienteNome || 'Consumidor')}</p>

      <table>
        <tr><th>Produto</th><th style="width:60px">Qtd</th><th style="width:100px">Unitário</th><th style="width:110px">Total</th></tr>
        ${v.itens.map((i) => `<tr>
          <td>${esc(i.nome)}</td><td>${i.qtd}</td>
          <td>${fmtMoeda(i.preco)}</td><td>${fmtMoeda(i.preco * i.qtd)}</td>
        </tr>`).join('')}
      </table>

      <table class="sem-borda" style="margin-top:8px">
        <tr class="sem-borda"><td style="text-align:right">Subtotal: ${fmtMoeda(v.subtotal)}</td></tr>
        ${v.desconto ? `<tr class="sem-borda"><td style="text-align:right">Desconto: − ${fmtMoeda(v.desconto)}</td></tr>` : ''}
      </table>
      <p class="total-grande">TOTAL: ${fmtMoeda(v.total)} — ${esc(v.formaPagamento)}</p>

      <div class="termos">
        Trocas somente mediante apresentação deste comprovante, em até 7 (sete) dias, com o produto em perfeitas condições
        e na embalagem original. Garantia conforme o fabricante e o Código de Defesa do Consumidor.
      </div>

      <div class="assinaturas">
        <div>${esc(EMPRESA.nome)}</div>
      </div>
    </div>`);
}

/* ==================== Backup ==================== */

async function renderBackup() {
  const vista = document.getElementById('vista');
  const [clientes, ordens, produtos, vendas] = await Promise.all([
    dbListar('clientes'), dbListar('ordens'), dbListar('produtos'), dbListar('vendas'),
  ]);

  vista.innerHTML = `
    <div class="cartao">
      <h2>💾 Backup dos dados</h2>
      <p style="margin-bottom:14px">
        Todos os dados (clientes, ordens de serviço, produtos, vendas e fotos) ficam salvos
        <strong>neste navegador, neste aparelho</strong>. Faça backups regulares para não perder nada
        se o navegador for limpo ou o aparelho trocado.
      </p>
      <p class="texto-suave" style="margin-bottom:18px">
        Dados atuais: ${clientes.length} cliente(s) · ${ordens.length} OS · ${produtos.length} produto(s) · ${vendas.length} venda(s)
      </p>
      <div class="form-acoes" style="justify-content:flex-start">
        <button class="btn btn-primario" id="btn-exportar">⬇️ Baixar backup (.json)</button>
        <label class="btn btn-sec">⬆️ Restaurar backup
          <input type="file" accept=".json,application/json" id="input-importar" hidden>
        </label>
      </div>
    </div>

    <div class="cartao">
      <h2>ℹ️ Dicas</h2>
      <ul style="padding-left:20px;line-height:1.9;font-size:14px">
        <li>Faça o backup pelo menos <strong>uma vez por semana</strong> e guarde o arquivo no Google Drive ou pen drive.</li>
        <li>Para usar o sistema em outro computador ou celular, baixe o backup aqui e restaure lá.</li>
        <li>Ao restaurar, os dados atuais são <strong>substituídos</strong> pelos do arquivo.</li>
      </ul>
    </div>`;

  vista.querySelector('#btn-exportar').onclick = async () => {
    toast('Gerando backup, aguarde...');
    const converterFotos = async (lista) => Promise.all(lista.map(async (item) => {
      const copia = { ...item };
      if (copia.fotos && copia.fotos.length) {
        copia.fotos = await Promise.all(copia.fotos.map(async (f) => ({ dataURL: await blobParaDataURL(f.blob) })));
      }
      return copia;
    }));

    const dados = {
      app: 'aac-gestao',
      versao: 1,
      geradoEm: new Date().toISOString(),
      clientes,
      ordens: await converterFotos(ordens),
      produtos: await converterFotos(produtos),
      vendas,
    };

    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-aac-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Backup baixado com sucesso!');
  };

  vista.querySelector('#input-importar').onchange = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    if (!confirm('Restaurar este backup?\n\nATENÇÃO: todos os dados atuais serão SUBSTITUÍDOS pelos do arquivo.')) {
      e.target.value = '';
      return;
    }
    try {
      const texto = await arquivo.text();
      const dados = JSON.parse(texto);
      if (dados.app !== 'aac-gestao') throw new Error('Arquivo inválido');

      const restaurarFotos = (lista) => (lista || []).map((item) => {
        const copia = { ...item };
        if (copia.fotos && copia.fotos.length) {
          copia.fotos = copia.fotos.map((f) => ({ blob: dataURLParaBlob(f.dataURL) }));
        }
        return copia;
      });

      await Promise.all([dbLimpar('clientes'), dbLimpar('ordens'), dbLimpar('produtos'), dbLimpar('vendas')]);
      for (const c of dados.clientes || []) await dbSalvar('clientes', c);
      for (const o of restaurarFotos(dados.ordens)) await dbSalvar('ordens', o);
      for (const p of restaurarFotos(dados.produtos)) await dbSalvar('produtos', p);
      for (const v of dados.vendas || []) await dbSalvar('vendas', v);

      toast('Backup restaurado com sucesso!');
      renderBackup();
    } catch (err) {
      console.error(err);
      toast('Não foi possível restaurar: arquivo inválido ou corrompido.', 'erro');
    }
    e.target.value = '';
  };
}

/* ==================== Inicialização ==================== */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await abrirDB();
  } catch (e) {
    document.getElementById('vista').innerHTML =
      '<div class="cartao"><div class="vazio"><div class="icone">⚠️</div>Não foi possível abrir o banco de dados local.<br>Verifique se o navegador permite armazenamento (evite aba anônima).</div></div>';
    return;
  }

  // Navegação lateral
  document.querySelectorAll('.nav-item').forEach((b) => {
    b.onclick = () => navegar(b.dataset.rota);
  });

  // Menu mobile
  document.getElementById('btn-menu').onclick = () => {
    document.getElementById('sidebar').classList.add('aberta');
    document.getElementById('sidebar-fundo').classList.add('visivel');
  };
  document.getElementById('sidebar-fundo').onclick = fecharMenuMobile;

  // Câmera
  document.getElementById('btn-capturar').onclick = capturarFotoCamera;
  document.getElementById('btn-fechar-camera').onclick = fecharCamera;
  document.getElementById('btn-trocar-camera').onclick = async () => {
    _camFrontal = !_camFrontal;
    await iniciarStreamCamera();
  };

  // Lightbox
  document.getElementById('lightbox').onclick = () => {
    document.getElementById('lightbox').classList.add('oculto');
    document.getElementById('lightbox-img').removeAttribute('src');
  };

  // Fechar modal com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('lightbox').classList.contains('oculto')) {
        document.getElementById('lightbox').classList.add('oculto');
      } else if (!document.getElementById('modal-camera').classList.contains('oculto')) {
        fecharCamera();
      } else if (!document.getElementById('modal').classList.contains('oculto')) {
        fecharModal();
      }
    }
  });

  navegar('dashboard');
});
