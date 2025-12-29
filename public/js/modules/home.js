// Home Module - Shows priority task and Time Tracker

let activeTimer = null;
let timerInterval = null;
let currentTaskTime = 0;

async function loadHomeModule() {
  const mainContent = document.getElementById('mainContent');

  try {
    // Fetch priority task
    const task = await apiGet('/tasks/priority/top');
    // Fetch all pending tasks for the timer dropdown
    const allTasks = await apiGet('/tasks?status=pending');

    let priorityTaskHtml = '';

    if (!task) {
      priorityTaskHtml = `
        <div class="card text-center py-12 mb-8">
          <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
          <h2 class="text-2xl font-semibold text-gray-700 mb-2">
            Parabéns! Não há tasks pendentes
          </h2>
          <p class="text-gray-500">
            Todas as tasks foram concluídas ou não há tasks cadastradas.
          </p>
          <button onclick="loadModule('tasks')" class="btn btn-primary mt-6">
            <i class="fas fa-plus"></i> Criar Nova Task
          </button>
        </div>
      `;
    } else {
      // Calculate days until due
      const daysInfo = getDaysUntilDue(task.due_date);
      priorityTaskHtml = `
        <div class="card bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 mb-8">
          <!-- Header -->
          <div class="flex justify-between items-start mb-6">
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-gray-900 mb-2">
                ${task.name}
              </h2>
              <div class="flex flex-wrap gap-2 mb-3">
                ${getPriorityBadge(task.priority)}
                ${getComplexityBadge(task.complexity)}
                ${getStatusBadge(task)}
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-500 mb-1">ID</div>
              <div class="text-lg font-mono font-bold text-blue-600">#${task.id}</div>
            </div>
          </div>
          
          <!-- Due Date Info -->
          <div class="bg-white rounded-lg p-4 mb-6 border-l-4 ${new Date(task.due_date) < new Date() ? 'border-red-500' : 'border-blue-500'}">
            <div class="flex items-center justify-between">
              <div>
                <i class="fas fa-calendar-alt text-gray-500 mr-2"></i>
                <span class="font-semibold">Data de Prazo:</span>
                <span class="ml-2">${formatDate(task.due_date)}</span>
              </div>
              <div class="font-bold ${new Date(task.due_date) < new Date() ? 'text-red-600' : 'text-blue-600'}">
                ${daysInfo}
              </div>
            </div>
          </div>
          
          <!-- Scope -->
          ${task.scope_name ? `
            <div class="mb-4">
              <div class="text-sm font-semibold text-gray-700 mb-1">
                <i class="fas fa-folder mr-2"></i>Escopo
              </div>
              <div class="bg-blue-100 text-blue-800 px-3 py-2 rounded-md inline-block">
                ${task.scope_name}
              </div>
            </div>
          ` : ''}
          
          <!-- Problem Description -->
          ${task.description_problem ? `
            <div class="mb-4">
              <div class="text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-exclamation-circle mr-2"></i>Descrição do Problema
              </div>
              <div class="bg-gray-50 p-4 rounded-lg text-gray-700">
                ${task.description_problem}
              </div>
            </div>
          ` : ''}
          
          <!-- Solution Description -->
          ${task.description_solution ? `
            <div class="mb-4">
              <div class="text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-lightbulb mr-2"></i>Como Resolver
              </div>
              <div class="bg-gray-50 p-4 rounded-lg text-gray-700">
                ${task.description_solution}
              </div>
            </div>
          ` : ''}
          
          <!-- Screenshots -->
          ${task.screenshots && task.screenshots.length > 0 ? `
            <div class="mb-6">
              <div class="text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-images mr-2"></i>Screenshots (${task.screenshots.length})
              </div>
              <div class="flex flex-wrap gap-3">
                ${task.screenshots.map(s => `
                  <a href="${s.path}" target="_blank" class="block">
                    <img src="${s.path}" alt="Screenshot" class="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-colors cursor-pointer">
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Timestamps -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div class="text-sm">
              <span class="text-gray-500">Criada em:</span>
              <span class="ml-2 font-medium">${formatDateTime(task.created_at)}</span>
            </div>
            ${task.completed_at ? `
              <div class="text-sm">
                <span class="text-gray-500">Concluída em:</span>
                <span class="ml-2 font-medium">${formatDateTime(task.completed_at)}</span>
              </div>
            ` : ''}
          </div>
          
          <!-- Actions -->
          <div class="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            ${!task.completed_at ? `
              <button onclick="completeTask(${task.id})" class="btn btn-success flex-1">
                <i class="fas fa-check"></i> Marcar como Concluída
              </button>
            ` : `
              <button onclick="uncompleteTask(${task.id})" class="btn btn-secondary flex-1">
                <i class="fas fa-undo"></i> Marcar como Pendente
              </button>
            `}
            <button onclick="loadModule('task-list')" class="btn btn-primary">
              <i class="fas fa-list"></i> Ver Todas as Tasks
            </button>
          </div>
        </div>`;
    }

    // Time Tracker HTML
    const timeTrackerHtml = `
      <div class="card bg-gray-800 text-white mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold flex items-center">
            <i class="fas fa-stopwatch mr-3 text-yellow-400"></i>
            Time Tracker
          </h2>
          <div id="timerDisplay" class="text-4xl font-mono font-bold text-yellow-400">
            00:00:00
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-1">Selecione a Task</label>
            <select id="timerTaskSelect" class="w-full bg-gray-700 border-gray-600 text-white rounded-lg focus:ring-yellow-400 focus:border-yellow-400" ${activeTimer ? 'disabled' : ''}>
              <option value="">Selecione uma task para iniciar...</option>
              ${allTasks.map(t => `<option value="${t.id}" ${activeTimer === t.id ? 'selected' : ''}>#${t.id} - ${t.name}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-end gap-2">
            <button id="startTimerBtn" onclick="startTimer()" class="btn bg-green-600 hover:bg-green-700 text-white flex-1 ${activeTimer ? 'hidden' : ''}">
              <i class="fas fa-play mr-2"></i> Iniciar
            </button>
            <button id="stopTimerBtn" onclick="stopTimer()" class="btn bg-red-600 hover:bg-red-700 text-white flex-1 ${!activeTimer ? 'hidden' : ''}">
              <i class="fas fa-stop mr-2"></i> Parar
            </button>
          </div>
        </div>
        
        <div id="activeTaskInfo" class="mt-4 text-sm text-gray-400 ${!activeTimer ? 'hidden' : ''}">
          <i class="fas fa-info-circle mr-2"></i>
          Trabalhando na task <span class="font-bold text-white" id="activeTaskName"></span>
        </div>
      </div>
    `;

    mainContent.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">
          <i class="fas fa-home mr-3"></i>Home
        </h1>
        
        ${timeTrackerHtml}
        
        <h2 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-star mr-2 text-yellow-500"></i>
          Task Prioritária
        </h2>
        ${priorityTaskHtml}
      </div>
    `;

    // Restore timer state if active
    if (activeTimer) {
      const task = allTasks.find(t => t.id === activeTimer);
      if (task) {
        currentTaskTime = task.time_spent || 0;
        document.getElementById('timerTaskSelect').disabled = true;
        document.getElementById('startTimerBtn').classList.add('hidden');
        document.getElementById('stopTimerBtn').classList.remove('hidden');
        document.getElementById('activeTaskInfo').classList.remove('hidden');
        document.getElementById('activeTaskName').textContent = `#${task.id} - ${task.name}`;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
          currentTaskTime++;
          updateTimerDisplay();
          if (currentTaskTime % 60 === 0) {
            saveTimer(activeTimer, currentTaskTime);
          }
        }, 1000);
      } else {
        // If activeTimer task is no longer pending, reset timer
        activeTimer = null;
        currentTaskTime = 0;
      }
    }

  } catch (error) {
    console.error(error);
    mainContent.innerHTML = `
      <div class="card text-center">
        <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p class="text-gray-700">Erro ao carregar a home.</p>
      </div>
    `;
  }
}

