AAC ASSISTÊNCIA TÉCNICA ESPECIALIZADA — SITE + LOJA + SISTEMA
==============================================================

AS PÁGINAS
----------
1) index.html ........ Site da loja (clientes) — com chatbot de orçamento
2) loja.html ......... Loja virtual (catálogo de produtos + carrinho)
3) login.html ........ Entrar / criar conta (clientes e administradores)
4) sistema.html ...... Sistema de gestão (SÓ para administradores logados)

COMO USAR
---------
- Dê dois cliques em "index.html" para abrir o site da loja.
- Recomendado: usar o Google Chrome ou Microsoft Edge.

LOGIN E CONTAS
--------------
- Conta padrão de ADMINISTRADOR: usuário "admin", senha "admin123".
  >>> TROQUE A SENHA assim que possível (no arquivo js/auth.js você
  também pode trocar o código de admin, que hoje é "AAC2026").
- CLIENTES criam a própria conta em "Entrar > Criar conta".
- Quem se cadastrar informando o CÓDIGO DE ADMINISTRADOR (AAC2026)
  vira administrador. Passe esse código só para pessoas de confiança.
- O sistema (sistema.html) agora exige login de administrador.

LOJA VIRTUAL (loja.html)
------------------------
- Clientes veem os produtos com fotos, filtram por categoria
  (celulares, periféricos, acessórios...), buscam por nome e montam
  o CARRINHO. O pedido é finalizado pelo WhatsApp da loja.
- ADMIN logado vê botões extras na própria loja:
  ➕ Cadastrar produto (com fotos) · ✏️ Editar · 🗑️ Excluir
  📤 Publicar catálogo (veja abaixo)
- Os produtos são os MESMOS do sistema de gestão (aba Produtos).

COMO OS CLIENTES VEEM OS PRODUTOS NA INTERNET
---------------------------------------------
Os produtos ficam salvos no navegador onde foram cadastrados.
Para aparecerem no site publicado na internet:
1. Na loja virtual, logado como admin, clique em "📤 Publicar catálogo".
2. Coloque o arquivo baixado (catalogo.json) na pasta "data" do site.
3. Publique o site de novo (Vercel / Netlify / GitHub Pages).
Repita sempre que mudar os produtos. O preço de custo NÃO é publicado.

CHATBOT DE PRÉ-ORÇAMENTO 🤖
---------------------------
- Botão flutuante no site e na loja. Ele pergunta o aparelho, o
  modelo e o problema, e responde com uma FAIXA DE PREÇO estimada,
  prazo típico e botão para mandar tudo para o WhatsApp da loja.
- Também responde horário, endereço, garantia e formas de pagamento.
- IMPORTANTE: os valores são EXEMPLOS! Edite a TABELA_PRECOS no
  começo do arquivo "js/chatbot.js" com os preços reais da loja.
- Ele funciona sem servidor e sem mensalidade (as respostas são
  regras inteligentes no próprio site, não uma IA paga na nuvem).

O SISTEMA (sistema.html) TEM:
-----------------------------
- DASHBOARD: resumo das OS, vendas do dia, faturamento e estoque baixo.
- ORDENS DE SERVIÇO: abertura com fotos, orçamento, status e recibos.
- VENDAS (PDV): carrinho, desconto, pagamento e baixa de estoque.
- PRODUTOS: cadastro com fotos, preços, estoque e código de barras.
- CLIENTES: cadastro completo com histórico.
- BACKUP: baixar e restaurar todos os dados em um arquivo .json.

ONDE FICAM OS DADOS?
--------------------
Os dados (incluindo fotos e contas de usuário) ficam salvos no
PRÓPRIO NAVEGADOR do aparelho onde são usados (IndexedDB e
localStorage). Eles NÃO somem ao fechar o navegador.

ATENÇÃO:
- Se limpar os dados de navegação, os dados podem ser apagados.
  Use a aba BACKUP do sistema toda semana e guarde o arquivo no
  Google Drive ou em um pen drive.
- Cada aparelho/navegador tem os seus próprios dados. Para levar
  para outro computador, baixe o backup em um e restaure no outro.
- As contas de login também são por navegador: o login serve para
  organizar o acesso, mas não é um servidor central com segurança
  de banco — não guarde senhas importantes que você usa em outros
  lugares.

PARA COLOCAR O SITE NA INTERNET
-------------------------------
Envie esta pasta para Vercel, Netlify ou GitHub Pages (grátis).
Lembre-se de incluir o arquivo "data/catalogo.json" para os
produtos aparecerem para os clientes.
