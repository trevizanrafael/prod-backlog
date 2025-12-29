// Roles Module - Manage user types and permissions

async function loadRolesModule() {
  const mainContent = document.getElementById('mainContent');

  mainContent.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          <i class="fas fa-user-shield mr-3"></i>Tipos de Usuários
        </h1>
        <button onclick="openCreateRoleModal()" class="btn btn-primary">
          <i class="fas fa-plus mr-2"></i>Novo Tipo
        </button>
      </div>

      <!-- Roles List -->
      <div id="rolesList" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="spinner"></div>
      </div>
    </div>
  `;

  await loadRolesList();
}

async function loadRolesList() {
  const container = document.getElementById('rolesList');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    const roles = await apiGet('/roles');

    if (roles.length === 0) {
      container.innerHTML = `
        <div class="col-span-full card text-center py-12">
          <i class="fas fa-user-shield text-6xl text-gray-300 mb-4"></i>
          <p class="text-gray-500 text-lg">Nenhum tipo de usuário cadastrado.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = roles.map(role => createRoleCard(role)).join('');
  } catch (error) {
    container.innerHTML = `
      <div class="col-span-full card text-center text-red-500">
        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p>Erro ao carregar tipos de usuários.</p>
      </div>
    `;
  }
}

function createRoleCard(role) {
  const permissions = typeof role.permissions === 'string'
    ? JSON.parse(role.permissions)
    : role.permissions;

  const permissionLabels = {
    view_dashboard: 'Ver Dashboard/Tasks',
    create_task: 'Criar Tasks',
    edit_task: 'Editar Tasks',
    set_priority: 'Definir Prioridade/Prazo',
    manage_scopes: 'Criar/Editar Escopos',
    archive_task: 'Arquivar Tasks',
    delete_task: 'Deletar Tasks',
    system_settings: 'Configurações de Sistema',
    manage_users: 'Gerenciar Usuários'
  };

  const enabledPermissions = Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key, _]) => permissionLabels[key] || key);

  const isSystemRole = role.name === 'Admin' || role.name === 'Visualizador';

  return `
    <div class="card">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-xl font-bold text-gray-900">${role.name}</h3>
          ${isSystemRole ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Sistema</span>' : ''}
        </div>
        ${!isSystemRole ? `
          <div class="flex gap-2">
            <button onclick="editRole(${role.id})" class="text-blue-600 hover:text-blue-800" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteRole(${role.id}, '${role.name}')" class="text-red-600 hover:text-red-800" title="Deletar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        ` : ''}
      </div>

      <div class="border-t pt-4">
        <p class="text-sm font-semibold text-gray-700 mb-2">Permissões:</p>
        <div class="space-y-1">
          ${enabledPermissions.length > 0
      ? enabledPermissions.map(p => `
              <div class="flex items-center text-sm text-gray-600">
                <i class="fas fa-check text-green-600 mr-2"></i>
                ${p}
              </div>
            `).join('')
      : '<p class="text-sm text-gray-500 italic">Nenhuma permissão</p>'
    }
        </div>
      </div>
    </div>
  `;
}

