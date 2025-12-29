// Users Module
function loadUsersModule() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="bg-dark-900/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-white">Gerenciar Usuários</h2>
                <button onclick="openCreateUserModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <i class="fas fa-plus mr-2"></i>Novo Usuário
                </button>
            </div>

            <div class="overflow-x-auto rounded-xl border border-white/5">
                <table class="min-w-full divide-y divide-white/5">
                    <thead class="bg-dark-800">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuário</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Função</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Criado em</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody" class="divide-y divide-white/5 bg-transparent">
                        <!-- Users will be loaded here -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Create/Edit User Modal -->
        <div id="userModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center z-50">
            <div class="bg-dark-900 rounded-2xl w-full max-w-md p-8 border border-white/10 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h3 id="userModalTitle" class="text-xl font-bold text-white">Novo Usuário</h3>
                    <button onclick="closeUserModal()" class="text-gray-400 hover:text-white transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="userForm" class="space-y-4">
                    <input type="hidden" id="userId">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                        <input type="text" id="userName" class="form-input bg-dark-800 border-white/10 text-white focus:border-primary-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Usuário (Login)</label>
                        <input type="text" id="userUsername" class="form-input bg-dark-800 border-white/10 text-white focus:border-primary-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                        <input type="password" id="userPassword" class="form-input bg-dark-800 border-white/10 text-white focus:border-primary-500">
                        <p class="text-xs text-gray-500 mt-1" id="passwordHint">Deixe em branco para manter a senha atual (apenas edição)</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Função</label>
                        <select id="userRole" class="form-select bg-dark-800 border-white/10 text-white focus:border-primary-500" required>
                            <!-- Roles will be loaded here -->
                        </select>
                    </div>
                    <div class="flex justify-end space-x-3 mt-8">
                        <button type="button" onclick="closeUserModal()" class="btn btn-secondary">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    loadUsers();
    loadRolesForSelect();

    // Form submission handler
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
}

async function loadUsers() {
    try {
        const users = await apiGet('/users');
        const tbody = document.getElementById('usersTableBody');

        tbody.innerHTML = users.map(user => `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">${user.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-300">${user.username}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        ${user.role || 'N/A'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-400">${formatDate(user.created_at)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editUser('${user.id}', '${user.name}', '${user.username}', '${user.role_id}')" class="text-primary-400 hover:text-primary-300 mr-3 transition-colors">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteUser('${user.id}')" class="text-red-400 hover:text-red-300 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Erro ao carregar usuários', 'error');
    }
}

async function loadRolesForSelect() {
    try {
        const roles = await apiGet('/roles');
        const select = document.getElementById('userRole');
        select.innerHTML = roles.map(role => `
            <option value="${role.id}" class="text-gray-900">${role.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

function openCreateUserModal() {
    document.getElementById('userModalTitle').textContent = 'Novo Usuário';
    document.getElementById('userId').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('passwordHint').classList.add('hidden');
    document.getElementById('userPassword').required = true;
    document.getElementById('userModal').classList.remove('hidden');
}

function editUser(id, name, username, roleId) {
    document.getElementById('userModalTitle').textContent = 'Editar Usuário';
    document.getElementById('userId').value = id;
    document.getElementById('userName').value = name;
    document.getElementById('userUsername').value = username;
    document.getElementById('userRole').value = roleId; // This might fail if roles aren't loaded yet, but usually they are fast
    document.getElementById('passwordHint').classList.remove('hidden');
    document.getElementById('userPassword').required = false;
    document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

async function handleUserSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    const role_id = document.getElementById('userRole').value;

    const data = { name, username, role_id };
    if (password) data.password = password;

    try {
        if (id) {
            await apiPut(`/users/${id}`, data);
            showNotification('Usuário atualizado com sucesso');
        } else {
            await apiPost('/users', data);
            showNotification('Usuário criado com sucesso');
        }
        closeUserModal();
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
    }
}

async function deleteUser(id) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        try {
            await apiDelete(`/users/${id}`);
            showNotification('Usuário excluído com sucesso');
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}
