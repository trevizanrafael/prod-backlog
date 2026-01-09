const token = localStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user'));

if (!token) {
    window.location.href = '/login.html';
}

// Axios defaults
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// State
let currentFolderId = null;
let contextMenuItem = null; // { type: 'folder'|'file', id: number, name: string }
let itemToDelete = null; // Persist item for delete modal

// DOM Elements
const driveContent = document.getElementById('driveContent');
const foldersSection = document.getElementById('foldersSection');
const filesSection = document.getElementById('filesSection');
const foldersGrid = document.getElementById('foldersGrid');
const filesGrid = document.getElementById('filesGrid');
const breadcrumbsContainer = document.getElementById('breadcrumbs');
const emptyState = document.getElementById('emptyState');
const loader = document.getElementById('loader');

// Context Menu Elements
const contextMenu = document.getElementById('contextMenu');
const ctxDownload = document.getElementById('ctxDownload');
const ctxRename = document.getElementById('ctxRename');
const ctxDelete = document.getElementById('ctxDelete');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDriveContent();

    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    // Setup Context Menu Actions
    ctxDownload.addEventListener('click', () => {
        if (contextMenuItem && contextMenuItem.type === 'file') {
            downloadFile(contextMenuItem.id, contextMenuItem.name);
        }
        hideContextMenu();
    });

    ctxRename.addEventListener('click', () => {
        openRenameModal();
        hideContextMenu();
    });

    ctxDelete.addEventListener('click', () => {
        openDeleteModal();
        hideContextMenu();
    });
});

// Load Content
async function loadDriveContent(folderId = null) {
    // Animation Start
    foldersGrid.classList.add('opacity-0', 'translate-y-4');
    filesGrid.classList.add('opacity-0', 'translate-y-4');

    // Tiny delay to allow animation reset if needed
    await new Promise(r => setTimeout(r, 150));

    showLoader(true);
    currentFolderId = folderId;

    try {
        const params = folderId ? { folder_id: folderId } : {};
        const response = await axios.get('/api/drive', { params });
        const { folders, files, breadcrumbs } = response.data;

        renderBreadcrumbs(breadcrumbs);
        renderContent(folders, files);

        // Animation End
        setTimeout(() => {
            foldersGrid.classList.remove('opacity-0', 'translate-y-4');
            filesGrid.classList.remove('opacity-0', 'translate-y-4');
        }, 50);

    } catch (error) {
        console.error('Error loading drive:', error);
        showToast('Erro ao carregar arquivos', 'error');
    } finally {
        showLoader(false);
    }
}

// Render Functions
function renderBreadcrumbs(breadcrumbs) {
    let html = `<button onclick="loadDriveContent(null)" class="hover:text-white transition-colors flex items-center gap-2 ${!currentFolderId ? 'text-white font-medium' : ''}"><i class="fas fa-home"></i> Home</button>`;

    breadcrumbs.forEach((crumb, index) => {
        const isLast = index === 0; // Breadcrumbs come reversed from API order by level DESC?
        // API query: ORDER BY level DESC. So root is last in array? 
        // Logic in server.js: 
        // SELECT id, name FROM folder_path ORDER BY level DESC;
        // Wait, level 1 is root. level + 1 is child. 
        // So level DESC means deepest folder first.
        // We want Root -> ... -> Deepest.
        // So we should reverse the array.
    });

    // Server returns [Root, ..., Parent, Current] because of ORDER BY level DESC
    // So we don't need to reverse it.
    const path = breadcrumbs;

    path.forEach((crumb) => {
        html += `
            <span class="mx-2 text-dark-600">/</span>
            <button onclick="loadDriveContent(${crumb.id})" class="hover:text-white transition-colors ${crumb.id == currentFolderId ? 'text-white font-medium' : ''}">
                ${crumb.name}
            </button>
        `;
    });

    breadcrumbsContainer.innerHTML = html;
}

