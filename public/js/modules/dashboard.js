// Dashboard Module - Analytics and charts

let dashboardCharts = {};

function getChartColors() {
    return {
        textColor: '#e2e8f0', // slate-200
        gridColor: 'rgba(255, 255, 255, 0.1)', // white/10
    };
}

async function loadDashboardModule() {
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-white mb-8">
        <i class="fas fa-chart-line mr-3 text-primary-400"></i>Dashboard
      </h1>
      
      <!-- Stats Cards -->
      <div id="statsCards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="spinner"></div>
      </div>
      
      <!-- Charts Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <!-- Monthly Trend -->
        <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
            <h3 class="text-lg font-semibold text-white mb-4">Tendência Mensal</h3>
            <div class="chart-container">
                <canvas id="monthlyTrendChart"></canvas>
            </div>
        </div>

        <!-- Time by Scope -->
        <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
            <h3 class="text-lg font-semibold text-white mb-4">Tempo por Escopo (Horas)</h3>
            <div class="chart-container">
                <canvas id="timeByScopeChart"></canvas>
            </div>
        </div>
        
        <!-- Bottlenecks -->
        <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
            <h3 class="text-lg font-semibold text-white mb-4">Gargalos (Atraso Médio)</h3>
            <div class="chart-container">
                <canvas id="bottlenecksChart"></canvas>
            </div>
        </div>

        <!-- Completed by Priority -->
        <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
          <h3 class="text-lg font-semibold text-white mb-4">
            Tasks Concluídas por Prioridade
          </h3>
          <div class="chart-container">
            <canvas id="completedByPriorityChart"></canvas>
          </div>
        </div>
        
        <!-- Tasks by Scope -->
        <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
          <h3 class="text-lg font-semibold text-white mb-4">
            Tasks por Escopo
          </h3>
          <div class="chart-container">
            <canvas id="tasksByScopeChart"></canvas>
          </div>
        </div>
        
        <!-- Tasks by Complexity -->
        <div class="card bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
          <h3 class="text-lg font-semibold text-white mb-4">
            Distribuição por Complexidade
          </h3>
          <div class="chart-container">
            <canvas id="tasksByComplexityChart"></canvas>
          </div>
        </div>
        
        <!-- Completion Rate -->
        <div class="card lg:col-span-2 bg-dark-800/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl shadow-xl">
          <h3 class="text-lg font-semibold text-white mb-4">
            Taxa de Conclusão
          </h3>
          <div class="chart-container">
            <canvas id="completionRateChart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;

    // Load dashboard data
    await loadDashboardData();
}

async function loadDashboardData() {
    try {
        const stats = await apiGet('/dashboard/stats');

        // Render stats cards
        renderStatsCards(stats);

        // Render charts
        renderCompletedByPriorityChart(stats.completedByPriority);
        renderTasksByScopeChart(stats.tasksByScope);
        renderTasksByComplexityChart(stats.tasksByComplexity);
        renderMonthlyTrendChart(stats.monthlyTrend);
        renderCompletionRateChart(stats);
        renderTimeByScopeChart(stats.timeByScope);
        renderBottlenecksChart(stats.bottlenecks);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        document.getElementById('statsCards').innerHTML = `
      <div class="col-span-4 text-center text-red-500">
        <p class="mb-2">Erro ao carregar dados do dashboard</p>
        <button onclick="loadDashboardModule()" class="text-blue-600 hover:underline">Tentar novamente</button>
      </div>
    `;
    }
}

function renderStatsCards(stats) {
    const container = document.getElementById('statsCards');

    container.innerHTML = `
    <div class="card stat-card bg-dark-800/50 border border-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-dark-800 transition-colors">
      <div class="stat-value text-3xl font-bold text-white mb-1">${stats.totalTasks}</div>
      <div class="stat-label text-gray-400 text-sm uppercase tracking-wider">Total de Tasks</div>
    </div>
    
    <div class="card stat-card bg-dark-800/50 border border-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-dark-800 transition-colors border-l-4 border-l-green-500">
      <div class="stat-value text-3xl font-bold text-white mb-1">${stats.actuallyCompleted}</div>
      <div class="stat-label text-gray-400 text-sm uppercase tracking-wider">Tasks Concluídas</div>
    </div>
    
    <div class="card stat-card bg-dark-800/50 border border-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-dark-800 transition-colors border-l-4 border-l-red-500">
      <div class="stat-value text-3xl font-bold text-white mb-1">${stats.overdueTasks}</div>
      <div class="stat-label text-gray-400 text-sm uppercase tracking-wider">Tasks Atrasadas</div>
    </div>
    
    <div class="card stat-card bg-dark-800/50 border border-white/5 backdrop-blur-sm rounded-2xl p-6 hover:bg-dark-800 transition-colors border-l-4 border-l-purple-500">
      <div class="stat-value text-3xl font-bold text-white mb-1">${stats.avgCompletionTime}</div>
      <div class="stat-label text-gray-400 text-sm uppercase tracking-wider">Dias Médios p/ Conclusão</div>
    </div>
  `;
}

