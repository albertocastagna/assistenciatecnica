/* ============================================================
   AAC Assistência Técnica — Camada de dados (IndexedDB)
   Armazena clientes, ordens de serviço, produtos e vendas
   de forma persistente no navegador (incluindo fotos em Blob).
   ============================================================ */

const DB_NOME = 'aac_gestao';
const DB_VERSAO = 1;
let _db = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NOME, DB_VERSAO);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('clientes')) {
        const s = db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('nome', 'nome', { unique: false });
      }
      if (!db.objectStoreNames.contains('ordens')) {
        const s = db.createObjectStore('ordens', { keyPath: 'id', autoIncrement: true });
        s.createIndex('clienteId', 'clienteId', { unique: false });
        s.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains('produtos')) {
        const s = db.createObjectStore('produtos', { keyPath: 'id', autoIncrement: true });
        s.createIndex('nome', 'nome', { unique: false });
        s.createIndex('codigoBarras', 'codigoBarras', { unique: false });
      }
      if (!db.objectStoreNames.contains('vendas')) {
        const s = db.createObjectStore('vendas', { keyPath: 'id', autoIncrement: true });
        s.createIndex('clienteId', 'clienteId', { unique: false });
      }
    };

    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function _tx(store, modo, fn) {
  return abrirDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, modo);
    const os = tx.objectStore(store);
    const req = fn(os);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function dbAdicionar(store, obj) { return _tx(store, 'readwrite', (os) => os.add(obj)); }
function dbSalvar(store, obj)    { return _tx(store, 'readwrite', (os) => os.put(obj)); }
function dbObter(store, id)      { return _tx(store, 'readonly',  (os) => os.get(id)); }
function dbListar(store)         { return _tx(store, 'readonly',  (os) => os.getAll()); }
function dbExcluir(store, id)    { return _tx(store, 'readwrite', (os) => os.delete(id)); }
function dbLimpar(store)         { return _tx(store, 'readwrite', (os) => os.clear()); }
