/* ============================================================
   AAC Assistência Técnica — Assistente virtual de pré-orçamento
   Widget de chat que funciona direto no navegador, sem servidor.
   Ele entende palavras-chave, guia o cliente por perguntas e dá
   uma faixa de preço estimada, finalizando no WhatsApp da loja.

   ⚠️ OS VALORES SÃO EXEMPLOS! Edite a TABELA_PRECOS abaixo com
   os preços reais praticados pela loja (faixa mínima e máxima).
   ============================================================ */

(function () {
  'use strict';

  const CB_WHATSAPP = '5541984590345';
  const CB_HORARIO = 'Atendemos de segunda a sábado, até as 19:00.';
  const CB_ENDERECO = 'Rua Tavares de Lyra, 3918 - Iná, São José dos Pinhais - PR.';

  /* ---------- TABELA DE PREÇOS (EDITE AQUI) ----------
     Cada serviço tem uma faixa [mínimo, máximo] em R$.
     Use null para serviços que só podem ser avaliados na bancada. */
  const TABELA_PRECOS = {
    celular: {
      nome: 'Celular',
      icone: '📱',
      servicos: {
        tela:       { nome: 'Troca de tela / display', faixa: [130, 700], prazo: 'na maioria dos casos sai no mesmo dia' },
        bateria:    { nome: 'Troca de bateria', faixa: [90, 300], prazo: 'normalmente fica pronto no mesmo dia' },
        carga:      { nome: 'Conector de carga / não carrega', faixa: [80, 250], prazo: 'de 1 a 2 dias' },
        naoLiga:    { nome: 'Aparelho não liga (reparo em placa)', faixa: [150, 600], prazo: 'depende do diagnóstico em bancada' },
        agua:       { nome: 'Molhou / caiu na água (limpeza química)', faixa: [100, 300], prazo: 'de 1 a 3 dias', obs: 'Quanto antes trouxer o aparelho (desligado!), maior a chance de salvar.' },
        camera:     { nome: 'Câmera', faixa: [100, 400], prazo: 'de 1 a 2 dias' },
        audio:      { nome: 'Som / microfone / alto-falante', faixa: [80, 250], prazo: 'de 1 a 2 dias' },
        software:   { nome: 'Sistema lento / travando / formatação', faixa: [60, 150], prazo: 'normalmente no mesmo dia' },
      },
    },
    notebook: {
      nome: 'Notebook',
      icone: '💻',
      servicos: {
        tela:       { nome: 'Troca de tela', faixa: [250, 900], prazo: 'de 1 a 3 dias (depende da peça)' },
        bateria:    { nome: 'Troca de bateria', faixa: [200, 600], prazo: 'de 1 a 3 dias' },
        teclado:    { nome: 'Troca de teclado', faixa: [150, 450], prazo: 'de 1 a 3 dias' },
        naoLiga:    { nome: 'Não liga (reparo em placa)', faixa: [150, 700], prazo: 'depende do diagnóstico em bancada' },
        software:   { nome: 'Formatação / lentidão / vírus', faixa: [80, 180], prazo: 'de 1 a 2 dias' },
        upgrade:    { nome: 'Upgrade de SSD / memória', faixa: [100, 250], prazo: 'no mesmo dia', obs: 'O valor da peça (SSD/memória) é cobrado à parte — temos opções na loja.' },
        quente:     { nome: 'Esquentando muito (limpeza + pasta térmica)', faixa: [100, 220], prazo: 'normalmente no mesmo dia' },
      },
    },
    computador: {
      nome: 'Computador / PC',
      icone: '🖥️',
      servicos: {
        naoLiga:    { nome: 'Não liga / não dá vídeo', faixa: [100, 500], prazo: 'depende do diagnóstico em bancada' },
        software:   { nome: 'Formatação / lentidão / vírus', faixa: [80, 180], prazo: 'de 1 a 2 dias' },
        upgrade:    { nome: 'Upgrade de SSD / memória / placa', faixa: [100, 250], prazo: 'no mesmo dia', obs: 'O valor das peças é cobrado à parte — temos opções na loja.' },
        quente:     { nome: 'Esquentando / desligando sozinho (limpeza)', faixa: [80, 200], prazo: 'normalmente no mesmo dia' },
      },
    },
    tablet: {
      nome: 'Tablet',
      icone: '📲',
      servicos: {
        tela:       { nome: 'Troca de tela / touch', faixa: [200, 700], prazo: 'de 1 a 3 dias (depende da peça)' },
        bateria:    { nome: 'Troca de bateria', faixa: [150, 400], prazo: 'de 1 a 3 dias' },
        carga:      { nome: 'Conector de carga / não carrega', faixa: [100, 280], prazo: 'de 1 a 2 dias' },
        naoLiga:    { nome: 'Não liga (reparo em placa)', faixa: null, prazo: 'depende do diagnóstico em bancada' },
      },
    },
    outro: {
      nome: 'Outro aparelho',
      icone: '🔌',
      servicos: {
        geral:      { nome: 'Caixa de som, fone, videogame e outros', faixa: null, prazo: 'avaliação gratuita na loja' },
      },
    },
  };

  /* Palavras-chave para entender o que o cliente digitou */
  const PALAVRAS_SERVICO = {
    tela:     ['tela', 'display', 'vidro', 'touch', 'quebr', 'trincad', 'rachad', 'preta'],
    bateria:  ['bateria', 'descarrega', 'vicia', 'dura pouco', 'autonomia'],
    carga:    ['não carrega', 'nao carrega', 'carregador', 'conector', 'entrada do cabo', 'cabo não'],
    naoLiga:  ['não liga', 'nao liga', 'morto', 'não dá vídeo', 'nao da video', 'desliga sozinho'],
    agua:     ['molhou', 'água', 'agua', 'piscina', 'chuva', 'umidade', 'mar', 'privada'],
    camera:   ['câmera', 'camera', 'foto embaçada', 'foto embacada'],
    audio:    ['som', 'áudio', 'audio', 'alto-falante', 'alto falante', 'microfone', 'não escuto', 'nao escuto'],
    software: ['lento', 'trava', 'format', 'vírus', 'virus', 'sistema', 'windows', 'travando', 'lentidão', 'lentidao'],
    teclado:  ['teclado', 'tecla'],
    upgrade:  ['ssd', 'memória', 'memoria', ' ram', 'upgrade', 'melhorar o desempenho'],
    quente:   ['esquent', 'quente', 'aquece', 'superaquec', 'ventoinha'],
  };

  const PALAVRAS_APARELHO = {
    celular:    ['celular', 'iphone', 'samsung', 'xiaomi', 'motorola', 'smartphone', 'telefone', 'redmi', 'poco', 'galaxy'],
    notebook:   ['notebook', 'laptop', 'macbook'],
    computador: ['computador', 'pc ', ' pc', 'desktop', 'gabinete', 'cpu'],
    tablet:     ['tablet', 'ipad'],
  };

  const PALAVRAS_FAQ = {
    horario:   ['horário', 'horario', 'que horas', 'abre', 'fecha', 'aberto', 'funciona'],
    endereco:  ['endereço', 'endereco', 'onde fica', 'localiza', 'como chegar', 'rua '],
    garantia:  ['garantia'],
    pagamento: ['pagamento', 'pix', 'cartão', 'cartao', 'parcel', 'dinheiro', 'débito', 'debito', 'crédito', 'credito'],
    produtos:  ['comprar', 'produto', 'acessório', 'acessorio', 'capinha', 'película', 'pelicula', 'fone', 'carregador', 'vende'],
    humano:    ['atendente', 'humano', 'pessoa', 'falar com alguém', 'falar com alguem', 'whatsapp'],
  };

  /* ---------- Estado da conversa ---------- */
  const ctx = { etapa: 'menu', aparelho: null, modelo: '', servico: null };

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const cbEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function nomeCliente() {
    try {
      if (typeof authSessao === 'function') {
        const s = authSessao();
        if (s && s.nome) return s.nome.split(' ')[0];
      }
    } catch (e) { /* auth.js não carregado nesta página */ }
    return null;
  }

  /* ---------- Montagem do widget ---------- */

  const estilos = `
  .cb-botao{position:fixed;right:18px;bottom:88px;z-index:80;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;
    background:linear-gradient(135deg,#f0c64a,#d4a017);color:#14181f;font-size:26px;box-shadow:0 8px 24px rgba(0,0,0,.45);
    display:flex;align-items:center;justify-content:center;transition:transform .15s}
  .cb-botao:hover{transform:scale(1.08)}
  .cb-botao .cb-pulso{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#1faa53;border:2px solid #0c1015}
  .cb-janela{position:fixed;right:14px;bottom:88px;z-index:110;width:min(380px,calc(100vw - 28px));height:min(580px,calc(100vh - 120px));
    background:#141a22;border:1px solid rgba(255,255,255,.12);border-radius:18px;display:flex;flex-direction:column;overflow:hidden;
    box-shadow:0 18px 60px rgba(0,0,0,.6);font-family:'Segoe UI',system-ui,sans-serif}
  .cb-topo{background:linear-gradient(135deg,#f0c64a,#d4a017);color:#14181f;padding:13px 16px;display:flex;align-items:center;gap:10px}
  .cb-topo .cb-avatar{width:36px;height:36px;border-radius:50%;background:#14181f;color:#f0c64a;display:flex;align-items:center;justify-content:center;font-size:18px}
  .cb-topo strong{font-size:14.5px;display:block;line-height:1.2}
  .cb-topo small{font-size:11.5px;opacity:.8}
  .cb-topo button{margin-left:auto;background:none;border:0;font-size:18px;cursor:pointer;color:#14181f}
  .cb-corpo{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .cb-msg{max-width:86%;padding:10px 13px;border-radius:14px;font-size:13.8px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}
  .cb-msg.cb-bot{background:#1c242f;color:#e8ebef;border-bottom-left-radius:4px;align-self:flex-start}
  .cb-msg.cb-user{background:linear-gradient(135deg,#f0c64a,#d4a017);color:#14181f;border-bottom-right-radius:4px;align-self:flex-end;font-weight:600}
  .cb-msg.cb-bot a{color:#f0c64a}
  .cb-msg .cb-faixa{display:block;margin-top:6px;font-size:16px;font-weight:800;color:#f0c64a}
  .cb-chips{display:flex;flex-wrap:wrap;gap:7px;align-self:flex-start;max-width:95%}
  .cb-chips button{background:rgba(240,198,74,.12);border:1px solid rgba(240,198,74,.5);color:#f0c64a;border-radius:999px;
    padding:7px 13px;font-size:12.8px;font-weight:600;cursor:pointer;transition:background .15s}
  .cb-chips button:hover{background:rgba(240,198,74,.25)}
  .cb-digitando{align-self:flex-start;background:#1c242f;border-radius:14px;padding:12px 16px;display:flex;gap:4px}
  .cb-digitando span{width:7px;height:7px;border-radius:50%;background:#9aa3af;animation:cb-pula 1s infinite}
  .cb-digitando span:nth-child(2){animation-delay:.15s}
  .cb-digitando span:nth-child(3){animation-delay:.3s}
  @keyframes cb-pula{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-4px);opacity:1}}
  .cb-rodape{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08)}
  .cb-rodape input{flex:1;background:#1c242f;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:11px 12px;color:#e8ebef;font-size:14px}
  .cb-rodape input:focus{outline:2px solid rgba(212,160,23,.5)}
  .cb-rodape button{background:linear-gradient(135deg,#f0c64a,#d4a017);color:#14181f;border:0;border-radius:10px;width:44px;font-size:17px;cursor:pointer}
  .cb-oculto{display:none!important}
  @media (max-width:480px){.cb-janela{right:8px;bottom:80px}}
  `;

  let elJanela, elCorpo, elInput;

  function montar() {
    if (elJanela) return;
    const style = document.createElement('style');
    style.textContent = estilos;
    document.head.appendChild(style);

    const botao = document.createElement('button');
    botao.className = 'cb-botao';
    botao.title = 'Pré-orçamento online';
    botao.innerHTML = '🤖<span class="cb-pulso"></span>';
    botao.onclick = abrir;
    document.body.appendChild(botao);

    elJanela = document.createElement('div');
    elJanela.className = 'cb-janela cb-oculto';
    elJanela.innerHTML = `
      <div class="cb-topo">
        <div class="cb-avatar">🤖</div>
        <div><strong>Assistente AAC</strong><small>Pré-orçamento na hora · online</small></div>
        <button title="Fechar" id="cb-fechar">✕</button>
      </div>
      <div class="cb-corpo" id="cb-corpo"></div>
      <div class="cb-rodape">
        <input id="cb-input" placeholder="Digite sua dúvida ou problema..." maxlength="300">
        <button id="cb-enviar" title="Enviar">➤</button>
      </div>`;
    document.body.appendChild(elJanela);

    elCorpo = elJanela.querySelector('#cb-corpo');
    elInput = elJanela.querySelector('#cb-input');
    elJanela.querySelector('#cb-fechar').onclick = fechar;
    elJanela.querySelector('#cb-enviar').onclick = enviarTexto;
    elInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') enviarTexto(); });
  }

  let jaSaudou = false;

  function abrir() {
    if (!elJanela) montar();
    elJanela.classList.remove('cb-oculto');
    if (!jaSaudou) { jaSaudou = true; saudacao(); }
    elInput.focus();
  }

  function fechar() { elJanela.classList.add('cb-oculto'); }

  /* ---------- Mensagens ---------- */

  function rolar() { elCorpo.scrollTop = elCorpo.scrollHeight; }

  function userDiz(texto) {
    const el = document.createElement('div');
    el.className = 'cb-msg cb-user';
    el.textContent = texto;
    elCorpo.appendChild(el);
    rolar();
  }

  function botDiz(html, chips) {
    limparChips();
    const dig = document.createElement('div');
    dig.className = 'cb-digitando';
    dig.innerHTML = '<span></span><span></span><span></span>';
    elCorpo.appendChild(dig);
    rolar();

    setTimeout(() => {
      dig.remove();
      const el = document.createElement('div');
      el.className = 'cb-msg cb-bot';
      el.innerHTML = html;
      elCorpo.appendChild(el);
      if (chips && chips.length) {
        const c = document.createElement('div');
        c.className = 'cb-chips';
        chips.forEach(({ t, fn }) => {
          const b = document.createElement('button');
          b.textContent = t;
          b.onclick = () => { userDiz(t); fn(); };
          c.appendChild(b);
        });
        elCorpo.appendChild(c);
      }
      rolar();
    }, 480);
  }

  function limparChips() {
    elCorpo.querySelectorAll('.cb-chips').forEach((c) => c.remove());
  }

  /* ---------- Fluxo da conversa ---------- */

  function saudacao() {
    const nome = nomeCliente();
    botDiz(
      `Oi${nome ? ', <strong>' + cbEsc(nome) + '</strong>' : ''}! 👋 Sou o assistente virtual da AAC.\n` +
      `Posso calcular um <strong>pré-orçamento de conserto</strong> agora mesmo, ou tirar dúvidas sobre a loja. O que você precisa?`,
      chipsMenu()
    );
    ctx.etapa = 'menu';
  }

  function chipsMenu() {
    return [
      { t: '🔧 Pré-orçamento de conserto', fn: novoOrcamento },
      { t: '🛍️ Ver produtos da loja', fn: () => respostaFAQ('produtos') },
      { t: '🕓 Horário e endereço', fn: () => respostaFAQ('horario_endereco') },
      { t: '💬 Falar com atendente', fn: () => respostaFAQ('humano') },
    ];
  }

  function chipsVoltarMenu() {
    return [
      { t: '🔧 Fazer um pré-orçamento', fn: novoOrcamento },
      { t: '🏠 Menu inicial', fn: saudacao },
    ];
  }

  /* Começa um orçamento do zero (limpa o problema detectado antes) */
  function novoOrcamento() {
    ctx.servico = null;
    perguntarAparelho();
  }

  function perguntarAparelho() {
    ctx.etapa = 'aparelho';
    ctx.modelo = '';
    botDiz('Certo! Qual é o aparelho? 👇', Object.entries(TABELA_PRECOS).map(([chave, ap]) => ({
      t: `${ap.icone} ${ap.nome}`,
      fn: () => definirAparelho(chave),
    })));
  }

  function definirAparelho(chave) {
    ctx.aparelho = chave;
    if (chave === 'outro') {
      ctx.servico = 'geral';
      ctx.etapa = 'modelo';
      botDiz('Qual é o aparelho e o que está acontecendo com ele? Escreva aqui embaixo. ✍️');
      return;
    }
    ctx.etapa = 'modelo';
    botDiz(`Qual a <strong>marca e o modelo</strong>? (Ex.: Samsung A32, iPhone 11...)\nSe não souber o modelo exato, escreva só a marca. ✍️`);
  }

  function definirModelo(texto) {
    ctx.modelo = texto;
    if (ctx.servico && ctx.aparelho !== 'outro') {
      // Cliente já contou o problema antes — vai direto pro resultado
      mostrarResultado();
      return;
    }
    if (ctx.aparelho === 'outro') { mostrarResultado(); return; }
    perguntarProblema();
  }

  function perguntarProblema() {
    ctx.etapa = 'problema';
    const ap = TABELA_PRECOS[ctx.aparelho];
    const chips = Object.entries(ap.servicos).map(([chave, s]) => ({
      t: s.nome,
      fn: () => { ctx.servico = chave; mostrarResultado(); },
    }));
    chips.push({ t: '🤔 Outro problema', fn: () => {
      ctx.servico = null;
      botDiz('Sem problemas! Descreva com suas palavras o que está acontecendo com o aparelho. ✍️');
    }});
    botDiz(`E o que aconteceu com o ${ap.nome.toLowerCase()}? Escolha abaixo ou descreva com suas palavras. 👇`, chips);
  }

  function mostrarResultado() {
    ctx.etapa = 'resultado';
    const ap = TABELA_PRECOS[ctx.aparelho];
    const sv = ap.servicos[ctx.servico];

    let html;
    if (sv && sv.faixa) {
      html = `Prontinho! Aqui está sua estimativa: 📋\n` +
        `<strong>${ap.icone} ${cbEsc([ap.nome, ctx.modelo].filter(Boolean).join(' '))}</strong>\n` +
        `Serviço: <strong>${cbEsc(sv.nome)}</strong>` +
        `<span class="cb-faixa">${fmtBRL.format(sv.faixa[0])} a ${fmtBRL.format(sv.faixa[1])}</span>` +
        `⏱️ Prazo: ${cbEsc(sv.prazo)}.\n` +
        (sv.obs ? `💡 ${cbEsc(sv.obs)}\n` : '') +
        `\n⚠️ <em>Valores aproximados — o preço exato depende do modelo e é confirmado na avaliação <strong>gratuita</strong> na loja, sem compromisso.</em>`;
    } else {
      html = `Esse caso precisa de uma <strong>avaliação em bancada</strong> para dar um valor justo — e a avaliação é <strong>gratuita</strong>! 😉\n` +
        `<strong>${ap.icone} ${cbEsc([ap.nome, ctx.modelo].filter(Boolean).join(' '))}</strong>` +
        (sv ? `\nServiço: ${cbEsc(sv.nome)}\n⏱️ ${cbEsc(sv.prazo)}.` : '') +
        `\nTraga o aparelho na loja ou chame no WhatsApp que agilizamos para você.`;
    }

    botDiz(html, [
      { t: '📲 Enviar para o WhatsApp da loja', fn: enviarWhatsApp },
      { t: '🔁 Fazer outro orçamento', fn: novoOrcamento },
      { t: '🏠 Menu inicial', fn: saudacao },
    ]);
  }

  function enviarWhatsApp() {
    const ap = TABELA_PRECOS[ctx.aparelho] || {};
    const sv = ap.servicos ? ap.servicos[ctx.servico] : null;
    const nome = nomeCliente();
    const linhas = [
      'Olá! Fiz um pré-orçamento pelo site:',
      '',
      `▪ Aparelho: ${[ap.nome, ctx.modelo].filter(Boolean).join(' ')}`,
    ];
    if (sv) linhas.push(`▪ Serviço: ${sv.nome}`);
    if (sv && sv.faixa) linhas.push(`▪ Estimativa do site: ${fmtBRL.format(sv.faixa[0])} a ${fmtBRL.format(sv.faixa[1])}`);
    if (nome) linhas.push(`▪ Nome: ${nome}`);
    linhas.push('', 'Pode me confirmar o valor certinho?');
    window.open(`https://wa.me/${CB_WHATSAPP}?text=${encodeURIComponent(linhas.join('\n'))}`, '_blank');
    botDiz('Mensagem preparada! ✅ É só enviar lá no WhatsApp que nossa equipe responde rapidinho.', chipsVoltarMenu());
  }

  /* ---------- Perguntas frequentes ---------- */

  function respostaFAQ(tipo) {
    const respostas = {
      horario_endereco: `🕓 ${CB_HORARIO}\n📍 ${CB_ENDERECO}\n\n<a href="https://www.google.com/maps/search/?api=1&query=Rua+Tavares+de+Lyra,+3918+-+In%C3%A1,+S%C3%A3o+Jos%C3%A9+dos+Pinhais+-+PR" target="_blank" rel="noopener">Ver no mapa 🗺️</a>`,
      horario: `🕓 ${CB_HORARIO}`,
      endereco: `📍 ${CB_ENDERECO}\n\n<a href="https://www.google.com/maps/search/?api=1&query=Rua+Tavares+de+Lyra,+3918+-+In%C3%A1,+S%C3%A3o+Jos%C3%A9+dos+Pinhais+-+PR" target="_blank" rel="noopener">Ver no mapa 🗺️</a>`,
      garantia: '✅ Nossos serviços e produtos têm garantia! O prazo exato varia conforme o serviço/produto e vem escrito no seu recibo. Qualquer dúvida, é só chamar no WhatsApp.',
      pagamento: '💳 Aceitamos Pix, dinheiro, cartão de débito e crédito. Parcelamento disponível — consulte as condições na loja.',
      produtos: `🛍️ Temos celulares, fones, carregadores, capas, películas, caixas de som e muito mais!\n\n<a href="loja.html">Ver a loja virtual completa →</a>`,
      humano: `Claro! Nossa equipe atende pelo WhatsApp: 💬\n\n<a href="https://wa.me/${CB_WHATSAPP}?text=${encodeURIComponent('Olá! Vim pelo site e quero falar com um atendente.')}" target="_blank" rel="noopener">Chamar (41) 98459-0345 →</a>`,
    };
    botDiz(respostas[tipo] || respostas.humano, chipsVoltarMenu());
  }

  /* ---------- Interpretação de texto livre ---------- */

  function detectar(texto, tabela) {
    const t = ' ' + texto.toLowerCase() + ' ';
    for (const [chave, palavras] of Object.entries(tabela)) {
      if (palavras.some((p) => t.includes(p))) return chave;
    }
    return null;
  }

  function enviarTexto() {
    const texto = elInput.value.trim();
    if (!texto) return;
    elInput.value = '';
    userDiz(texto);
    processar(texto);
  }

  function processar(texto) {
    // O cliente está respondendo qual é o modelo do aparelho
    if (ctx.etapa === 'modelo') { definirModelo(texto); return; }

    // FAQ vale em qualquer etapa
    const faq = detectar(texto, PALAVRAS_FAQ);

    // Tentar entender aparelho e/ou problema na frase
    const servico = detectar(texto, PALAVRAS_SERVICO);
    const aparelho = detectar(texto, PALAVRAS_APARELHO);

    if (ctx.etapa === 'problema' && servico) {
      const ap = TABELA_PRECOS[ctx.aparelho];
      ctx.servico = ap.servicos[servico] ? servico : null;
      if (ctx.servico) { mostrarResultado(); return; }
      // Problema não se aplica ao aparelho escolhido (ex.: teclado em celular)
      botDiz('Hmm, esse problema eu prefiro que a nossa equipe avalie pessoalmente. A avaliação é gratuita! 😉', [
        { t: '📲 Chamar no WhatsApp', fn: () => respostaFAQ('humano') },
        ...chipsVoltarMenu(),
      ]);
      return;
    }

    if (servico || aparelho) {
      ctx.servico = servico;
      if (aparelho) {
        // Já sabemos o aparelho — falta só o modelo
        ctx.aparelho = aparelho;
        ctx.etapa = 'modelo';
        const ap = TABELA_PRECOS[aparelho];
        if (servico && !ap.servicos[servico]) ctx.servico = null;
        botDiz(`Entendi! ${ap.icone} E qual a <strong>marca e o modelo</strong> do ${ap.nome.toLowerCase()}? ✍️`);
      } else {
        perguntarAparelho();
      }
      return;
    }

    if (faq) { respostaFAQ(faq); return; }

    // Não entendeu — oferece o menu
    botDiz('Desculpe, não entendi muito bem. 😅 Você pode escolher uma opção abaixo ou descrever o problema do seu aparelho (ex.: "a tela do meu celular quebrou").', chipsMenu());
  }

  /* ---------- Início ---------- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }

  // Permite abrir o chat por um botão da página: onclick="ChatBot.abrir()"
  window.ChatBot = { abrir };
})();
