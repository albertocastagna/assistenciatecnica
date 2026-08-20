/* ============================================================
   AAC Assistência Técnica — Contas e login (front-end)
   Os usuários e a sessão ficam salvos no localStorage DESTE
   navegador. Isso controla o acesso às telas do site, mas não
   substitui um servidor com autenticação real — não guarde
   segredos importantes aqui.
   ============================================================ */

const AUTH_USUARIOS = 'aac_usuarios';
const AUTH_SESSAO = 'aac_sessao';

// Quem se cadastrar informando este código vira ADMINISTRADOR.
// Troque por um código só seu e passe apenas para pessoas de confiança.
const AUTH_CODIGO_ADMIN = 'AAC2026';

function authUsuarios() {
  try { return JSON.parse(localStorage.getItem(AUTH_USUARIOS)) || []; }
  catch { return []; }
}

function _authSalvarUsuarios(lista) {
  localStorage.setItem(AUTH_USUARIOS, JSON.stringify(lista));
}

async function _authHash(senha) {
  const texto = 'aac|' + senha;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Navegadores sem crypto.subtle (contextos não seguros)
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return 'x' + h.toString(16);
}

/* Cria a conta padrão de administrador na primeira utilização:
   usuário "admin", senha "admin123". Troque a senha após entrar. */
async function authGarantirAdminPadrao() {
  const usuarios = authUsuarios();
  if (usuarios.some((u) => u.tipo === 'admin')) return;
  usuarios.push({
    id: Date.now(),
    nome: 'Administrador',
    usuario: 'admin',
    hash: await _authHash('admin123'),
    tipo: 'admin',
    criadoEm: new Date().toISOString(),
  });
  _authSalvarUsuarios(usuarios);
}

async function authCadastrar({ nome, usuario, senha, codigoAdmin }) {
  nome = (nome || '').trim();
  usuario = (usuario || '').trim().toLowerCase();
  if (!nome || !usuario || !senha) throw new Error('Preencha nome, usuário e senha.');
  if (usuario.length < 3) throw new Error('O usuário precisa ter pelo menos 3 letras.');
  if (senha.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.');

  await authGarantirAdminPadrao();
  const usuarios = authUsuarios();
  if (usuarios.some((u) => u.usuario === usuario)) throw new Error('Este usuário já existe. Escolha outro.');

  let tipo = 'cliente';
  if ((codigoAdmin || '').trim()) {
    if (codigoAdmin.trim() !== AUTH_CODIGO_ADMIN) throw new Error('Código de administrador incorreto.');
    tipo = 'admin';
  }

  usuarios.push({
    id: Date.now(), nome, usuario,
    hash: await _authHash(senha),
    tipo, criadoEm: new Date().toISOString(),
  });
  _authSalvarUsuarios(usuarios);
  return authEntrar(usuario, senha);
}

async function authEntrar(usuario, senha) {
  await authGarantirAdminPadrao();
  usuario = (usuario || '').trim().toLowerCase();
  const u = authUsuarios().find((x) => x.usuario === usuario);
  if (!u || u.hash !== await _authHash(senha || '')) throw new Error('Usuário ou senha incorretos.');
  const sessao = { usuario: u.usuario, nome: u.nome, tipo: u.tipo, entradaEm: new Date().toISOString() };
  localStorage.setItem(AUTH_SESSAO, JSON.stringify(sessao));
  return sessao;
}

async function authTrocarSenha(usuario, senhaAtual, novaSenha) {
  usuario = (usuario || '').trim().toLowerCase();
  if ((novaSenha || '').length < 4) throw new Error('A nova senha precisa ter pelo menos 4 caracteres.');
  await authGarantirAdminPadrao();
  const usuarios = authUsuarios();
  const u = usuarios.find((x) => x.usuario === usuario);
  if (!u || u.hash !== await _authHash(senhaAtual || '')) throw new Error('Usuário ou senha atual incorretos.');
  u.hash = await _authHash(novaSenha);
  _authSalvarUsuarios(usuarios);
}

function authSair() { localStorage.removeItem(AUTH_SESSAO); }

function authSessao() {
  try { return JSON.parse(localStorage.getItem(AUTH_SESSAO)); }
  catch { return null; }
}

function authEhAdmin() {
  const s = authSessao();
  return !!s && s.tipo === 'admin';
}
