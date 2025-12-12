# API Calvão de Cria 🛒

![CI/CD Pipeline](https://github.com/GabrielJ10/api_calvao_de_cria/actions/workflows/ci-cd.yml/badge.svg)

API RESTful desenvolvida em **Node.js + Express**, simulando um sistema de e-commerce com funcionalidades de autenticação, carrinho, checkout, cupons de desconto, produtos e gestão de usuários.

---

## 🚀 Funcionalidades

-   Autenticação de usuários (login e registro)
-   CRUD de produtos
-   Gerenciamento de carrinho de compras
-   Checkout e pedidos
-   Aplicação de cupons de desconto
-   Administração de usuários, pedidos, produtos e métodos de pagamento

---

## 📦 Tecnologias utilizadas

-   [Node.js](https://nodejs.org/)
-   [Express](https://expressjs.com/)
-   MongoDB/Mongoose
-   Middlewares de autenticação e tratamento de erros

---

## ⚙️ Como rodar a aplicação

1.  **Clone este repositório**:
    ```bash
    git clone https://github.com/GabrielJ10/api_calvao_de_cria.git
    cd api_calvao_de_cria
    ```

2.  **Instale as dependências**:

    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente**:
    Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis:
    ```env
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/calvao_de_cria
    JWT_SECRET=sua_chave_secreta
    ```

4.  **Inicie a aplicação**:
    ```bash
    npm start
    ```

A API estará disponível em: `http://localhost:3000`

---

## 📂 Estrutura do projeto

```bash
src/
 ├── config/       # Configuração do banco de dados
 ├── controllers/  # Lógica das rotas
 ├── middlewares/  # Middlewares (auth, erros, etc)
 ├── models/       # Modelos do banco de dados
 ├── repositories/ # Regras de acesso aos dados
 ├── routes/       # Definição de rotas
 └── server.js     # Inicialização do servidor
```
---
## 🛠️ Scripts disponíveis
npm start: Inicia o servidor em modo de produção.

npm run dev: Inicia o servidor em modo de desenvolvimento (requer configuração com nodemon ou similar).

---
## ✅ Testes

- Framework: `Vitest` (configurado em `vitest.config.ts`).
- Estrutura de testes:
    - `tests/integration/` — testes de integração que usam `supertest` para chamar rotas e `mongodb-memory-server` para uma instância MongoDB em memória.
    - `tests/unit/` — testes unitários (services, utils, etc).
    - `tests/factories/` — fábricas utilizadas pelos testes para criar modelos sintéticos.
    - `tests/setup.ts` — configuração global (Mongo Memory Server, variáveis de ambiente usadas nos testes).

- Rodando os testes localmente (gera `test-report.json`):

    Linux/macOS (Linux shell):
    ```bash
    npm test
    # ou
    npx vitest --run --reporter json > test-report.json
    ```

    Windows (PowerShell):
    ```powershell
    npx vitest --run --reporter json > test-report.json
    ```

- Relatório: `npm test` foi configurado para gerar `test-report.json` na raiz do projeto (formato JSON, compatível com o script de notificação).

- Notificação via Google Chat:
    - Script: `scripts/google-chat-notify.js` — Node.js puro (usa `https` e `fs`) que lê `test-report.json`, calcula total, sucessos e falhas, e publica no webhook do Google Chat.
    - Execução manual (PowerShell):
    ```powershell
    $env:GOOGLE_CHAT_WEBHOOK_URL='https://chat.googleapis.com/...' ; node scripts/google-chat-notify.js test-report.json
    ```
    - O script também aceita a ausência da variável de ambiente e usa um webhook hardcoded como fallback.

- CI: O workflow do GitHub Actions está em `.github/workflows/ci-cd.yml`.
    - Ele instala dependências, roda linter, executa os testes (gerando `test-report.json`) e chama o script de notificação.
    - Para segurança, recomenda-se configurar `GOOGLE_CHAT_WEBHOOK_URL` como um `secret` no repositório do GitHub (Settings → Secrets → Actions).

---
