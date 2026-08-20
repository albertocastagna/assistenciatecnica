/* ============================================================
   AAC Assistência Técnica — Loja virtual (loja.html)

   - Clientes: veem os produtos, filtram por categoria, montam o
     carrinho e finalizam o pedido pelo WhatsApp da loja.
   - Administrador (logado): cadastra, edita e exclui produtos com
     fotos direto na loja (mesmo banco do sistema de gestão) e
     publica o catálogo para aparecer no site na internet.

   Requer: js/auth.js, js/db.js e js/catalogo.js carregados antes.
   ============================================================ */

const LOJA_WHATSAPP = '5541984590345';

const LOJA_CATEGORIAS = ['Celulares', 'Capas e Películas', 'Carregadores e Cabos', 'Fones de Ouvido',
  'Caixas de Som', 'Informática', 'Periféricos', 'Smartwatch', 'Peças', 'Acessórios', 'Outros'];

const CARRINHO_CHAVE = 'aac_carrinho';

const loja = {
  produtos: [],
  origem: 'vazio',
  busca: '',
  categoria: '',
  carrinho: [],
};

/* ==================== Utilidades de página ==================== */

function ljToast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = 'lj-toast ' + tipo;
  el.textContent = msg;
  document.getElementById('lj-toasts').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function ljAbrirModal(html) {
  const fundo = document.getElementById('lj-modal-fundo');
  const caixa = document.getElementById('lj-modal');
  caixa.innerHTML = `<button class="fechar-x" data-fechar-modal title="Fechar">✕</button>` + html;
  fundo.classList.remove('lj-oculto');
  caixa.querySelectorAll('[data-fechar-modal]').forEach((b) => (b.onclick = ljFecharModal));
  return caixa;
}

function ljFecharModal() {
  document.getElementById('lj-modal-fundo').classList.add('lj-oculto');
  document.getElementById('lj-modal').innerHTML = '';
}

function ljAbrirLightbox(blob) {
  const lb = document.getElementById('lj-lightbox');
  definirSrcBlob(document.getElementById('lj-lightbox-img'), blob);
  lb.classList.remove('lj-oculto');
}

function produtoPorId(id) {
  return loja.produtos.find((p) => String(p.id) === String(id));
}

/* ==================== Sessão (cabeçalho) ==================== */

function renderSessao() {
  const area = document.getElementById('sessao-area');
  const s = authSessao();
  if (!s) {
    area.innerHTML = `<a href="login.html?voltar=loja">👤 Entrar</a>`;
    return;
  }
  const primeiroNome = s.nome.split(' ')[0];
  area.innerHTML = `
    <span class="ola">Olá, <strong>${esc(primeiroNome)}</strong>${s.tipo === 'admin' ? ' (admin)' : ''}</span>
    ${s.tipo === 'admin' ? '<a href="sistema.html">🛠️ Sistema</a>' : ''}
    <button id="btn-sair-loja">Sair</button>`;
  area.querySelector('#btn-sair-loja').onclick = () => {
    authSair();
    location.reload();
  };
}

/* ==================== Barra do administrador ==================== */

function renderAdminBarra() {
  const barra = document.getElementById('admin-barra');
  if (!authEhAdmin()) { barra.classList.add('lj-oculto'); return; }
  barra.classList.remove('lj-oculto');
  barra.innerHTML = `
    <span>🛠️ <strong>Modo administrador</strong> — os produtos abaixo podem ser editados.</span>
    <div class="acoes">
      <button class="lj-btn lj-btn-dourado" id="btn-novo-produto">➕ Cadastrar produto</button>
      <button class="lj-btn lj-btn-sec" id="btn-publicar">📤 Publicar catálogo</button>
    </div>`;
  barra.querySelector('#btn-novo-produto').onclick = () => modalProdutoAdmin(null);
  barra.querySelector('#btn-publicar').onclick = publicarCatalogo;
}

/* ==================== Listagem de produtos ==================== */

