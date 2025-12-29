// Scopes Module - Manage scopes

async function loadScopesModule() {
  // Check permission
  if (!hasPermission('manage_scopes')) {
    showPermissionDenied('criar/editar escopos', 'manage_scopes');
    loadModule('task-list');
    return;
  }

  const mainContent = document.getElementById('mainContent');

  mainContent.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-white mb-8">
        <i class="fas fa-folder-plus mr-3 text-primary-400"></i>Gerenciar Escopos
      </h1>
      
      <!-- Create New Scope -->
      <div class="card mb-8 bg-dark-800/80 backdrop-blur-sm border border-white/5">
        <h2 class="text-xl font-semibold text-white mb-4">
          Criar Novo Escopo
        </h2>
        <form id="scopeForm" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label text-gray-300">
                <i class="fas fa-tag mr-2 text-primary-400"></i>Nome do Escopo *
              </label>
              <input type="text" id="scopeName" class="form-input bg-dark-900 border-white/10 text-white focus:border-primary-500" required placeholder="Ex: Backend, Frontend, DevOps">
            </div>
            <div class="form-group md:col-span-2">
              <label class="form-label text-gray-300">
                <i class="fas fa-align-left mr-2 text-primary-400"></i>Descrição
              </label>
              <textarea id="scopeDescription" class="form-textarea bg-dark-900 border-white/10 text-white focus:border-primary-500" rows="2" placeholder="Descrição opcional do escopo..."></textarea>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-plus"></i> Criar Escopo
          </button>
        </form>
      </div>
      
      <!-- Scopes List -->
      <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5">
        <h2 class="text-xl font-semibold text-white mb-4">
          Escopos Existentes
        </h2>
        <div id="scopesList"></div>
      </div>
    </div>
  `;

  // Load scopes list
  await loadScopesList();

  // Handle form submission
  document.getElementById('scopeForm').addEventListener('submit', handleScopeSubmit);
}

async function loadScopesList() {
  const listContainer = document.getElementById('scopesList');

  try {
    const scopes = await apiGet('/scopes');

    if (scopes.length === 0) {
      listContainer.innerHTML = `
        <p class="text-center text-gray-400 py-8">
          Nenhum escopo cadastrado ainda.
        </p>
      `;
      return;
    }

    listContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${scopes.map(scope => `
          <div class="bg-dark-900/50 backdrop-blur-sm rounded-xl p-6 border border-white/5 hover:border-primary-500/30 transition-all hover:shadow-lg group">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-lg text-white group-hover:text-primary-400 transition-colors">
                ${scope.name}
              </h3>
              <span class="text-xs text-gray-500 font-mono">
                #${scope.id}
              </span>
            </div>
            ${scope.description ? `
              <p class="text-sm text-gray-400 mb-4 h-10 overflow-hidden text-ellipsis">
                ${scope.description}
              </p>
            ` : ''}
            <div class="text-xs text-gray-500 mb-4">
              Criado em: ${formatDate(scope.created_at)}
            </div>
            <div class="flex gap-2">
              <button onclick="editScope(${scope.id}, '${scope.name.replace(/'/g, "\\'")}', '${(scope.description || '').replace(/'/g, "\\'")}' )" class="btn btn-secondary text-xs py-1 px-3">
                <i class="fas fa-edit"></i> Editar
              </button>
              <button onclick="deleteScope(${scope.id})" class="btn btn-danger text-xs py-1 px-3">
                <i class="fas fa-trash"></i> Deletar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) {
    listContainer.innerHTML = `
      <p class="text-center text-red-400 py-8">
        Erro ao carregar escopos.
      </p>
    `;
  }
}

async function handleScopeSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

  try {
    const scopeData = {
      name: document.getElementById('scopeName').value,
      description: document.getElementById('scopeDescription').value,
    };

    await apiPost('/scopes', scopeData);

    showNotification('Escopo criado com sucesso!', 'success');

    // Reset form
    document.getElementById('scopeForm').reset();

    // Reload list
    await loadScopesList();
  } catch (error) {
    showNotification('Erro ao criar escopo', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Criar Escopo';
  }
}

async function editScope(id, name, description) {
  const newName = prompt('Nome do escopo:', name);
  if (!newName) return;

  const newDescription = prompt('Descrição:', description);

  try {
    await apiPut(`/scopes/${id}`, {
      name: newName,
      description: newDescription || '',
    });

    showNotification('Escopo atualizado com sucesso!', 'success');
    await loadScopesList();
  } catch (error) {
    showNotification('Erro ao atualizar escopo', 'error');
  }
}

async function deleteScope(id) {
  if (!confirmDialog('Tem certeza que deseja deletar este escopo? As tasks associadas não serão deletadas, apenas perderão a associação com o escopo.')) {
    return;
  }

  try {
    await apiDelete(`/scopes/${id}`);
    showNotification('Escopo deletado com sucesso!', 'success');
    await loadScopesList();
  } catch (error) {
    showNotification('Erro ao deletar escopo', 'error');
  }
}
