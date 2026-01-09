# FoodTech Backlog & Productivity Ecosystem

Sistema integrado para alta produtividade de times FoodTech, combinando gerenciamento de backlog, quadro Kanban, armazenamento de arquivos, videochamadas e documentação em uma única plataforma com design premium **Glassmorphism**.

## 🚀 Módulos & Funcionalidades

### 1. 📊 Dashboard & Backlog (Core)
*   **Estatísticas em Tempo Real**: Métricas de gargalos, visão mensal e distribuição por escopo usando Chart.js.
*   **Gestão de Tarefas Completa**:
    *   Priorização (High, Medium, Low) e Complexidade.
    *   Upload de evidências/screenshots.
    *   **Time Tracking**: Cronômetro integrado para cada task.
*   **Kanban Board**: Drag-and-drop intuitivo com colunas personalizadas (Pendente, Em Progresso, Code Review, Concluído).

### 2. ☁️ Personal Drive (FoodTech Documents)
*   **Gestão de Arquivos**: Interface estilo Explorador de Arquivos para upload e organização de documentos.
*   **Funcionalidades Avançadas**:
    *   Navegação por pastas (Breadcrumbs).
    *   Visualização de thumbnails para imagens.
    *   **Menu de Contexto Personalizado** (Botão direito).
    *   Modais estilizados para criação, renomeação e exclusão.
    *   **Animações fluidas** de navegação.

### 3. 📹 FoodTech Meet
*   **Videochamadas Integradas**: Salas de reunião virtuais diretamente no navegador.
*   **Tecnologia WebRTC + Socket.io**: Comunicação em tempo real de baixa latência.
*   **Chat em Tempo Real**: Mensagens instantâneas durante as chamadas.
*   **Controles de Mídia**: Mute/Unmute audio e vídeo, compartilhamento de tela (preparado).

### 4. 📝 Editor Markdown
*   **Anotações Rápidas**: Bloco de notas com suporte a Markdown (Github Flavor).
*   **Preview em Tempo Real**: Visualize a formatação enquanto digita.

### 5. 🔐 Segurança & Controle (RBAC)
*   **Autenticação JWT**: Sessões seguras e persistentes.
*   **Níveis de Acesso**:
    *   **Admin/SuperUser**: Controle total (Gerenciar Usuários, Roles).
    *   **Membro**: Acesso a tarefas e drive pessoal.
    *   **Isolamento de Dados**: Usuários veem apenas seus próprios arquivos no Drive.

---

## 🛠️ Stack Tecnológico

**Backend**
*   **Node.js & Express**: API RESTful robusta.
*   **PostgreSQL**: Banco de dados relacional para dados estruturados.
*   **Socket.io**: Comunicação WebSocket para o Meet e notificações.
*   **Multer**: Upload e armazenamento seguro de arquivos no servidor.
*   **BCrypt & JWT**: Criptografia e autenticação stateless.

**Frontend**
*   **Tailwind CSS**: Framework de utilitários para o design system.
*   **Glassmorphism UI**: Estilo visual translúcido, moderno e responsivo.
*   **Axios**: Cliente HTTP para comunicação com API.
*   **FontAwesome**: Íconografia vetorial.

---

## ⚙️ Configuração e Instalação

### Pré-requisitos
*   Node.js (v18+)
*   PostgreSQL

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/prod-backlog.git
   cd prod-backlog
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o Ambiente (.env)**
   Crie um arquivo `.env` na raiz com base no `.env.example`:
   ```env
   PORT=3000
   DATABASE_URL=postgres://user:pass@localhost:5432/foodtech_db
   JWT_SECRET=sua_chave_aqui_0183813
   # Variáveis legadas (opcional se usar DATABASE_URL)
   DB_HOST=localhost
   DB_PORT=5432
   # ...
   ```

4. **Inicie o Servidor**
   O sistema cria as tabelas automaticamente na primeira execução.
   ```bash
   npm start
   ```

5. **Acesse**
   Abra `http://localhost:3000` no seu navegador.

---

## 📂 Estrutura de Pastas

*   **`public/`**: Frontend estático (HTML, CSS, JS).
    *   `drive.html`: Módulo Drive.
    *   `meet.html`: Módulo Meet.
    *   `js/`: Lógica client-side modularizada.
*   **`server.js`**: Core da aplicação, rotas API e configuração Socket.io.
*   **`db/`**: Scripts de banco de dados e migrações.
*   **`drive_storage/`**: Armazenamento privado de arquivos do Drive.
