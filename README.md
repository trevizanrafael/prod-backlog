# FoodTech Backlog Management System

Sistema completo para gerenciamento de backlog de produtos, focado em priorização, controle de escopo e acompanhamento de tarefas para times de FoodTech.

## 🚀 Funcionalidades

- **Dashboard Analítico**: Visualização de estatísticas, métricas de gargalos, tendências mensais e tempo por escopo.
- **Gestão de Tarefas**:
  - Criação de tarefas com detalhamento de problema e solução.
  - Classificação por prioridade (High, Medium, Low) e complexidade.
  - Upload de screenshots/evidências para problemas e resoluções.
  - Timer para controle de tempo gasto (Time Tracking).
- **Gestão de Escopos**: Categorização de tarefas por áreas do projeto.
- **Controle de Acesso (RBAC)**:
  - Sistema de login com JWT.
  - Papéis de usuário: Admin, SuperUser, Visualizador.
  - Permissões granulares para edição e visualização.
- **Upload de Arquivos**: Armazenamento local de imagens e evidências.

## 🛠️ Tecnologias Utilizadas

**Backend**
- Node.js & Express
- PostgreSQL (Banco de Dados)
- JWT & BCrypt (Autenticação e Segurança)
- Multer (Gerenciamento de Uploads)

**Frontend**
- HTML5, CSS3, JavaScript (Vanilla)
- Design Responsivo
- Chart.js (Visualização de dados no Dashboard)

## ⚙️ Pré-requisitos

- Node.js (v14 ou superior)
- PostgreSQL instalado e rodando

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/prod-backlog.git
cd prod-backlog
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo [.env](cci:7://file:///c:/Users/rafae/Documents/GitHub/prod-backlog/.env:0:0-0:0) na raiz do projeto seguindo o modelo:

```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodtech_backlog
JWT_SECRET=seu_segredo_jwt
```

4. O sistema irá rodar as migrações do banco de dados automaticamente na primeira execução.

## ▶️ Como Rodar

Para ambiente de desenvolvimento (com auto-reload):
```bash
npm run dev
```

Para produção:
```bash
npm start
```

O servidor iniciará em `http://localhost:3000`.

## 📂 Estrutura do Projeto

- `/public`: Arquivos estáticos do frontend (HTML, CSS, JS modules).
- `/db`: Scripts de migração e conexão com o banco.
- `/uploads`: Diretório para armazenamento das imagens das tarefas.
- `server.js`: Ponto de entrada da aplicação e definição de rotas.
- `auth.js`: Middlewares de autenticação e lógica de segurança.

## 📝 Scripts Disponíveis

- `npm start`: Inicia o servidor de produção.
- `npm run dev`: Inicia o servidor com nodemon para desenvolvimento.
