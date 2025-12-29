// Task List Module - View and filter all tasks

let currentFilters = {};

async function loadTaskListModule() {
  const mainContent = document.getElementById('mainContent');

  // Get scopes for filter
  const scopes = await apiGet('/scopes');

  mainContent.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-white mb-8">
        <i class="fas fa-list mr-3 text-primary-400"></i>Todas as Tasks
      </h1>
      
      <!-- Filters -->
      <div class="filter-section bg-dark-900/50 backdrop-blur-sm border border-white/5 p-6 rounded-2xl mb-8">
        <h2 class="text-lg font-semibold text-white mb-4">
          <i class="fas fa-filter mr-2 text-primary-400"></i>Filtros
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="form-group">
            <label class="form-label text-gray-300">Escopo</label>
            <select id="filterScope" class="form-select bg-dark-800 border-white/10 text-white focus:border-primary-500">
              <option value="" class="text-gray-900">Todos</option>
              ${scopes.map(s => `<option value="${s.id}" class="text-gray-900">${s.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label text-gray-300">Prioridade</label>
            <select id="filterPriority" class="form-select bg-dark-800 border-white/10 text-white focus:border-primary-500">
              <option value="" class="text-gray-900">Todas</option>
              <option value="low" class="text-gray-900">Baixa</option>
              <option value="medium" class="text-gray-900">Média</option>
              <option value="high" class="text-gray-900">Alta</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label text-gray-300">Complexidade</label>
            <select id="filterComplexity" class="form-select bg-dark-800 border-white/10 text-white focus:border-primary-500">
              <option value="" class="text-gray-900">Todas</option>
              <option value="easy" class="text-gray-900">Fácil</option>
              <option value="normal" class="text-gray-900">Normal</option>
              <option value="hard" class="text-gray-900">Difícil</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label text-gray-300">Status</label>
            <select id="filterStatus" class="form-select bg-dark-800 border-white/10 text-white focus:border-primary-500">
              <option value="" class="text-gray-900">Todos</option>
              <option value="pending" class="text-gray-900">Pendente</option>
              <option value="completed" class="text-gray-900">Concluída</option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-3 mt-4">
          <button onclick="applyFilters()" class="btn btn-primary">
            <i class="fas fa-search"></i> Aplicar Filtros
          </button>
          <button onclick="clearFilters()" class="btn btn-secondary">
            <i class="fas fa-times"></i> Limpar Filtros
          </button>
        </div>
      </div>
      
      <!-- Tasks List -->
      <div id="tasksList"></div>
    </div>
  `;

  // Load tasks
  await loadTasksList();

  // Add filter change handlers
  ['filterScope', 'filterPriority', 'filterComplexity', 'filterStatus'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });
}

async function loadTasksList(filters = {}) {
  const listContainer = document.getElementById('tasksList');
  listContainer.innerHTML = '<div class="spinner"></div>';

  try {
    // Build query string
    const params = new URLSearchParams();
    if (filters.scope_id) params.append('scope_id', filters.scope_id);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.complexity) params.append('complexity', filters.complexity);
    if (filters.status) params.append('status', filters.status);

    const tasks = await apiGet(`/tasks?${params.toString()}`);

    if (tasks.length === 0) {
      listContainer.innerHTML = `
        <div class="card text-center py-12 bg-dark-800/50 border border-white/5">
          <i class="fas fa-inbox text-6xl text-gray-600 mb-4"></i>
          <p class="text-gray-400 text-lg">
            Nenhuma task encontrada com os filtros aplicados.
          </p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = `
      <div class="mb-4 text-gray-400">
        Total: <strong class="text-white">${tasks.length}</strong> task${tasks.length !== 1 ? 's' : ''}
      </div>
      <div class="grid grid-cols-1 gap-4">
        ${tasks.map(task => createTaskCard(task)).join('')}
      </div>
    `;
  } catch (error) {
    listContainer.innerHTML = `
      <div class="card text-center text-red-400 bg-red-900/10 border border-red-500/20">
        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
        <p>Erro ao carregar tasks.</p>
      </div>
    `;
  }
}

function createTaskCard(task) {
  const isOverdue = !task.completed_at && new Date(task.due_date) < new Date();

  return `
    <div class="card bg-dark-800/80 hover:bg-dark-800 transition-colors border-white/5 hover:border-primary-500/30 ${isOverdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-primary-500'}">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Main Info -->
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-white mb-2">
                ${task.name}
              </h3>
              <div class="flex flex-wrap gap-2">
                ${getPriorityBadge(task.priority)}
                ${getComplexityBadge(task.complexity)}
                ${getStatusBadge(task)}
                ${task.scope_name ? `<span class="badge bg-primary-900/30 text-primary-300 border border-primary-500/30"><i class="fas fa-folder mr-1"></i>${task.scope_name}</span>` : ''}
              </div>
            </div>
            <span class="text-sm text-gray-500 font-mono">#${task.id}</span>
          </div>
          
          ${task.description_problem ? `
            <p class="text-sm text-gray-400 mb-2">
              <i class="fas fa-bug mr-1 text-red-400"></i>
              ${task.description_problem.substring(0, 150)}${task.description_problem.length > 150 ? '...' : ''}
            </p>
          ` : ''}
          
          <div class="flex flex-wrap gap-4 text-sm mt-3">
            <div class="flex items-center ${isOverdue ? 'text-red-400 font-bold' : 'text-gray-400'}">
              <i class="fas fa-calendar mr-2"></i>
              ${formatDate(task.due_date)}
              ${!task.completed_at ? `<span class="ml-2">(${getDaysUntilDue(task.due_date)})</span>` : ''}
            </div>
            ${task.screenshot_count > 0 ? `
              <div class="text-gray-400">
                <i class="fas fa-images mr-2 text-primary-400"></i>
                ${task.screenshot_count} screenshot${task.screenshot_count !== 1 ? 's' : ''}
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex md:flex-col gap-2">
          <button onclick="viewTask(${task.id})" class="btn btn-primary text-sm" title="Ver Detalhes">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="editTask(${task.id})" class="btn btn-warning text-sm" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          ${!task.completed_at ? `
            <button onclick="completeTask(${task.id})" class="btn btn-success text-sm" title="Completar">
              <i class="fas fa-check"></i>
            </button>
          ` : `
            <button onclick="quickUncompleteTask(${task.id})" class="btn btn-secondary text-sm" title="Reabrir">
              <i class="fas fa-undo"></i>
            </button>
          `}
          <button onclick="deleteTask(${task.id})" class="btn btn-danger text-sm" title="Deletar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function applyFilters() {
  currentFilters = {
    scope_id: document.getElementById('filterScope').value,
    priority: document.getElementById('filterPriority').value,
    complexity: document.getElementById('filterComplexity').value,
    status: document.getElementById('filterStatus').value,
  };

  loadTasksList(currentFilters);
}

function clearFilters() {
  document.getElementById('filterScope').value = '';
  document.getElementById('filterPriority').value = '';
  document.getElementById('filterComplexity').value = '';
  document.getElementById('filterStatus').value = '';
  currentFilters = {};
  loadTasksList();
}

async function viewTask(taskId) {
  try {
    const task = await apiGet(`/tasks/${taskId}`);

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-dark-900 border-2 border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
        <div class="flex justify-between items-start mb-6">
          <h2 class="text-2xl font-bold text-white">${task.name}</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="flex flex-wrap gap-2">
            ${getPriorityBadge(task.priority)}
            ${getComplexityBadge(task.complexity)}
            ${getStatusBadge(task)}
            ${task.scope_name ? `<span class="badge" style="background-color: #dbeafe; color: #1e40af;">${task.scope_name}</span>` : ''}
          </div>
          
          <div>
            <strong class="text-gray-700">Prazo:</strong>
            <span class="ml-2">${formatDate(task.due_date)} (${getDaysUntilDue(task.due_date)})</span>
          </div>

          ${task.time_spent ? `
            <div>
              <strong class="text-gray-700">Tempo Trabalhado:</strong>
              <span class="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                ${formatTime(task.time_spent)}
              </span>
            </div>
          ` : ''}
          
          ${task.description_problem ? `
            <div>
              <strong class="text-gray-300 block mb-2">Descrição do Problema:</strong>
              <div class="bg-dark-800 p-4 rounded-xl text-gray-300 border border-white/5">${task.description_problem}</div>
            </div>
          ` : ''}
          
          ${task.description_solution ? `
            <div>
              <strong class="text-gray-700 block mb-2">Como Resolver:</strong>
              <div class="bg-gray-50 p-3 rounded">${task.description_solution}</div>
            </div>
          ` : ''}

          ${task.resolution_notes ? `
            <div class="bg-green-900/20 border border-green-500/30 p-4 rounded-xl">
              <strong class="text-green-400 block mb-2"><i class="fas fa-check-circle mr-2"></i>Notas de Resolução:</strong>
              <div class="text-green-200">${task.resolution_notes}</div>
            </div>
          ` : ''}
          
          ${task.screenshots && task.screenshots.length > 0 ? `
            <div>
              <strong class="text-gray-700 block mb-2">Screenshots:</strong>
              <div class="flex flex-wrap gap-2">
                ${task.screenshots.map(s => `
                  <a href="${s.path}" target="_blank" class="relative group">
                    <img src="${s.path}" class="w-32 h-32 object-cover rounded border-2 ${s.type === 'resolution' ? 'border-green-500' : 'border-gray-200'} hover:border-blue-500">
                    ${s.type === 'resolution' ? '<span class="absolute top-0 right-0 bg-green-500 text-white text-xs px-1 rounded-bl">Solução</span>' : ''}
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="text-sm text-gray-500 pt-4 border-t border-gray-200">
            Criada em: ${formatDateTime(task.created_at)}
            ${task.completed_at ? `<br>Concluída em: ${formatDateTime(task.completed_at)}` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    showNotification('Erro ao carregar detalhes da task', 'error');
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function editTask(taskId) {
  // Save task ID to localStorage to be picked up by tasks module
  localStorage.setItem('editTaskId', taskId);
  loadModule('tasks');
}

// Complete task action (Modal)
async function completeTask(taskId) {
  // Create modal for completion details
  const modalHtml = `
    <div id="completeModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-dark-900 border-2 border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div class="bg-green-900/30 border-b border-green-500/30 px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-bold text-green-400">Concluir Task #${taskId}</h3>
          <button onclick="closeCompleteModal()" class="text-green-400 hover:text-white transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-8">
          <form id="completeForm" onsubmit="submitComplete(event, ${taskId})">
            <div class="mb-6">
              <label class="block text-gray-300 font-bold mb-2">Como foi resolvido? *</label>
              <textarea name="resolution_notes" rows="4" class="form-textarea bg-dark-800 border-white/10 text-white focus:border-green-500" required placeholder="Descreva a solução aplicada..."></textarea>
            </div>
            
            <div class="mb-8">
              <label class="block text-gray-300 font-bold mb-2">Screenshot da Solução (Opcional)</label>
              <div class="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer group" onclick="document.getElementById('solutionScreenshot').click()">
                <div class="w-12 h-12 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                     <i class="fas fa-cloud-upload-alt text-xl text-green-400"></i>
                </div>
                <p class="text-gray-400 font-medium group-hover:text-white transition-colors">Clique para fazer upload da imagem</p>
                <input type="file" id="solutionScreenshot" name="screenshot" class="hidden" accept="image/*" onchange="previewSolutionImage(this)">
              </div>
              <div id="solutionPreview" class="mt-4 hidden">
                <img src="" alt="Preview" class="max-h-48 rounded-xl border border-white/10 mx-auto shadow-lg">
              </div>
            </div>
            
            <div class="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button type="button" onclick="closeCompleteModal()" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success shadow-lg shadow-green-500/20">
                <i class="fas fa-check mr-2"></i> Confirmar Conclusão
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeCompleteModal() {
  const modal = document.getElementById('completeModal');
  if (modal) modal.remove();
}

function previewSolutionImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById('solutionPreview');
      const img = preview.querySelector('img');
      img.src = e.target.result;
      preview.classList.remove('hidden');
    }
    reader.readAsDataURL(input.files[0]);
  }
}

async function submitComplete(e, taskId) {
  e.preventDefault();
  const form = e.target;
  const notes = form.resolution_notes.value;
  const fileInput = document.getElementById('solutionScreenshot');

  try {
    // 1. Mark as completed with notes
    await apiPatch(`/tasks/${taskId}/complete`, {
      completed: true,
      resolution_notes: notes
    });

    // 2. Upload screenshot if exists
    if (fileInput.files.length > 0) {
      const formData = new FormData();
      formData.append('screenshot', fileInput.files[0]);
      formData.append('type', 'resolution');

      await fetch(`${API_URL}/tasks/${taskId}/screenshots`, {
        method: 'POST',
        body: formData
      });
    }

    showNotification('Task concluída com sucesso!', 'success');
    closeCompleteModal();
    loadTasksList(currentFilters);
  } catch (error) {
    console.error(error);
    showNotification('Erro ao concluir task', 'error');
  }
}

async function quickUncompleteTask(taskId) {
  try {
    await apiPatch(`/tasks/${taskId}/complete`, { completed: false });
    showNotification('Task reaberta!', 'success');
    loadTasksList(currentFilters);
  } catch (error) {
    showNotification('Erro ao reabrir task', 'error');
  }
}

async function deleteTask(taskId) {
  // Check permission
  if (!hasPermission('delete_task')) {
    showPermissionDenied('deletar tasks', 'delete_task');
    return;
  }

  if (!confirmDialog('Tem certeza que deseja deletar esta task? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    await apiDelete(`/tasks/${taskId}`);
    showNotification('Task deletada com sucesso!', 'success');
    loadTasksList(currentFilters);
  } catch (error) {
    showNotification('Erro ao deletar task', 'error');
  }
}
