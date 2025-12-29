// Tasks Module - Create and Edit tasks

let selectedFiles = [];
let editingTaskId = null;

async function loadTasksModule() {
  const mainContent = document.getElementById('mainContent');
  editingTaskId = localStorage.getItem('editTaskId');
  localStorage.removeItem('editTaskId'); // Clear immediately

  const isEditMode = !!editingTaskId;

  // Check permissions
  if (!isEditMode && !hasPermission('create_task')) {
    showPermissionDenied('criar tasks', 'create_task');
    loadModule('task-list');
    return;
  }

  if (isEditMode && !hasPermission('edit_task')) {
    showPermissionDenied('editar tasks', 'edit_task');
    loadModule('task-list');
    return;
  }

  // Get scopes for dropdown
  const scopes = await apiGet('/scopes');

  let taskData = null;

  if (isEditMode) {
    try {
      taskData = await apiGet(`/tasks/${editingTaskId}`);
    } catch (error) {
      showNotification('Erro ao carregar dados da task', 'error');
      loadModule('task-list');
      return;
    }
  }

  mainContent.innerHTML = `
    <div class="max-w-4xl mx-auto animate-slide-in">
      <h1 class="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <div class="p-2 bg-primary-500/10 rounded-lg">
            <i class="fas ${isEditMode ? 'fa-edit' : 'fa-plus-circle'} text-primary-400"></i>
        </div>
        ${isEditMode ? 'Editar Task' : 'Criar Nova Task'}
      </h1>
      
      <form id="taskForm" class="card">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Nome -->
          <div class="form-group md:col-span-2">
            <label class="form-label">
              <i class="fas fa-tag mr-2 text-primary-400"></i>Nome da Task <span class="text-red-400">*</span>
            </label>
            <input type="text" id="taskName" class="form-input" required placeholder="Ex: Corrigir bug no login" value="${taskData ? taskData.name : ''}">
          </div>
          
          <!-- Escopo -->
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-folder mr-2 text-purple-400"></i>Escopo
            </label>
            <select id="taskScope" class="form-select">
              <option value="">Sem escopo</option>
              ${scopes.map(s => `<option value="${s.id}" ${taskData && taskData.scope_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
          
          <!-- Data Prazo -->
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-calendar mr-2 text-blue-400"></i>Data de Prazo <span class="text-red-400">*</span>
            </label>
            <input type="date" id="taskDueDate" class="form-input" required value="${taskData ? taskData.due_date.split('T')[0] : ''}">
          </div>
          
          <!-- Prioridade -->
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-exclamation-circle mr-2 text-orange-400"></i>Prioridade <span class="text-red-400">*</span>
            </label>
            <select id="taskPriority" class="form-select" required>
              <option value="">Selecione...</option>
              <option value="low" ${taskData && taskData.priority === 'low' ? 'selected' : ''}>Baixa</option>
              <option value="medium" ${taskData && taskData.priority === 'medium' ? 'selected' : ''}>Média</option>
              <option value="high" ${taskData && taskData.priority === 'high' ? 'selected' : ''}>Alta</option>
            </select>
          </div>
          
          <!-- Complexidade -->
          <div class="form-group">
            <label class="form-label">
              <i class="fas fa-brain mr-2 text-pink-400"></i>Complexidade <span class="text-red-400">*</span>
            </label>
            <select id="taskComplexity" class="form-select" required>
              <option value="">Selecione...</option>
              <option value="easy" ${taskData && taskData.complexity === 'easy' ? 'selected' : ''}>Fácil</option>
              <option value="normal" ${taskData && taskData.complexity === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="hard" ${taskData && taskData.complexity === 'hard' ? 'selected' : ''}>Difícil</option>
            </select>
          </div>
          
          <!-- Descrição do Problema -->
          <div class="form-group md:col-span-2">
            <label class="form-label">
              <i class="fas fa-bug mr-2 text-red-400"></i>Descrição do Problema
            </label>
            <textarea id="taskProblem" class="form-textarea" rows="4" placeholder="Descreva o problema detalhadamente...">${taskData ? taskData.description_problem || '' : ''}</textarea>
          </div>
          
          <!-- Descrição da Solução -->
          <div class="form-group md:col-span-2">
            <label class="form-label">
              <i class="fas fa-lightbulb mr-2 text-yellow-400"></i>Como Resolver
            </label>
            <textarea id="taskSolution" class="form-textarea" rows="4" placeholder="Descreva como resolver o problema...">${taskData ? taskData.description_solution || '' : ''}</textarea>
          </div>

          ${isEditMode ? `


            <!-- Notas de Resolução (Edit Only) -->
            <div class="form-group md:col-span-2">
              <label class="form-label">
                <i class="fas fa-check-circle mr-2"></i>Notas de Resolução
              </label>
              <textarea id="taskResolutionNotes" class="form-textarea" rows="3">${taskData.resolution_notes || ''}</textarea>
            </div>
          ` : ''}
          
          <!-- Screenshots -->
          <div class="form-group md:col-span-2">
            <label class="form-label">
              <i class="fas fa-images mr-2 text-primary-400"></i>${isEditMode ? 'Adicionar Screenshots' : 'Screenshots do Problema'}
            </label>
            <div class="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer group" onclick="document.getElementById('taskScreenshots').click()">
                 <div class="w-12 h-12 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <i class="fas fa-cloud-upload-alt text-xl text-primary-400"></i>
                 </div>
                 <p class="text-white font-medium">Clique para fazer upload</p>
                 <p class="text-sm text-dark-400 mt-1">Máx 10MB por imagem</p>
            </div>
            <input type="file" id="taskScreenshots" class="hidden" accept="image/*" multiple>
            <div id="screenshotPreview" class="mt-4 flex flex-wrap gap-3"></div>
            
            ${isEditMode && taskData.screenshots && taskData.screenshots.length > 0 ? `
              <div class="mt-4">
                <p class="text-sm font-bold text-gray-300 mb-2">Screenshots Atuais:</p>
                <div class="flex flex-wrap gap-2">
                  ${taskData.screenshots.map(s => `
                    <div class="relative group">
                      <img src="${s.path}" class="w-24 h-24 object-cover rounded border border-gray-600">
                      <a href="${s.path}" target="_blank" class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></a>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex gap-4 mt-8 pt-6 border-t border-white/10">
          <button type="submit" class="btn btn-primary flex-1">
            <i class="fas fa-save"></i> ${isEditMode ? 'Salvar Alterações' : 'Criar Task'}
          </button>
          <button type="button" onclick="loadModule('task-list')" class="btn btn-secondary">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </form>
    </div>
    `;

  // Set default date to today if creating new
  if (!isEditMode) {
    document.getElementById('taskDueDate').valueAsDate = new Date();
  }

  // Handle file selection
  document.getElementById('taskScreenshots').addEventListener('change', handleFileSelection);

  // Handle form submission
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
}

function handleFileSelection(e) {
  const files = Array.from(e.target.files);
  selectedFiles = files;

  const preview = document.getElementById('screenshotPreview');
  preview.innerHTML = '';

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'screenshot-preview';
      div.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
      <button type="button" class="delete-btn" onclick="removeFile(${index})">
        <i class="fas fa-times"></i>
      </button>
  `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);

  // Update file input
  const dataTransfer = new DataTransfer();
  selectedFiles.forEach(file => dataTransfer.items.add(file));
  document.getElementById('taskScreenshots').files = dataTransfer.files;

  // Trigger change event to update preview
  document.getElementById('taskScreenshots').dispatchEvent(new Event('change'));
}

async function handleTaskSubmit(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    const taskData = {
      name: document.getElementById('taskName').value,
      description_problem: document.getElementById('taskProblem').value,
      description_solution: document.getElementById('taskSolution').value,
      due_date: document.getElementById('taskDueDate').value,
      complexity: document.getElementById('taskComplexity').value,
      priority: document.getElementById('taskPriority').value,
      scope_id: document.getElementById('taskScope').value || null,
    };

    if (editingTaskId) {
      // Add edit-specific fields
      taskData.resolution_notes = document.getElementById('taskResolutionNotes').value;
    }

    let taskId;

    if (editingTaskId) {
      await apiPut(`/tasks/${editingTaskId}`, taskData);
      taskId = editingTaskId;
      showNotification('Task atualizada com sucesso!', 'success');
    } else {
      const task = await apiPost('/tasks', taskData);
      taskId = task.id;
      showNotification('Task criada com sucesso!', 'success');
    }

    // Upload screenshots
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        await uploadFile(`/tasks/${taskId}/screenshots`, file);
      }
    }

    selectedFiles = [];
    editingTaskId = null;
    loadModule('task-list');
  } catch (error) {
    console.error(error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> ' + (editingTaskId ? 'Salvar Alterações' : 'Criar Task');
    showNotification('Erro ao salvar task', 'error');
  }
}
