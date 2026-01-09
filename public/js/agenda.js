const calendarGrid = document.getElementById('calendarGrid');
const currentMonthYear = document.getElementById('currentMonthYear');
const currentWeekRange = document.getElementById('currentWeekRange');

let currentWeekStart = new Date();
// Reset to previous Monday (or today if Monday)
const day = currentWeekStart.getDay();
const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
currentWeekStart.setDate(diff);
currentWeekStart.setHours(0, 0, 0, 0);

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Set user info
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        if (document.getElementById('userNameDisplay'))
            document.getElementById('userNameDisplay').textContent = user.name;
        if (document.getElementById('userInitials'))
            document.getElementById('userInitials').textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    renderWeek();
    loadMeetings();
});

function changeWeek(offset) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
    renderWeek();
    loadMeetings(); // Re-fetch or re-filter
}

function goToToday() {
    currentWeekStart = new Date();
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);
    renderWeek();
    loadMeetings();
}

async function loadMeetings() {
    try {
        const token = localStorage.getItem('token');
        // Fetch all (or filter by range if API supported it, but our API returns all user meetings)
        // Optimization: Filter locally for now
        const res = await axios.get('/api/meetings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const meetings = res.data;
        populateMeetings(meetings);
    } catch (error) {
        console.error('Error loading meetings:', error);
    }
}

function renderWeek() {
    calendarGrid.innerHTML = '';

    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Update Header
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    currentMonthYear.textContent = `${months[currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;
    if (currentWeekStart.getMonth() !== weekEnd.getMonth()) {
        currentMonthYear.textContent += ` / ${months[weekEnd.getMonth()]}`;
    }

    currentWeekRange.textContent = `${currentWeekStart.getDate()} - ${weekEnd.getDate()}`;

    // Render Grid Columns
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);

        const isToday = new Date().toDateString() === date.toDateString();

        const col = document.createElement('div');
        col.className = 'flex flex-col h-full border-r border-white/5 last:border-r-0';

        col.innerHTML = `
            <div class="calendar-day-header ${isToday ? 'bg-blue-500/10' : ''}">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">${days[i]}</p>
                <div class="${isToday ? 'w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30' : 'text-slate-200'} font-bold text-lg">
                    ${date.getDate()}
                </div>
            </div>
            <div class="calendar-day-body flex-1 relative ${isToday ? 'bg-blue-500/5' : ''}" id="day-${date.toDateString()}">
                <!-- Meetings inject here -->
            </div>
        `;

        calendarGrid.appendChild(col);
    }
}

function populateMeetings(meetings) {
    // Clear existing items in slots? No, renderWeek clears everything.
    // So we just iterate and append.

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    meetings.forEach(meeting => {
        const mDate = new Date(meeting.scheduled_at);

        // Check if in current week range
        if (mDate >= currentWeekStart && mDate < weekEnd) {
            const dayId = `day-${mDate.toDateString()}`;
            const container = document.getElementById(dayId);

            if (container) {
                const timeStr = mDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const isHost = meeting.role === 'host';

                const card = document.createElement('div');
                // Use a different color for host vs guest
                const bgClass = isHost ? 'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30' : 'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30';
                const accentColor = isHost ? 'text-purple-300' : 'text-blue-300';

                card.className = `p-3 rounded-xl border ${bgClass} cursor-pointer transition-all group relative`;
                card.innerHTML = `
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-mono font-bold ${accentColor}">${timeStr}</span>
                        ${meeting.password_hash ? '<i class="fas fa-lock text-[10px] text-pink-400"></i>' : ''}
                    </div>
                    <h4 class="text-sm font-semibold text-white leading-tight mb-1 truncate">${meeting.title}</h4>
                    <div class="flex items-center gap-1.5 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div class="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] text-white">
                            ${meeting.creator_name[0]}
                        </div>
                        <span class="text-[10px] text-slate-300 truncate">@${meeting.creator_name}</span>
                    </div>
                `;

                // Allow click to join
                card.onclick = () => {
                    window.location.href = `/meet.html?room=${meeting.room_id}`;
                };

                container.appendChild(card);
            }
        }
    });

    // Sort meetings in each day container by time?
    // They are appended in order of iteration. API returns ordered?
    // Let's rely on API response order or do a sort here if needed.
    // Assuming API might not be perfectly ordered for this view logic.
    // But for MVP, default order is acceptable.
}