// Timer Functions
async function startTimer() {
  const taskSelect = document.getElementById('timerTaskSelect');
  const taskId = taskSelect.value;

  if (!taskId) {
    showNotification('Selecione uma task para iniciar o timer', 'error');
    return;
  }

  try {
    const task = await apiGet(`/tasks/${taskId}`);
    activeTimer = parseInt(taskId);
    currentTaskTime = task.time_spent || 0;

    // Update UI
    document.getElementById('timerTaskSelect').disabled = true;
    document.getElementById('startTimerBtn').classList.add('hidden');
    document.getElementById('stopTimerBtn').classList.remove('hidden');
    document.getElementById('activeTaskInfo').classList.remove('hidden');
    document.getElementById('activeTaskName').textContent = `#${task.id} - ${task.name}`;

    // Start interval
    timerInterval = setInterval(() => {
      currentTaskTime++;
      updateTimerDisplay();
      // Save every minute
      if (currentTaskTime % 60 === 0) {
        saveTimer(activeTimer, currentTaskTime);
      }
    }, 1000);

    showNotification('Timer iniciado!', 'success');
  } catch (error) {
    showNotification('Erro ao iniciar timer', 'error');
  }
}

async function stopTimer() {
  if (!activeTimer) return;

  clearInterval(timerInterval);
  await saveTimer(activeTimer, currentTaskTime);

  activeTimer = null;
  timerInterval = null;

  // Update UI
  document.getElementById('timerTaskSelect').disabled = false;
  document.getElementById('startTimerBtn').classList.remove('hidden');
  document.getElementById('stopTimerBtn').classList.add('hidden');
  document.getElementById('activeTaskInfo').classList.add('hidden');
  document.getElementById('timerTaskSelect').value = '';
  document.getElementById('timerDisplay').textContent = '00:00:00';

  showNotification('Timer parado e salvo!', 'success');
}

