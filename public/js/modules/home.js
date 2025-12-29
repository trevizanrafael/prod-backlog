// Home Module - Shows priority task and Time Tracker

// Home Module - Shows priority task and SQL Playground (for SuperUser)

async function loadHomeModule() {
  const mainContent = document.getElementById('mainContent');

  try {
    // Fetch priority task
    const task = await apiGet('/tasks/priority/top');

    // Get current user for SQL Playground check
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const isSuperUser = user && (user.username === 'SuperUser' || user.role === 'Admin');

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

    // SQL Playground HTML (Only for SuperUser)
    let sqlPlaygroundHtml = '';

    if (isSuperUser) {
      sqlPlaygroundHtml = `
            <div class="card bg-gray-800 text-white mb-8 border border-gray-700">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold flex items-center text-blue-400">
                        <i class="fas fa-database mr-2"></i>
                        SQL Playground
                    </h2>
                    <span class="text-xs bg-red-600 text-white px-2 py-1 rounded">CUIDADO: Acesso Direto</span>
                </div>
                
                <div class="mb-4">
                    <div class="flex gap-4 mb-2">
                        <div class="w-1/4">
                            <label class="block text-xs text-gray-400 mb-1">Operação</label>
                            <select id="sqlOperation" class="w-full bg-gray-700 border-gray-600 text-white rounded p-2 focus:border-blue-500" onchange="handleSqlOperationChange(this)">
                                <option value="SELECT">SELECT</option>
                                <option value="UPDATE">UPDATE</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        <div class="w-3/4">
                            <label class="block text-xs text-gray-400 mb-1">Query SQL</label>
                            <div class="relative">
                                <textarea id="sqlQuery" rows="3" class="w-full bg-gray-900 border-gray-700 text-green-400 font-mono text-sm rounded p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="SELECT * FROM users"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button onclick="executeSql()" class="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm">
                            <i class="fas fa-play mr-2"></i> Executar Scrip
                        </button>
                    </div>
                </div>
                
                <!-- Results Area -->
                <div id="sqlResults" class="hidden mt-4 border-t border-gray-700 pt-4">
                    <h3 class="text-sm font-semibold text-gray-400 mb-2">Resultado:</h3>
                    <div class="overflow-x-auto bg-gray-900 rounded p-2 max-h-60 overflow-y-auto">
                        <div id="sqlOutput" class="text-xs font-mono"></div>
                    </div>
                </div>
            </div>
        `;
    }

    mainContent.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">
          <i class="fas fa-home mr-3"></i>Home
        </h1>
        
        ${sqlPlaygroundHtml}
        
        <h2 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-star mr-2 text-yellow-500"></i>
          Task Prioritária
        </h2>
        ${priorityTaskHtml}
      </div>
    `;



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

// SQL Playground Functions

function handleSqlOperationChange(selectInfo) {
  const operation = selectInfo.value;

  if (operation === 'UPDATE' || operation === 'DELETE') {
    const modalHtml = `
            <div id="sqlWarningModal" class="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                <div class="bg-gray-800 border border-red-600 rounded-lg shadow-2xl max-w-md w-full p-6 text-white">
                    <div class="flex items-center mb-4">
                        <div class="bg-red-900/50 rounded-full p-3 mr-4">
                            <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-red-400">Atenção Extrema!</h3>
                    </div>
                    <p class="text-gray-300 mb-4">
                        Você selecionou uma operação destrutiva (<strong>${operation}</strong>).
                        <br><br>
                        Alterações diretas no banco de dados são irreversíveis e podem corromper o sistema se não feitas com cuidado.
                    </p>
                    <div class="bg-red-900/30 p-3 rounded mb-6 border border-red-800 text-red-200 text-sm">
                        Certifique-se de usar a cláusula <code>WHERE</code> para não afetar todos os registros!
                    </div>
                    <div class="flex justify-end gap-3">
                        <button onclick="document.getElementById('sqlOperation').value='SELECT'; document.getElementById('sqlWarningModal').remove()" class="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-gray-700">
                            Cancelar (Voltar para SELECT)
                        </button>
                        <button onclick="document.getElementById('sqlWarningModal').remove()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold">
                            Estou ciente dos riscos
                        </button>
                    </div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
}

async function executeSql() {
  const query = document.getElementById('sqlQuery').value;
  if (!query) return;

  const btn = document.querySelector('button[onclick="executeSql()"]');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executando...';

  const resultsArea = document.getElementById('sqlResults');
  const outputArea = document.getElementById('sqlOutput');
  resultsArea.classList.add('hidden');

  try {
    const result = await apiPost('/admin/sql', { query });

    resultsArea.classList.remove('hidden');

    if (result.error) {
      outputArea.innerHTML = `<span class="text-red-400">Error: ${result.error}</span>`;
    } else if (result.rows && Array.isArray(result.rows)) {
      if (result.rows.length === 0) {
        if (result.command === 'SELECT') {
          outputArea.innerHTML = '<span class="text-gray-400">Nenhum registro encontrado.</span>';
        } else {
          outputArea.innerHTML = `<span class="text-green-400">Comando executado com sucesso. Linhas afetadas: ${result.rowCount}</span>`;
        }
      } else {
        // Render table
        const keys = Object.keys(result.rows[0]);
        let tableHtml = '<table class="w-full text-left border-collapse">';

        // Header
        tableHtml += '<thead><tr>';
        keys.forEach(key => {
          tableHtml += `<th class="p-2 border-b border-gray-700 text-gray-400 font-semibold">${key}</th>`;
        });
        tableHtml += '</tr></thead>';

        // Body
        tableHtml += '<tbody>';
        result.rows.forEach(row => {
          tableHtml += '<tr class="hover:bg-gray-800">';
          keys.forEach(key => {
            let val = row[key];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            tableHtml += `<td class="p-2 border-b border-gray-800 text-gray-300 truncate max-w-xs" title="${val}">${val}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';

        outputArea.innerHTML = tableHtml;
      }
    } else {
      outputArea.innerHTML = `<span class="text-green-400">Comando executado. ${JSON.stringify(result)}</span>`;
    }

  } catch (error) {
    resultsArea.classList.remove('hidden');
    outputArea.innerHTML = `<span class="text-red-400">Erro na requisição: ${error.message}</span>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

// Complete task action
async function completeTask(taskId) {

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