function renderCompletedByPriorityChart(data) {
    const ctx = document.getElementById('completedByPriorityChart');
    const colors = getChartColors();

    if (dashboardCharts.completedByPriority) {
        dashboardCharts.completedByPriority.destroy();
    }

    const priorityMap = { high: 0, medium: 0, low: 0 };
    data.forEach(item => {
        priorityMap[item.priority] = parseInt(item.count);
    });

    dashboardCharts.completedByPriority = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Alta', 'Média', 'Baixa'],
            datasets: [{
                label: 'Tasks Concluídas',
                data: [priorityMap.high, priorityMap.medium, priorityMap.low],
                backgroundColor: [
                    'rgba(220, 38, 38, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                ],
                borderColor: [
                    'rgb(220, 38, 38)',
                    'rgb(245, 158, 11)',
                    'rgb(59, 130, 246)',
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                x: {
                    ticks: { color: colors.textColor },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTasksByScopeChart(data) {
    const ctx = document.getElementById('tasksByScopeChart');
    const colors = getChartColors();

    if (dashboardCharts.tasksByScope) {
        dashboardCharts.tasksByScope.destroy();
    }

    const labels = data.map(item => item.name);
    const counts = data.map(item => parseInt(item.count));

    const chartColors = [
        'rgba(59, 130, 246, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(236, 72, 153, 0.7)',
    ];

    dashboardCharts.tasksByScope = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colors.textColor }
                }
            }
        }
    });
}

function renderTasksByComplexityChart(data) {
    const ctx = document.getElementById('tasksByComplexityChart');
    const colors = getChartColors();

    if (dashboardCharts.tasksByComplexity) {
        dashboardCharts.tasksByComplexity.destroy();
    }

    const complexityMap = { easy: 0, normal: 0, hard: 0 };
    data.forEach(item => {
        complexityMap[item.complexity] = parseInt(item.count);
    });

    dashboardCharts.tasksByComplexity = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Fácil', 'Normal', 'Difícil'],
            datasets: [{
                data: [complexityMap.easy, complexityMap.normal, complexityMap.hard],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colors.textColor }
                }
            }
        }
    });
}

function renderMonthlyTrendChart(data) {
    const ctx = document.getElementById('monthlyTrendChart');
    const colors = getChartColors();

    if (dashboardCharts.monthlyTrend) {
        dashboardCharts.monthlyTrend.destroy();
    }

    const labels = data.map(item => {
        const [year, month] = item.month.split('-');
        return `${month}/${year}`;
    });
    const created = data.map(item => parseInt(item.created));
    const completed = data.map(item => parseInt(item.completed));

    dashboardCharts.monthlyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Criadas',
                    data: created,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Concluídas',
                    data: completed,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colors.textColor }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                x: {
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor }
                }
            }
        }
    });
}

function renderCompletionRateChart(stats) {
    const ctx = document.getElementById('completionRateChart');
    const colors = getChartColors();

    if (dashboardCharts.completionRate) {
        dashboardCharts.completionRate.destroy();
    }

    const pending = stats.totalTasks - stats.actuallyCompleted;
    const completed = stats.actuallyCompleted;
    const shouldBeCompleted = stats.shouldBeCompleted;

    dashboardCharts.completionRate = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Status das Tasks'],
            datasets: [
                {
                    label: 'Concluídas',
                    data: [completed],
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 2
                },
                {
                    label: 'Pendentes',
                    data: [pending],
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: 'rgb(245, 158, 11)',
                    borderWidth: 2
                },
                {
                    label: 'Atrasadas',
                    data: [shouldBeCompleted],
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colors.textColor }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                y: {
                    ticks: { color: colors.textColor },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderTimeByScopeChart(data) {
    const ctx = document.getElementById('timeByScopeChart').getContext('2d');
    const colors = getChartColors();

    if (dashboardCharts.timeByScope) {
        dashboardCharts.timeByScope.destroy();
    }

    dashboardCharts.timeByScope = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(t => t.name),
            datasets: [{
                data: data.map(t => t.total_seconds / 3600), // Convert to hours
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'
                ],
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: colors.textColor }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            return `${context.label}: ${value.toFixed(1)} horas`;
                        }
                    }
                }
            }
        }
    });
}

function renderBottlenecksChart(data) {
    const ctx = document.getElementById('bottlenecksChart').getContext('2d');
    const colors = getChartColors();

    if (dashboardCharts.bottlenecks) {
        dashboardCharts.bottlenecks.destroy();
    }

    dashboardCharts.bottlenecks = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(b => b.name),
            datasets: [{
                label: 'Atraso Médio (Dias)',
                data: data.map(b => parseFloat(b.avg_delay_days).toFixed(1)),
                backgroundColor: '#EF4444',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: colors.textColor }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: colors.textColor },
                    grid: { color: colors.gridColor }
                },
                x: {
                    ticks: { color: colors.textColor },
                    grid: { display: false }
                }
            }
        }
    });
}
