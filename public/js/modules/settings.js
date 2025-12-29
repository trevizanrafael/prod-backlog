// Settings Module - Manage application data

async function loadSettingsModule() {
  const mainContent = document.getElementById('mainContent');
  const isVisitor = localStorage.getItem('isVisitor') === 'true';

  // Check if user is SuperUser
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isSuperUser = user && user.username === 'SuperUser';

  // Data management section - only for SuperUser
  const dataManagementHtml = isSuperUser ? `
    <div class="card mb-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
        <i class="fas fa-database mr-2"></i>Gerenciamento de Dados
      </h2>
      
      <div class="space-y-6">
        <!-- Clear Tasks -->
        <div class="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
          <div>
            <h3 class="font-bold text-red-800">Apagar Todas as Tasks</h3>
            <p class="text-sm text-red-600">
              Esta ação irá remover permanentemente todas as tasks e seus screenshots.
              <br><strong>Esta ação não pode ser desfeita.</strong>
            </p>
          </div>
          <button onclick="deleteAllTasks()" class="btn btn-danger">
            <i class="fas fa-trash-alt mr-2"></i> Apagar Tasks
          </button>
        </div>
        
        <!-- Clear Scopes -->
        <div class="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
          <div>
            <h3 class="font-bold text-orange-800">Apagar Todos os Escopos</h3>
            <p class="text-sm text-orange-600">
              Esta ação irá remover todos os escopos cadastrados.
              <br>As tasks associadas ficarão sem escopo.
            </p>
          </div>
          <button onclick="deleteAllScopes()" class="btn btn-warning">
            <i class="fas fa-folder-minus mr-2"></i> Apagar Escopos
          </button>
        </div>

        <!-- Clear Users -->
        <div class="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div>
            <h3 class="font-bold text-purple-800">Apagar Todos os Usuários</h3>
            <p class="text-sm text-purple-600">
              Esta ação irá remover todos os usuários (exceto você e o SuperUser).
              <br><strong>Esta ação não pode ser desfeita.</strong>
            </p>
          </div>
          <button onclick="deleteAllUsers()" class="btn btn-danger" style="background-color: #7e22ce;">
            <i class="fas fa-users-slash mr-2"></i> Apagar Usuários
          </button>
        </div>
      </div>
    </div>
  ` : '';

  mainContent.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">
        <i class="fas fa-cog mr-3"></i>Configurações
      </h1>
      
      ${dataManagementHtml}
      
      <div class="card">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
          <i class="fas fa-info-circle mr-2"></i>Sobre
        </h2>
        <div class="text-gray-600">
          <p class="mb-2"><strong>FoodTech Backlog Management</strong></p>
          <p class="mb-2">Versão 1.0.0</p>
          <p>Sistema desenvolvido para gerenciamento eficiente de tarefas e backlog.</p>
        </div>
      </div>
      <div class="card mt-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
          <i class="fas fa-sign-out-alt mr-2"></i>Sair
        </h2>
        <div class="flex items-center justify-between">
          <p class="text-gray-600">Deseja sair da sua conta?</p>
          <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            <i class="fas fa-sign-out-alt mr-2"></i>Sair
          </button>
        </div>
      </div>
    </div>
  `;
}

async function deleteAllTasks() {
  if (!confirmDialog('ATENÇÃO: Tem certeza absoluta que deseja apagar TODAS as tasks? Esta ação é irreversível!')) {
    return;
  }

  // Double confirmation
  if (!confirmDialog('Confirme novamente: Você realmente quer apagar todo o histórico de tasks?')) {
    return;
  }

  try {
    await apiDelete('/tasks');
    showNotification('Todas as tasks foram apagadas com sucesso!', 'success');
  } catch (error) {
    showNotification('Erro ao apagar tasks', 'error');
  }
}

async function deleteAllScopes() {
  if (!confirmDialog('Tem certeza que deseja apagar todos os escopos?')) {
    return;
  }

  try {
    await apiDelete('/scopes');
    showNotification('Todos os escopos foram apagados com sucesso!', 'success');
  } catch (error) {
    showNotification('Erro ao apagar escopos', 'error');
  }
}

async function deleteAllUsers() {
  if (!confirmDialog('ATENÇÃO: Tem certeza que deseja apagar TODOS os usuários?')) {
    return;
  }

  try {
    await apiDelete('/users');
    showNotification('Usuários apagados com sucesso!', 'success');
  } catch (error) {
    showNotification('Erro ao apagar usuários', 'error');
  }
}
