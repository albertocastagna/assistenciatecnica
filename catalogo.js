/* ============================================================
   AAC Assistência Técnica — Catálogo compartilhado
   Camada usada pela loja virtual (loja.html) e pela vitrine de
   destaques do site (index.html).

   De onde vêm os produtos:
   1) Do banco local do navegador (IndexedDB) — os mesmos produtos
      cadastrados no sistema de gestão ou no modo admin da loja.
   2) Se o banco local estiver vazio (navegador dos clientes), do
      arquivo "data/catalogo.json" publicado junto com o site.
      O admin gera esse arquivo no botão "Publicar catálogo".
   ============================================================ */

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

/* ---------- Imagens ---------- */

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

/* ---------- Carregamento do catálogo ---------- */

async function catalogoCarregar() {
  // 1) Produtos do banco local (mesmo navegador onde o admin cadastra)
  let locais = [];
  try { locais = await dbListar('produtos'); } catch (e) { /* sem IndexedDB */ }
  if (locais.length) return { origem: 'local', produtos: locais };

  // 2) Catálogo publicado junto com o site (navegador dos clientes)
  try {
    const r = await fetch('data/catalogo.json', { cache: 'no-store' });
    if (r.ok) {
      const dados = await r.json();
      if (dados && dados.app === 'aac-catalogo' && Array.isArray(dados.produtos)) {
        const produtos = dados.produtos.map((p) => ({
          ...p,
          fotos: (p.fotos || []).map((f) => ({ blob: dataURLParaBlob(f.dataURL) })),
        }));
        return { origem: 'publicado', produtos };
      }
    }
  } catch (e) { /* arquivo não existe ou abriu via file:// — segue vazio */ }

  return { origem: 'vazio', produtos: [] };
}

function catalogoFotoPrincipal(p) {
  return (p.fotos && p.fotos.length) ? p.fotos[0].blob : null;
}

/* ---------- Vitrine de destaques (usada no index.html) ----------
   Preenche o container com até "limite" produtos e devolve quantos
   foram exibidos (0 = catálogo vazio, mantém a grade estática). */

async function montarVitrine(container, limite) {
  const { produtos } = await catalogoCarregar();
  if (!produtos.length) return 0;

  const destaque = produtos
    .filter((p) => (Number(p.estoque) || 0) > 0)
    .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))
    .slice(0, limite || 8);
  if (!destaque.length) return 0;

  container.innerHTML = destaque.map((p, i) => `
    <a class="card-prod" href="loja.html#produto-${p.id}" style="text-decoration:none;color:inherit">
      <div class="foto" data-vitrine-foto="${i}">📦</div>
      <div class="corpo">
        <span class="nome">${esc(p.nome)}</span>
        <span class="cat">${esc(p.categoria || '')}</span>
        <div class="rodape"><span class="preco">${fmtMoeda(p.precoVenda)}</span></div>
      </div>
    </a>`).join('');

  destaque.forEach((p, i) => {
    const blob = catalogoFotoPrincipal(p);
    if (blob) {
      const cont = container.querySelector(`[data-vitrine-foto="${i}"]`);
      cont.innerHTML = '<img alt="">';
      definirSrcBlob(cont.querySelector('img'), blob);
    }
  });

  return destaque.length;
}