function renderChips() {
  const cont = document.getElementById('chips-categorias');
  const usadas = [...new Set(loja.produtos.map((p) => p.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  cont.innerHTML = `<button data-cat="" class="${!loja.categoria ? 'ativa' : ''}">Todos</button>` +
    usadas.map((c) => `<button data-cat="${esc(c)}" class="${loja.categoria === c ? 'ativa' : ''}">${esc(c)}</button>`).join('');
  cont.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { loja.categoria = b.dataset.cat; renderChips(); renderGrade(); };
  });
}

function renderGrade() {
  const grade = document.getElementById('grade-loja');
  const ehAdmin = authEhAdmin();
  const busca = loja.busca.toLowerCase();

  const filtrados = loja.produtos
    .filter((p) => !loja.categoria || p.categoria === loja.categoria)
    .filter((p) => !busca || [p.nome, p.marca, p.modelo, p.categoria, p.descricao]
      .some((v) => (v || '').toLowerCase().includes(busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  if (!filtrados.length) {
    grade.innerHTML = `
      <div class="loja-vazia" style="grid-column:1/-1">
        <div class="icone">🛍️</div>
        ${loja.produtos.length
          ? 'Nenhum produto encontrado com esse filtro.'
          : `Nossa vitrine virtual está sendo abastecida!<br>
             Fale com a gente pelo WhatsApp para saber o que temos na loja.<br><br>
             <a class="lj-btn lj-btn-verde" target="_blank" rel="noopener"
                href="https://wa.me/${LOJA_WHATSAPP}?text=${encodeURIComponent('Olá! Vi o site e quero saber quais produtos vocês têm na loja.')}">💬 Chamar no WhatsApp</a>`}
      </div>`;
    return;
  }

  grade.innerHTML = filtrados.map((p) => {
    const est = Number(p.estoque) || 0;
    return `
    <div class="card-prod" data-id="${p.id}">
      <div class="foto" data-foto="${p.id}">📦</div>
      <div class="corpo">
        <span class="nome">${esc(p.nome)}</span>
        <span class="cat">${esc(p.categoria || '')}${p.marca ? ' · ' + esc(p.marca) : ''}</span>
        <div class="rodape">
          <span class="preco">${fmtMoeda(p.precoVenda)}</span>
          <span class="tag-estoque-loja ${est <= 0 ? 'esgotado' : ''}">${est <= 0 ? 'Esgotado' : 'Disponível'}</span>
        </div>
      </div>
      <button class="btn-add" data-add="${p.id}" ${est <= 0 ? 'disabled' : ''}>${est <= 0 ? 'Indisponível' : '🛒 Adicionar'}</button>
      ${ehAdmin && loja.origem === 'local' ? `
      <div class="admin-acoes">
        <button data-editar="${p.id}">✏️ Editar</button>
        <button data-excluir="${p.id}">🗑️ Excluir</button>
      </div>` : ''}
    </div>`;
  }).join('');

  // Miniaturas
  filtrados.forEach((p) => {
    const blob = catalogoFotoPrincipal(p);
    if (blob) {
      const cont = grade.querySelector(`[data-foto="${p.id}"]`);
      cont.innerHTML = '<img alt="">';
      definirSrcBlob(cont.querySelector('img'), blob);
    }
  });

  // Eventos
  grade.querySelectorAll('.card-prod').forEach((card) => {
    card.querySelector('.corpo').onclick = () => modalDetalhe(produtoPorId(card.dataset.id));
    card.querySelector('.foto').onclick = () => modalDetalhe(produtoPorId(card.dataset.id));
  });
  grade.querySelectorAll('[data-add]').forEach((b) => {
    b.onclick = () => adicionarCarrinho(produtoPorId(b.dataset.add), 1);
  });
  grade.querySelectorAll('[data-editar]').forEach((b) => {
    b.onclick = () => modalProdutoAdmin(produtoPorId(b.dataset.editar));
  });
  grade.querySelectorAll('[data-excluir]').forEach((b) => {
    b.onclick = async () => {
      const p = produtoPorId(b.dataset.excluir);
      if (!confirm(`Excluir o produto "${p.nome}"?`)) return;
      await dbExcluir('produtos', p.id);
      ljToast('Produto excluído.');
      await recarregarProdutos();
    };
  });
}

/* ==================== Detalhe do produto ==================== */

function modalDetalhe(p) {
  if (!p) return;
  const est = Number(p.estoque) || 0;
  let qtd = 1;
  let fotoAtiva = 0;

  const caixa = ljAbrirModal(`
    <h2>${esc(p.nome)}</h2>
    <div class="det-fotos">
      <div class="det-foto-principal" id="det-foto-principal">📦</div>
      <div class="det-miniaturas" id="det-miniaturas"></div>
    </div>
    <div class="det-preco">${fmtMoeda(p.precoVenda)}</div>
    <p style="font-size:13.5px;color:var(--texto-suave)">
      ${esc([p.categoria, p.marca, p.modelo].filter(Boolean).join(' · '))}
      · <span class="tag-estoque-loja ${est <= 0 ? 'esgotado' : ''}">${est <= 0 ? 'Esgotado' : 'Disponível na loja'}</span>
    </p>
    ${p.descricao ? `<div class="det-desc">${esc(p.descricao)}</div>` : ''}
    <div class="det-linha">
      ${est > 0 ? `
      <div class="det-qtd">
        <button id="det-menos">−</button><span id="det-qtd">1</span><button id="det-mais">+</button>
      </div>
      <button class="lj-btn lj-btn-dourado" id="det-add">🛒 Adicionar ao carrinho</button>` : ''}
      <a class="lj-btn lj-btn-verde" target="_blank" rel="noopener"
         href="https://wa.me/${LOJA_WHATSAPP}?text=${encodeURIComponent(`Olá! Vi o produto "${p.nome}" (${fmtMoeda(p.precoVenda)}) no site e quero mais informações.`)}">💬 Perguntar no WhatsApp</a>
    </div>
    ${authEhAdmin() && loja.origem === 'local' ? `
    <div class="lj-form-acoes" style="border-top:1px solid rgba(255,255,255,.08);padding-top:14px">
      <button class="lj-btn lj-btn-sec" id="det-editar">✏️ Editar produto</button>
    </div>` : ''}`);

  // Fotos
  const principal = caixa.querySelector('#det-foto-principal');
  const minis = caixa.querySelector('#det-miniaturas');
  const fotos = p.fotos || [];

  function mostrarFoto(i) {
    fotoAtiva = i;
    if (!fotos.length) return;
    principal.innerHTML = '<img alt="">';
    definirSrcBlob(principal.querySelector('img'), fotos[i].blob);
    minis.querySelectorAll('img').forEach((m, j) => m.classList.toggle('ativa', j === i));
  }

  if (fotos.length) {
    minis.innerHTML = fotos.map((f, i) => `<img data-i="${i}" alt="Foto ${i + 1}">`).join('');
    minis.querySelectorAll('img').forEach((img) => {
      definirSrcBlob(img, fotos[+img.dataset.i].blob);
      img.onclick = () => mostrarFoto(+img.dataset.i);
    });
    principal.onclick = () => ljAbrirLightbox(fotos[fotoAtiva].blob);
    mostrarFoto(0);
  }

  // Quantidade e carrinho
  if (est > 0) {
    const elQtd = caixa.querySelector('#det-qtd');
    caixa.querySelector('#det-menos').onclick = () => { qtd = Math.max(1, qtd - 1); elQtd.textContent = qtd; };
    caixa.querySelector('#det-mais').onclick = () => { qtd = Math.min(est, qtd + 1); elQtd.textContent = qtd; };
    caixa.querySelector('#det-add').onclick = () => {
      adicionarCarrinho(p, qtd);
      ljFecharModal();
    };
  }

  const btnEditar = caixa.querySelector('#det-editar');
  if (btnEditar) btnEditar.onclick = () => { ljFecharModal(); modalProdutoAdmin(p); };
}

/* ==================== Carrinho ==================== */

function carregarCarrinho() {
  try { loja.carrinho = JSON.parse(localStorage.getItem(CARRINHO_CHAVE)) || []; }
  catch { loja.carrinho = []; }
}

function salvarCarrinho() {
  localStorage.setItem(CARRINHO_CHAVE, JSON.stringify(loja.carrinho));
  renderBadgeCarrinho();
}

function adicionarCarrinho(p, qtd) {
  if (!p) return;
  const est = Number(p.estoque) || 0;
  const item = loja.carrinho.find((i) => String(i.id) === String(p.id));
  if (item) {
    item.qtd = Math.min(est || 99, item.qtd + qtd);
  } else {
    loja.carrinho.push({ id: p.id, nome: p.nome, preco: Number(p.precoVenda) || 0, qtd: Math.min(est || 99, qtd) });
  }
  salvarCarrinho();
  renderCarrinho();
  ljToast(`"${p.nome}" adicionado ao carrinho 🛒`);
}

function renderBadgeCarrinho() {
  const total = loja.carrinho.reduce((t, i) => t + i.qtd, 0);
  document.getElementById('carrinho-qtd').textContent = total;
  document.getElementById('btn-carrinho').style.display = total ? 'inline-flex' : 'none';
}

function renderCarrinho() {
  const cont = document.getElementById('carrinho-itens');
  const rodape = document.getElementById('carrinho-rodape');

  if (!loja.carrinho.length) {
    cont.innerHTML = '<div class="carrinho-vazio">Seu carrinho está vazio.<br>Adicione produtos da vitrine. 🛍️</div>';
    rodape.classList.add('lj-oculto');
    renderBadgeCarrinho();
    return;
  }

  rodape.classList.remove('lj-oculto');
  cont.innerHTML = loja.carrinho.map((i, idx) => `
    <div class="carrinho-item">
      <div class="mini" data-mini="${idx}">📦</div>
      <div class="info">
        <span class="n">${esc(i.nome)}</span>
        <span class="p">${fmtMoeda(i.preco)} × ${i.qtd} = ${fmtMoeda(i.preco * i.qtd)}</span>
      </div>
      <div class="qtd">
        <button data-menos="${idx}">−</button><span>${i.qtd}</span><button data-mais="${idx}">+</button>
        <button data-remover="${idx}" title="Remover" style="color:#ff8d8d">✕</button>
      </div>
    </div>`).join('');

  loja.carrinho.forEach((i, idx) => {
    const p = produtoPorId(i.id);
    const blob = p ? catalogoFotoPrincipal(p) : null;
    if (blob) {
      const mini = cont.querySelector(`[data-mini="${idx}"]`);
      mini.innerHTML = '<img alt="">';
      definirSrcBlob(mini.querySelector('img'), blob);
    }
  });

  cont.querySelectorAll('[data-menos]').forEach((b) => {
    b.onclick = () => {
      const i = loja.carrinho[+b.dataset.menos];
      i.qtd = Math.max(1, i.qtd - 1);
      salvarCarrinho(); renderCarrinho();
    };
  });
  cont.querySelectorAll('[data-mais]').forEach((b) => {
    b.onclick = () => {
      const i = loja.carrinho[+b.dataset.mais];
      const p = produtoPorId(i.id);
      const est = p ? (Number(p.estoque) || 99) : 99;
      i.qtd = Math.min(est, i.qtd + 1);
      salvarCarrinho(); renderCarrinho();
    };
  });
  cont.querySelectorAll('[data-remover]').forEach((b) => {
    b.onclick = () => {
      loja.carrinho.splice(+b.dataset.remover, 1);
      salvarCarrinho(); renderCarrinho();
    };
  });

  const total = loja.carrinho.reduce((t, i) => t + i.preco * i.qtd, 0);
  document.getElementById('carrinho-total-valor').textContent = fmtMoeda(total);
  renderBadgeCarrinho();
}

function finalizarPedido() {
  if (!loja.carrinho.length) return;
  const s = authSessao();
  const total = loja.carrinho.reduce((t, i) => t + i.preco * i.qtd, 0);
  const linhas = [
    'Olá! Quero fazer um pedido pelo site:',
    '',
    ...loja.carrinho.map((i) => `▪ ${i.qtd}x ${i.nome} — ${fmtMoeda(i.preco * i.qtd)}`),
    '',
    `TOTAL: ${fmtMoeda(total)}`,
  ];
  if (s) linhas.push('', `Nome: ${s.nome}`);
  linhas.push('', 'Aguardo a confirmação da disponibilidade. Obrigado!');
  window.open(`https://wa.me/${LOJA_WHATSAPP}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank');
}

/* ==================== Cadastro de produto (admin) ==================== */

function criarGerenciadorFotosLoja(container, fotosIniciais) {
  const fotos = (fotosIniciais || []).map((f) => ({ blob: f.blob }));

  function render() {
    container.innerHTML = `
      <div class="lj-fotos-grade">${fotos.map((f, i) => `
        <div class="lj-foto-thumb">
          <img data-i="${i}" alt="Foto ${i + 1}">
          <button type="button" class="rem" data-i="${i}" title="Remover">✕</button>
        </div>`).join('')}
      </div>
      <label class="lj-btn lj-btn-sec" style="font-size:13px">📷 Adicionar fotos
        <input type="file" accept="image/*" multiple hidden>
      </label>
      <p style="font-size:12px;color:var(--texto-suave);margin-top:6px">
        No celular, você pode tirar a foto na hora ou escolher da galeria.
      </p>`;

    container.querySelectorAll('img[data-i]').forEach((img) => {
      const f = fotos[+img.dataset.i];
      definirSrcBlob(img, f.blob);
      img.onclick = () => ljAbrirLightbox(f.blob);
    });
    container.querySelectorAll('.rem').forEach((b) => {
      b.onclick = () => { fotos.splice(+b.dataset.i, 1); render(); };
    });
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

function modalProdutoAdmin(produto) {
  const p = produto || {};
  const caixa = ljAbrirModal(`
    <h2>${produto ? '✏️ Editar produto' : '➕ Cadastrar produto'}</h2>
    <form id="form-prod-loja">
      <div class="lj-form-grade">
        <div class="campo largo">
          <label>Nome do produto <span class="obrig">*</span></label>
          <input name="nome" required value="${esc(p.nome)}" placeholder="Ex.: Fone Bluetooth JBL Tune 510BT">
        </div>
        <div class="campo">
          <label>Categoria</label>
          <select name="categoria">
            ${LOJA_CATEGORIAS.map((c) => `<option ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
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
          <label>Preço de venda (R$) <span class="obrig">*</span></label>
          <input name="precoVenda" required inputmode="decimal" value="${p.precoVenda ?? ''}" placeholder="0,00">
        </div>
        <div class="campo">
          <label>Quantidade em estoque</label>
          <input name="estoque" type="number" min="0" value="${p.estoque ?? 1}">
        </div>
        <div class="campo">
          <label>Preço de custo (R$) — não aparece para o cliente</label>
          <input name="precoCusto" inputmode="decimal" value="${p.precoCusto ?? ''}" placeholder="0,00">
        </div>
        <div class="campo largo">
          <label>Descrição (aparece para o cliente)</label>
          <textarea name="descricao" placeholder="Características, cor, garantia, compatibilidade...">${esc(p.descricao)}</textarea>
        </div>
        <div class="campo largo">
          <label>Fotos do produto</label>
          <div id="fotos-prod-loja"></div>
        </div>
      </div>
      <div class="lj-form-acoes">
        <button type="button" class="lj-btn lj-btn-sec" data-fechar-modal>Cancelar</button>
        <button type="submit" class="lj-btn lj-btn-dourado">💾 Salvar produto</button>
      </div>
    </form>`);

  const gerFotos = criarGerenciadorFotosLoja(caixa.querySelector('#fotos-prod-loja'), p.fotos);

  caixa.querySelector('#form-prod-loja').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const dados = {
      nome: f.get('nome').trim(),
      categoria: f.get('categoria'),
      marca: f.get('marca').trim(),
      modelo: f.get('modelo').trim(),
      precoVenda: parseMoeda(f.get('precoVenda')),
      precoCusto: parseMoeda(f.get('precoCusto')),
      estoque: Math.max(0, parseInt(f.get('estoque'), 10) || 0),
      descricao: f.get('descricao').trim(),
      fotos: gerFotos.obterFotos(),
    };

    if (produto) {
      await dbSalvar('produtos', { ...produto, ...dados });
    } else {
      dados.criadoEm = new Date().toISOString();
      dados.estoqueMin = 1;
      const id = await dbAdicionar('produtos', dados);
      dados.id = id;
      dados.sku = 'P' + String(id).padStart(4, '0');
      await dbSalvar('produtos', dados);
    }
    ljFecharModal();
    ljToast('Produto salvo com sucesso!');
    await recarregarProdutos();
  };
}

/* ==================== Publicar catálogo (admin) ====================
   Gera o arquivo "catalogo.json" com os produtos cadastrados NESTE
   navegador. Para os clientes verem na internet, basta colocar o
   arquivo na pasta "data" do site e publicar de novo (Vercel etc.). */

async function publicarCatalogo() {
  const produtos = await dbListar('produtos');
  if (!produtos.length) { ljToast('Cadastre produtos antes de publicar o catálogo.', 'aviso'); return; }

  ljToast('Gerando catálogo, aguarde...');
  const publicaveis = await Promise.all(produtos.map(async (p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    marca: p.marca,
    modelo: p.modelo,
    precoVenda: p.precoVenda,
    estoque: p.estoque,
    descricao: p.descricao,
    criadoEm: p.criadoEm,
    // preço de custo, SKU e código de barras NÃO vão para o site
    fotos: await Promise.all((p.fotos || []).map(async (f) => ({ dataURL: await blobParaDataURL(f.blob) }))),
  })));

  const dados = {
    app: 'aac-catalogo',
    versao: 1,
    geradoEm: new Date().toISOString(),
    produtos: publicaveis,
  };

  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'catalogo.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  ljAbrirModal(`
    <h2>📤 Catálogo gerado!</h2>
    <p style="line-height:1.8;font-size:14.5px">
      O arquivo <strong>catalogo.json</strong> foi baixado com ${publicaveis.length} produto(s).<br><br>
      <strong>Para os clientes verem os produtos na internet:</strong><br>
      1. Coloque o arquivo <strong>catalogo.json</strong> dentro da pasta <strong>data</strong> do site
      (substitua o antigo, se existir).<br>
      2. Publique o site de novo (envie a pasta para a Vercel / Netlify / GitHub Pages).<br><br>
      <span style="color:var(--texto-suave);font-size:13px">
      Neste computador você não precisa fazer nada: a loja já mostra os produtos do banco local automaticamente.
      Repita a publicação sempre que cadastrar ou alterar produtos.</span>
    </p>
    <div class="lj-form-acoes">
      <button class="lj-btn lj-btn-dourado" data-fechar-modal>Entendi</button>
    </div>`);
}

/* ==================== Inicialização ==================== */

async function recarregarProdutos() {
  const { origem, produtos } = await catalogoCarregar();
  loja.origem = origem;
  loja.produtos = produtos;
  renderChips();
  renderGrade();
  renderCarrinho();
}

document.addEventListener('DOMContentLoaded', async () => {
  renderSessao();
  renderAdminBarra();
  carregarCarrinho();
  await recarregarProdutos();

  // Busca
  const inputBusca = document.getElementById('busca-loja');
  inputBusca.oninput = () => { loja.busca = inputBusca.value; renderGrade(); };

  // Carrinho (abrir/fechar painel)
  document.getElementById('btn-carrinho').onclick = () => {
    document.getElementById('painel-carrinho').classList.add('aberto');
    renderCarrinho();
  };
  document.getElementById('btn-fechar-carrinho').onclick = () =>
    document.getElementById('painel-carrinho').classList.remove('aberto');
  document.getElementById('btn-finalizar').onclick = finalizarPedido;
  document.getElementById('btn-limpar-carrinho').onclick = () => {
    if (!confirm('Esvaziar o carrinho?')) return;
    loja.carrinho = [];
    salvarCarrinho(); renderCarrinho();
  };

  // Modal e lightbox
  document.getElementById('lj-modal-fundo').onclick = (e) => {
    if (e.target === e.currentTarget) ljFecharModal();
  };
  document.getElementById('lj-lightbox').onclick = () => {
    document.getElementById('lj-lightbox').classList.add('lj-oculto');
    document.getElementById('lj-lightbox-img').removeAttribute('src');
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lb = document.getElementById('lj-lightbox');
      if (!lb.classList.contains('lj-oculto')) lb.classList.add('lj-oculto');
      else if (!document.getElementById('lj-modal-fundo').classList.contains('lj-oculto')) ljFecharModal();
      else document.getElementById('painel-carrinho').classList.remove('aberto');
    }
  });

  // Menu mobile (mesmo padrão do index)
  const btnMenu = document.getElementById('btn-menu-mobile');
  const menu = document.getElementById('menu');
  if (btnMenu && menu) {
    btnMenu.addEventListener('click', () => menu.classList.toggle('aberto'));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.classList.remove('aberto')));
  }

  // Link direto para um produto (vindo da vitrine do index): loja.html#produto-12
  const m = location.hash.match(/^#produto-(.+)$/);
  if (m) {
    const p = produtoPorId(m[1]);
    if (p) modalDetalhe(p);
  }
});