async function saveTimer(taskId, time) {
  try {
    await apiPost(`/tasks/${taskId}/timer`, { time_spent: time });
  } catch (error) {
    console.error('Error saving timer:', error);
  }
}

function updateTimerDisplay() {
  const hours = Math.floor(currentTaskTime / 3600);
  const minutes = Math.floor((currentTaskTime % 3600) / 60);
  const seconds = currentTaskTime % 60;

  const display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const displayEl = document.getElementById('timerDisplay');
  if (displayEl) displayEl.textContent = display;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

// Complete task action
async function completeTask(taskId) {
  // Stop timer if running for this task
  if (activeTimer === taskId) {
    await stopTimer();
  }

  // Create modal for completion details
  const modalHtml = `
    <div id="completeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
        <div class="bg-green-600 px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-bold text-white">Concluir Task #${taskId}</h3>
          <button onclick="closeCompleteModal()" class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="p-6">
          <form id="completeForm" onsubmit="submitComplete(event, ${taskId})">
            <div class="mb-4">
              <label class="block text-gray-700 font-bold mb-2">Como foi resolvido? *</label>
              <textarea name="resolution_notes" rows="4" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required placeholder="Descreva a solução aplicada..."></textarea>
            </div>
            
            <div class="mb-6">
              <label class="block text-gray-700 font-bold mb-2">Screenshot da Solução (Opcional)</label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" onclick="document.getElementById('solutionScreenshot').click()">
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                <p class="text-gray-500">Clique para fazer upload da imagem</p>
                <input type="file" id="solutionScreenshot" name="screenshot" class="hidden" accept="image/*" onchange="previewSolutionImage(this)">
              </div>
              <div id="solutionPreview" class="mt-4 hidden">
                <img src="" alt="Preview" class="max-h-48 rounded-lg border border-gray-200 mx-auto">
              </div>
            </div>
            
            <div class="flex justify-end gap-3">
              <button type="button" onclick="closeCompleteModal()" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-success">
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
    loadHomeModule();
  } catch (error) {
    console.error(error);
    showNotification('Erro ao concluir task', 'error');
  }
}

// Uncomplete task action
async function uncompleteTask(taskId) {
  try {
    await apiPatch(`/tasks/${taskId}/complete`, { completed: false });
    showNotification('Task marcada como pendente!', 'success');
    loadHomeModule();
  } catch (error) {
    showNotification('Erro ao atualizar task', 'error');
  }
}
