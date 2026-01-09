const meetingTitle = document.getElementById('meetingTitle');
const meetingDate = document.getElementById('meetingDate');
const hasPassword = document.getElementById('hasPassword');
const meetingPassword = document.getElementById('meetingPassword');
const passwordField = document.getElementById('passwordField');
const userSearch = document.getElementById('userSearch');
const searchResults = document.getElementById('searchResults');
const selectedUsersDiv = document.getElementById('selectedUsers');
const meetingsList = document.getElementById('meetingsList');

const modal = document.getElementById('newMeetingModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalPanel = document.getElementById('modalPanel');

let selectedUserIds = new Set();
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Set user info in sidebar
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('userNameDisplay').textContent = user.name;
        document.getElementById('userInitials').textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    // Default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    meetingDate.value = now.toISOString().slice(0, 16);

    loadMeetings();

    // Event Listeners
    hasPassword.addEventListener('change', (e) => {
        if (e.target.checked) {
            passwordField.classList.remove('hidden');
        } else {
            passwordField.classList.add('hidden');
            meetingPassword.value = '';
        }
    });

    userSearch.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => searchUsers(e.target.value), 300);
    });

    // Close search on click outside
    document.addEventListener('click', (e) => {
        if (!userSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
});

function openNewMeetingModal() {
    modal.classList.remove('hidden');
    // Animation
    setTimeout(() => {
        modalBackdrop.classList.remove('opacity-0');
        modalPanel.classList.remove('opacity-0', 'scale-95');
    }, 10);
}

function closeNewMeetingModal() {
    modalBackdrop.classList.add('opacity-0');
    modalPanel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Reset form
        document.getElementById('newMeetingForm').reset();
        selectedUserIds.clear();
        renderSelectedUsers();
        passwordField.classList.add('hidden');
    }, 300);
}

async function searchUsers(query) {
    if (!query || query.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const users = res.data;
        renderSearchResults(users);
    } catch (error) {
        console.error('Search error:', error);
    }
}

function renderSearchResults(users) {
    searchResults.innerHTML = '';
    if (users.length === 0) {
        searchResults.innerHTML = '<div class="px-4 py-2 text-sm text-gray-400">Nenhum usuário encontrado</div>';
    } else {
        users.forEach(user => {
            if (selectedUserIds.has(user.id)) return;

            const div = document.createElement('div');
            div.className = 'px-4 py-2 hover:bg-white/5 cursor-pointer flex items-center gap-2 transition-colors';
            div.innerHTML = `
                <div class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                    ${user.name[0]}
                </div>
                <div>
                    <p class="text-sm font-medium text-white">${user.name}</p>
                    <p class="text-xs text-gray-400">@${user.username}</p>
                </div>
            `;
            div.onclick = () => selectUser(user);
            searchResults.appendChild(div);
        });
    }

    if (searchResults.children.length > 0) {
        searchResults.classList.remove('hidden');
    } else {
        searchResults.classList.add('hidden');
    }
}

function selectUser(user) {
    selectedUserIds.add(user.id);
    // Needed to store name for display? Yes.
    // Let's store object? No, Set stores values.
    // Just re-fetch? No.
    // Hack: Store object in a map? 
    // Simplified: Just re-render from a local array?
    // Let's create a visual chip immediately.

    // Actually, let's keep a map of id -> user
    if (!window.userMap) window.userMap = {};
    window.userMap[user.id] = user;

    renderSelectedUsers();
    userSearch.value = '';
    searchResults.classList.add('hidden');
}

function renderSelectedUsers() {
    selectedUsersDiv.innerHTML = '';
    selectedUserIds.forEach(id => {
        const user = window.userMap[id];
        if (!user) return;

        const chip = document.createElement('div');
        chip.className = 'flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 px-2 pl-2.5 py-1 rounded-full text-sm';
        chip.innerHTML = `
            <span>${user.name}</span>
            <button onclick="removeUser(${id})" class="hover:text-white transition-colors"><i class="fas fa-times"></i></button>
        `;
        selectedUsersDiv.appendChild(chip);
    });
}

function removeUser(id) {
    selectedUserIds.delete(id);
    renderSelectedUsers();
}

async function createMeeting() {
    const title = meetingTitle.value;
    const scheduled_at = meetingDate.value;
    const password = hasPassword.checked ? meetingPassword.value : null;

    if (!title || !scheduled_at) {
        alert('Por favor, preencha o título e a data.');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        await axios.post('/api/meetings', {
            title,
            scheduled_at,
            password,
            invite_ids: Array.from(selectedUserIds)
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        closeNewMeetingModal();
        loadMeetings();
        // Optional: Show toast
    } catch (error) {
        console.error('Create meeting error:', error);
        alert('Erro ao criar reunião.');
    }
}

async function loadMeetings() {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/meetings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        renderMeetingsList(res.data);
    } catch (error) {
        console.error('Load meetings error:', error);
        meetingsList.innerHTML = '<div class="col-span-full text-center text-red-400">Erro ao carregar reuniões</div>';
    }
}

function renderMeetingsList(meetings) {
    if (meetings.length === 0) {
        meetingsList.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
                <i class="fas fa-calendar-times text-4xl mb-4 opacity-50"></i>
                <p>Nenhuma reunião agendada.</p>
            </div>
        `;
        return;
    }

    meetingsList.innerHTML = meetings.map(meeting => {
        const date = new Date(meeting.scheduled_at);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isHost = meeting.role === 'host';

        return `
            <div class="group relative bg-[#1e293b]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-pink-500/30 hover:bg-[#1e293b]/80 transition-all duration-300">
                <div class="absolute top-4 right-4">
                    ${isHost
                ? '<span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg border border-purple-500/20">Host</span>'
                : '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg border border-blue-500/20">Convidado</span>'
            }
                </div>

                <div class="mb-4">
                    <p class="text-sm text-pink-400 font-medium mb-1 flex items-center gap-2">
                        <i class="far fa-clock"></i> ${dateStr} às ${timeStr}
                    </p>
                    <h3 class="text-xl font-bold text-white group-hover:text-pink-300 transition-colors">${meeting.title}</h3>
                    <p class="text-sm text-gray-400 mt-1">por @${meeting.creator_name}</p>
                </div>

                <div class="flex items-center gap-3 pt-4 border-t border-white/5 mt-auto">
                    <a href="/meet.html?room=${meeting.room_id}" class="flex-1 text-center bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors border border-white/10">
                        Entrar na Sala
                    </a>
                    <button onclick="copyLink('${meeting.room_id}')" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10" title="Copiar ID da Sala">
                        <i class="far fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function copyLink(id) {
    const url = `${window.location.origin}/meet.html?room=${id}`; // Or just ID
    // User probably just wants the generic link or just entering the ID.
    // Let's copy the full URL for convenience.
    navigator.clipboard.writeText(url).then(() => {
        // Simple visual feedback
        alert('Link copiado!'); // Or toast if we had one ready
    });
}