function openCreateRoleModal() {
  const modalHtml = `
    <div id="roleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-bold text-white">Novo Tipo de Usuário</h3>
          <button onclick="closeRoleModal()" class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="roleForm" class="p-6" onsubmit="submitRole(event)">
          <div class="mb-6">
            <label class="form-label">Nome do Tipo *</label>
            <input type="text" id="roleName" class="form-input" placeholder="Ex: Editor, Gerente, etc." required>
          </div>

          <div class="mb-6">
            <label class="form-label mb-3">Permissões</label>
            <div class="space-y-3">
              ${createPermissionCheckbox('create_task', 'Criar Tasks')}
              ${createPermissionCheckbox('edit_task', 'Editar Tasks (Status/Notas)')}
              ${createPermissionCheckbox('manage_scopes', 'Criar/Editar Escopos')}
              ${createPermissionCheckbox('delete_task', 'Deletar Tasks (Permanente)')}
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" onclick="closeRoleModal()" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save mr-2"></i>Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function createPermissionCheckbox(key, label) {
  return `
    <label class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
      <input type="checkbox" name="permission_${key}" class="w-5 h-5 text-blue-600 rounded mr-3">
      <span class="text-gray-700">${label}</span>
    </label>
  `;
}

async function submitRole(e) {
  e.preventDefault();
  const form = e.target;
  const name = document.getElementById('roleName').value;

  // Collect permissions
  const permissions = {};
  const permissionKeys = [
    'create_task', 'edit_task', 'manage_scopes', 'delete_task'
  ];

  permissionKeys.forEach(key => {
    permissions[key] = form.querySelector(`[name="permission_${key}"]`).checked;
  });

  try {
    await apiPost('/roles', { name, permissions });
    showNotification('Tipo de usuário criado com sucesso!', 'success');
    closeRoleModal();
    loadRolesList();
  } catch (error) {
    showNotification('Erro ao criar tipo de usuário', 'error');
  }
}

async function editRole(roleId) {
  try {
    const roles = await apiGet('/roles');
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const permissions = typeof role.permissions === 'string'
      ? JSON.parse(role.permissions)
      : role.permissions;

    const modalHtml = `
      <div id="roleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <h3 class="text-xl font-bold text-white">Editar Tipo de Usuário</h3>
            <button onclick="closeRoleModal()" class="text-white hover:text-gray-200">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form id="roleForm" class="p-6" onsubmit="updateRole(event, ${roleId})">
            <div class="mb-6">
              <label class="form-label">Nome do Tipo *</label>
              <input type="text" id="roleName" class="form-input" value="${role.name}" required>
            </div>

            <div class="mb-6">
              <label class="form-label mb-3">Permissões</label>
              <div class="space-y-3">
                ${createPermissionCheckbox('create_task', 'Criar Tasks')}
                ${createPermissionCheckbox('edit_task', 'Editar Tasks (Status/Notas)')}
                ${createPermissionCheckbox('manage_scopes', 'Criar/Editar Escopos')}
                ${createPermissionCheckbox('delete_task', 'Deletar Tasks (Permanente)')}
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" onclick="closeRoleModal()" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save mr-2"></i>Atualizar
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Set checkboxes based on current permissions
    Object.entries(permissions).forEach(([key, value]) => {
      const checkbox = document.querySelector(`[name="permission_${key}"]`);
      if (checkbox) checkbox.checked = value;
    });
  } catch (error) {
    showNotification('Erro ao carregar tipo de usuário', 'error');
  }
}

async function updateRole(e, roleId) {
  e.preventDefault();
  const form = e.target;
  const name = document.getElementById('roleName').value;

  // Collect permissions
  const permissions = {};
  const permissionKeys = [
    'create_task', 'edit_task', 'manage_scopes', 'delete_task'
  ];

  permissionKeys.forEach(key => {
    permissions[key] = form.querySelector(`[name="permission_${key}"]`).checked;
  });

  try {
    await apiPut(`/roles/${roleId}`, { name, permissions });
    showNotification('Tipo de usuário atualizado com sucesso!', 'success');
    closeRoleModal();
    loadRolesList();
  } catch (error) {
    showNotification('Erro ao atualizar tipo de usuário', 'error');
  }
}

async function deleteRole(roleId, roleName) {
  if (!confirmDialog(`Tem certeza que deseja deletar o tipo "${roleName}"?\n\nUsuários com este tipo precisarão ser reatribuídos.`)) {
    return;
  }

  try {
    await apiDelete(`/roles/${roleId}`);
    showNotification('Tipo de usuário deletado com sucesso!', 'success');
    loadRolesList();
  } catch (error) {
    showNotification('Erro ao deletar tipo de usuário. Verifique se não há usuários associados.', 'error');
  }
}

function closeRoleModal() {
  const modal = document.getElementById('roleModal');
  if (modal) modal.remove();
}
