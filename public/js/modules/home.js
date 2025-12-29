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
        <div class="card text-center py-12 mb-8 border border-white/5">
          <i class="fas fa-check-circle text-6xl text-green-500 mb-4 drop-shadow-lg"></i>
          <h2 class="text-2xl font-semibold text-white mb-2">
            Parabéns! Nenhuma task pendente
          </h2>
          <p class="text-dark-400">
            Todas as tasks foram concluídas ou não há tasks cadastradas.
          </p>
          <button onclick="loadModule('tasks')" class="btn btn-primary mt-6 shadow-lg shadow-primary-500/20">
            <i class="fas fa-plus"></i> Criar Nova Task
          </button>
        </div>
      `;
    } else {
      // Calculate days until due
      const daysInfo = getDaysUntilDue(task.due_date);
      priorityTaskHtml = `
        <div class="card mb-8 relative overflow-hidden group">
          <!-- Background Gradient Glow -->
          <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary-600 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
          
          <!-- Header -->
          <div class="flex justify-between items-start mb-6 relative z-10">
            <div class="flex-1">
              <h2 class="text-2xl font-bold text-white mb-3 tracking-tight">
                ${task.name}
              </h2>
              <div class="flex flex-wrap gap-2 mb-3">
                ${getPriorityBadge(task.priority)}
                ${getComplexityBadge(task.complexity)}
                ${getStatusBadge(task)}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-dark-400 mb-1 uppercase tracking-wider font-bold">ID</div>
              <div class="text-lg font-mono font-bold text-primary-400">#${task.id}</div>
            </div>
          </div>
          
          <!-- Due Date Info -->
          <div class="bg-dark-900/40 rounded-lg p-4 mb-6 border-l-4 ${new Date(task.due_date) < new Date() ? 'border-red-500' : 'border-primary-500'} backdrop-blur-sm">
            <div class="flex items-center justify-between">
              <div>
                <i class="fas fa-calendar-alt text-dark-400 mr-2"></i>
                <span class="font-semibold text-dark-200">Data de Prazo:</span>
                <span class="ml-2 text-white">${formatDate(task.due_date)}</span>
              </div>
              <div class="font-bold ${new Date(task.due_date) < new Date() ? 'text-red-400' : 'text-primary-400'}">
                ${daysInfo}
              </div>
            </div>
          </div>
          
          <!-- Scope -->
          ${task.scope_name ? `
          <!-- Scope -->
          ${task.scope_name ? `
            <div class="mb-4">
              <div class="text-xs font-bold text-dark-400 mb-2 uppercase tracking-wider">
                <i class="fas fa-folder mr-2"></i>Escopo
              </div>
              <div class="bg-primary-500/10 border border-primary-500/20 text-primary-300 px-3 py-2 rounded-lg inline-block text-sm font-medium">
                ${task.scope_name}
              </div>
            </div>
          ` : ''}
          ` : ''}
          
          <!-- Problem Description -->
          ${task.description_problem ? `
          <!-- Problem Description -->
          ${task.description_problem ? `
            <div class="mb-6">
              <div class="text-xs font-bold text-dark-400 mb-2 uppercase tracking-wider">
                <i class="fas fa-exclamation-circle mr-2"></i>Descrição do Problema
              </div>
              <div class="bg-dark-900/50 p-4 rounded-xl text-gray-300 border border-white/5 leading-relaxed text-sm">
                ${task.description_problem}
              </div>
            </div>
          ` : ''}
          ` : ''}
          
          <!-- Solution Description -->
          ${task.description_solution ? `
          <!-- Solution Description -->
          ${task.description_solution ? `
            <div class="mb-6">
              <div class="text-xs font-bold text-dark-400 mb-2 uppercase tracking-wider">
                <i class="fas fa-lightbulb mr-2"></i>Como Resolver
              </div>
              <div class="bg-primary-900/10 p-4 rounded-xl text-gray-300 border border-primary-500/10 leading-relaxed text-sm">
                ${task.description_solution}
              </div>
            </div>
          ` : ''}
          ` : ''}
          
          <!-- Screenshots -->
          ${task.screenshots && task.screenshots.length > 0 ? `
          <!-- Screenshots -->
          ${task.screenshots && task.screenshots.length > 0 ? `
            <div class="mb-6">
              <div class="text-xs font-bold text-dark-400 mb-3 uppercase tracking-wider">
                <i class="fas fa-images mr-2"></i>Screenshots (${task.screenshots.length})
              </div>
              <div class="flex flex-wrap gap-4">
                ${task.screenshots.map(s => `
                  <a href="${s.path}" target="_blank" class="block group relative overflow-hidden rounded-xl">
                    <div class="absolute inset-0 bg-primary-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                        <i class="fas fa-external-link-alt text-white"></i>
                    </div>
                    <img src="${s.path}" alt="Screenshot" class="w-32 h-32 object-cover border-2 border-white/5 group-hover:border-primary-500 transition-all transform group-hover:scale-110">
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ` : ''}
          
          <!-- Timestamps -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/5">
            <div class="text-xs text-dark-400">
              <span class="uppercase tracking-wider font-bold">Criada em:</span>
              <span class="ml-2 font-mono text-dark-300">${formatDateTime(task.created_at)}</span>
            </div>
            ${task.completed_at ? `
              <div class="text-sm">
                <span class="text-gray-500">Concluída em:</span>
                <span class="ml-2 font-medium">${formatDateTime(task.completed_at)}</span>
              </div>
            ` : ''}
          </div>
          
          <!-- Actions -->
          <div class="flex gap-4 mt-6 pt-6 border-t border-white/5">
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
            <div class="relative mb-8 rounded-2xl overflow-hidden shadow-2xl" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(59, 130, 246, 0.3);">
                <!-- Animated background effect -->
                <div class="absolute inset-0 opacity-10" style="background: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(124, 58, 237, 0.3) 0%, transparent 50%);"></div>
                
                <div class="relative p-6">
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/50">
                                <i class="fas fa-database text-white text-xl"></i>
                            </div>
                            <div>
                                <h2 class="text-2xl font-bold text-white">
                                    SQL Playground
                                </h2>
                                <p class="text-xs text-gray-400 mt-0.5">Controle direto do banco de dados</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-lg shadow-red-500/50 animate-pulse">
                                <i class="fas fa-exclamation-triangle mr-1"></i>RISCO ALTO
                            </span>
                        </div>
                    </div>
                    
                    <!-- Query Interface -->
                    <div class="bg-black/30 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 shadow-inner mb-4">
                        <div class="flex gap-4 mb-4">
                            <div class="w-1/4">
                                <label class="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Operação</label>
                                <select id="sqlOperation" class="w-full bg-gray-800/80 border-2 border-gray-600 text-white rounded-lg p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 font-medium" onchange="handleSqlOperationChange(this)">
                                    <option value="SELECT">📊 SELECT</option>
                                    <option value="UPDATE">✏️ UPDATE</option>
                                    <option value="DELETE">🗑️ DELETE</option>
                                </select>
                            </div>
                            <div class="w-3/4">
                                <label class="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wide">Query SQL</label>
                                <div class="relative">
                                    <textarea id="sqlQuery" rows="4" class="w-full bg-gray-900 border-2 border-gray-700 text-green-400 font-mono text-sm rounded-lg p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 shadow-inner" placeholder="SELECT * FROM users LIMIT 10;"></textarea>
                                    <div class="absolute top-2 right-2 text-xs text-gray-600">
                                        <i class="fas fa-code"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button onclick="executeSql()" class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 transform hover:scale-105 active:scale-95">
                                <i class="fas fa-play mr-2"></i> Executar Script
                            </button>
                        </div>
                    </div>
                    
                    <!-- Results Area -->
                    <div id="sqlResults" class="hidden">
                        <div class="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
                            <div class="flex items-center gap-2 mb-3">
                                <i class="fas fa-chart-bar text-blue-400"></i>
                                <h3 class="text-sm font-bold text-gray-200 uppercase tracking-wide">Resultado</h3>
                            </div>
                            <div class="overflow-x-auto bg-black/40 rounded-lg p-3 max-h-72 overflow-y-auto border border-gray-800">
                                <div id="sqlOutput" class="text-xs font-mono"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mainContent.innerHTML = `
      <div class="max-w-5xl mx-auto animate-fade-in">
        <h1 class="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <div class="p-2 bg-primary-500/10 rounded-lg">
             <i class="fas fa-home text-primary-400"></i>
          </div>
          Home
        </h1>
        
        ${sqlPlaygroundHtml}
        
        <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <i class="fas fa-star text-yellow-500 animate-pulse"></i>
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
            <div id="sqlWarningModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style="background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px);">
                <div class="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl animate-scale-in" style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border: 2px solid #dc2626;">
                    <!-- Animated danger stripes in background -->
                    <div class="absolute inset-0 opacity-10" style="background: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(220, 38, 38, 0.3) 35px, rgba(220, 38, 38, 0.3) 70px);"></div>
                    
                    <!-- Glowing border effect -->
                    <div class="absolute inset-0 opacity-30 animate-pulse" style="box-shadow: inset 0 0 30px rgba(220, 38, 38, 0.5);"></div>
                    
                    <div class="relative p-8">
                        <!-- Icon Header -->
                        <div class="flex items-center gap-4 mb-6">
                            <div class="relative">
                                <div class="absolute inset-0 bg-red-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                <div class="relative bg-gradient-to-br from-red-600 to-red-700 rounded-full p-4 shadow-xl">
                                    <i class="fas fa-exclamation-triangle text-white text-3xl"></i>
                                </div>
                            </div>
                            <div>
                                <h3 class="text-2xl font-bold text-white mb-1">⚠️ Atenção Extrema!</h3>
                                <p class="text-red-300 text-sm font-medium">Operação Destrutiva Detectada</p>
                            </div>
                        </div>
                        
                        <!-- Warning Content -->
                        <div class="bg-black/40 backdrop-blur-sm rounded-xl p-5 mb-6 border border-red-900/50">
                            <p class="text-gray-200 leading-relaxed mb-4">
                                Você selecionou a operação <span class="px-2 py-1 bg-red-600 text-white font-bold rounded">${operation}</span>.
                            </p>
                            <p class="text-gray-300 text-sm leading-relaxed">
                                Alterações diretas no banco de dados são <strong class="text-red-400">irreversíveis</strong> e podem corromper todo o sistema se não executadas corretamente.
                            </p>
                        </div>
                        
                        <!-- Critical Warning Box -->
                        <div class="bg-gradient-to-r from-red-900/40 to-orange-900/40 backdrop-blur-sm p-4 rounded-xl mb-6 border-2 border-red-700/50 shadow-lg">
                            <div class="flex items-start gap-3">
                                <i class="fas fa-shield-alt text-red-400 text-lg mt-0.5"></i>
                                <div class="text-red-100 text-sm">
                                    <p class="font-bold mb-1">Lembre-se:</p>
                                    <ul class="list-disc list-inside space-y-1 text-xs">
                                        <li>Sempre use a cláusula <code class="bg-black/50 px-1.5 py-0.5 rounded font-mono text-yellow-300">WHERE</code></li>
                                        <li>Teste com <code class="bg-black/50 px-1.5 py-0.5 rounded font-mono text-yellow-300">LIMIT 1</code> primeiro</li>
                                        <li>Verifique os dados com um SELECT antes</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                            <button onclick="document.getElementById('sqlOperation').value='SELECT'; document.getElementById('sqlWarningModal').remove()" class="flex-1 px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95">
                                <i class="fas fa-arrow-left mr-2"></i>Cancelar
                            </button>
                            <button onclick="document.getElementById('sqlWarningModal').remove()" class="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold transition-all duration-200 shadow-lg shadow-red-500/50 hover:shadow-red-500/70 transform hover:scale-105 active:scale-95">
                                <i class="fas fa-check mr-2"></i>Ciente dos Riscos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            </style>
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