function renderContent(folders, files) {
    foldersGrid.innerHTML = '';
    filesGrid.innerHTML = '';

    const hasFolders = folders.length > 0;
    const hasFiles = files.length > 0;

    if (!hasFolders && !hasFiles) {
        foldersSection.classList.add('hidden');
        filesSection.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // Render Folders
    if (hasFolders) {
        foldersSection.classList.remove('hidden');
        folders.forEach(folder => {
            const el = document.createElement('div');
            el.className = 'drive-grid-item bg-dark-800/50 border border-white/5 rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative';
            el.innerHTML = `
                <div class="flex flex-col items-center text-center gap-3">
                    <i class="fas fa-folder text-4xl text-yellow-500/80 drop-shadow-lg group-hover:text-yellow-400 transition-colors"></i>
                    <span class="text-sm font-medium text-dark-200 group-hover:text-white truncate w-full">${folder.name}</span>
                </div>
            `;
            // el.onclick = () => loadDriveContent(folder.id); // Removed single click
            el.ondblclick = () => loadDriveContent(folder.id); // Double click to enter
            el.oncontextmenu = (e) => showContextMenu(e, 'folder', folder);
            foldersGrid.appendChild(el);
        });
    } else {
        foldersSection.classList.add('hidden');
    }

    // Render Files
    if (hasFiles) {
        filesSection.classList.remove('hidden');
        files.forEach(file => {
            const el = document.createElement('div');
            el.className = 'drive-grid-item bg-dark-800/50 border border-white/5 rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative aspect-square flex flex-col';

            let iconClass = getFileIcon(file.type);
            let previewHtml = `<i class="${iconClass} text-5xl mb-2 transition-transform group-hover:scale-110"></i>`;

            // Image Preview
            if (file.type.startsWith('image/')) {
                // Use a secure way to get content? 
                // We created /api/drive/files/:id/content. 
                // We can use that as src, passing token? 
                // Browsers don't send Authorization header on img src requests easily.
                // Alternative: Pre-signed URL or Cookie auth.
                // Or: fetch blob and create object URL (slower for many images).
                // Or: simpler, just an icon for now, and click to view/download.
                // Requirement: "Image Previews: If a file is an image, show a thumbnail preview"
                // Let's try to fetch small blob? Or just use the icon for MVP speed unless requested.
                // Wait, "Use FontAwesome icons... If image, show thumbnail".
                // Since our API requires Auth header, img src won't work directly unless we use cookies or query param token (insecure).
                // Let's implement Blob fetching for thumbnails.
                previewHtml = isLoadingPreview(file.id, file.name); // Placeholders
                fetchImagePreview(file.id, el);
            }

            el.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center overflow-hidden w-full">
                    ${previewHtml}
                </div>
                <div class="mt-2 text-center w-full">
                    <p class="text-xs font-medium text-dark-300 group-hover:text-white truncate w-full" title="${file.name}">${file.name}</p>
                    <p class="text-[10px] text-dark-500">${formatSize(file.size)}</p>
                </div>
            `;

            // Click to download/view
            // el.onclick = () => downloadFile(file.id, file.name); // Or maybe view?
            // Let's allow clicking to download.
            el.ondblclick = () => downloadFile(file.id, file.name);
            el.oncontextmenu = (e) => showContextMenu(e, 'file', file);
            filesGrid.appendChild(el);
        });
    } else {
        filesSection.classList.add('hidden');
    }
}

// Helpers
function getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf text-red-500';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'fas fa-file-word text-blue-500';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'fas fa-file-excel text-green-500';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'fas fa-file-powerpoint text-orange-500';
    if (mimeType.includes('image')) return 'fas fa-file-image text-purple-500';
    if (mimeType.includes('video')) return 'fas fa-file-video text-pink-500';
    if (mimeType.includes('audio')) return 'fas fa-file-audio text-yellow-500';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'fas fa-file-archive text-gray-500';
    if (mimeType.includes('code') || mimeType.includes('javascript') || mimeType.includes('html')) return 'fas fa-file-code text-cyan-500';
    return 'fas fa-file text-gray-400';
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function showLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
        driveContent.classList.add('opacity-50', 'pointer-events-none');
    } else {
        loader.classList.add('hidden');
        driveContent.classList.remove('opacity-50', 'pointer-events-none');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = message;

    toast.className = `fixed bottom-6 right-6 z-50 transform transition-all duration-300 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border `;

    if (type === 'success') toast.classList.add('bg-green-900/90', 'border-green-500/50', 'text-green-200', 'translate-y-0', 'opacity-100');
    else if (type === 'error') toast.classList.add('bg-red-900/90', 'border-red-500/50', 'text-red-200', 'translate-y-0', 'opacity-100');
    else toast.classList.add('bg-dark-800/90', 'border-white/10', 'text-white', 'translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// User Actions
async function createFolder() {
    const nameInput = document.getElementById('newFolderName');
    const name = nameInput.value.trim();
    if (!name) return;

    try {
        await axios.post('/api/drive/folders', {
            name,
            parent_id: currentFolderId
        });
        showToast('Pasta criada com sucesso!', 'success');
        closeNewFolderModal();
        nameInput.value = '';
        loadDriveContent(currentFolderId);
    } catch (error) {
        console.error(error);
        showToast('Erro ao criar pasta', 'error');
    }
}

function triggerUpload() {
    document.getElementById('fileInput').click();
}

async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 500 * 1024 * 1024) { // 500MB
        showToast('Arquivo muito grande (Max 500MB)', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) formData.append('folder_id', currentFolderId);

    showToast('Enviando arquivo...', 'info');

    try {
        await axios.post('/api/drive/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        showToast('Upload concluído!', 'success');
        input.value = ''; // Reset
        loadDriveContent(currentFolderId);
    } catch (error) {
        console.error(error);
        showToast('Erro no upload', 'error');
    }
}

// Context Menu
function showContextMenu(e, type, item) {
    e.preventDefault();
    contextMenuItem = { type, id: item.id, name: item.name };
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.classList.remove('hidden');

    // Toggle logic for download (folder vs file)
    ctxDownload.classList.toggle('hidden', type === 'folder');
}

function hideContextMenu() {
    contextMenu.classList.add('hidden');
    contextMenuItem = null;
}

// Modal Logic
function openNewFolderModal() {
    const modal = document.getElementById('newFolderModal');
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    document.getElementById('newFolderName').focus();
}

function closeNewFolderModal() {
    const modal = document.getElementById('newFolderModal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

// Rename Logic
function openRenameModal() {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    input.value = contextMenuItem.name;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
    input.focus();
}

function closeRenameModal() {
    const modal = document.getElementById('renameModal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

async function submitRename() {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName || !contextMenuItem) return;

    try {
        await axios.put('/api/drive/rename', {
            type: contextMenuItem.type,
            id: contextMenuItem.id,
            name: newName
        });
        showToast('Renomeado com sucesso!', 'success');
        closeRenameModal();
        loadDriveContent(currentFolderId);
    } catch (error) {
        console.error(error);
        showToast('Erro ao renomear', 'error');
    }
}

// Delete Modal Logic
function openDeleteModal() {
    if (!contextMenuItem) return;

    // Copy item to separate state because contextMenuItem gets cleared
    itemToDelete = { ...contextMenuItem };

    const modal = document.getElementById('deleteModal');
    const msg = document.getElementById('deleteMessage');

    msg.textContent = `Tem certeza que deseja excluir "${itemToDelete.name}"? Essa ação não pode ser desfeita.`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        itemToDelete = null; // Reset
    }, 200);
}

function confirmDelete() {
    console.log('Confirm Delete Clicked', itemToDelete);
    if (!itemToDelete) {
        console.error('No item to delete');
        return;
    }
    deleteItem(itemToDelete.type, itemToDelete.id);
    closeDeleteModal();
}

async function deleteItem(type, id) {
    try {
        await axios.delete(`/api/drive/${type}/${id}`);
        showToast('Item excluído', 'success');
        loadDriveContent(currentFolderId);
    } catch (error) {
        console.error(error);
        showToast('Erro ao excluir', 'error');
    }
}

async function downloadFile(id, name) {
    try {
        const response = await axios.get(`/api/drive/files/${id}/content`, {
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', name);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error(error);
        showToast('Erro ao baixar arquivo', 'error');
    }
}


function isLoadingPreview(id, name) {
    return `<div id="preview-${id}" class="w-full h-full flex items-center justify-center text-primary-500"><i class="fas fa-image text-4xl opacity-50"></i></div>`;
}

async function fetchImagePreview(id, container) {
    try {
        const response = await axios.get(`/api/drive/files/${id}/content`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(response.data);
        const img = document.createElement('img');
        img.src = url;
        img.className = 'w-full h-full object-cover rounded-lg';

        const previewDiv = container.querySelector(`#preview-${id}`);
        if (previewDiv) {
            previewDiv.replaceWith(img);
        }
    } catch (e) {
        // failed, keep icon
    }
}
