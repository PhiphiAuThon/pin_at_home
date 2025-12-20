import { toggleBrowseMode } from '../browseMode.js';
import { deleteBoardCache, getUnifiedBoards } from '../../cache.js';
import { saveDirectoryHandle } from '../../utils/localFolderManager.js';
import { state, updateState } from '../../state.js';
import { renderPins } from '../grid.js';

// Callbacks set by parent
let onBoardSwitch = null;
let onBoardDeleted = null;

export function setBoardMenuCallbacks({ onSwitch, onDeleted }) {
  onBoardSwitch = onSwitch;
  onBoardDeleted = onDeleted;
}

export function createBoardMenu(boards, currentBoard) {
  const menu = document.createElement('div');
  menu.className = 'pin_at_home-board-menu';
  menu.id = 'pin_at_home-board-menu';
  
  const title = document.createElement('div');
  title.className = 'pin_at_home-board-title';
  title.id = 'pin_at_home-board-title';
  const isLocal = currentBoard.type === 'local' || currentBoard.cacheKey?.startsWith('local_');
  title.textContent = (isLocal ? currentBoard.boardName : capitalizeWords(currentBoard.boardName)) || 'Select Board';
  
  const items = document.createElement('div');
  items.className = 'pin_at_home-menu-items';
  items.id = 'pin_at_home-menu-items';
  
  if (boards.length >= 1) {
    items.appendChild(createBoardList(boards, currentBoard));
    items.appendChild(createMenuDivider());
  }
  
  items.appendChild(createLinkLocalFolderButton());
  items.appendChild(createBrowseButton());
  
  menu.appendChild(title);
  menu.appendChild(items);
  
  return menu;
}

function createBoardList(boards, currentBoard) {
  const fragment = document.createDocumentFragment();
  
  const label = document.createElement('div');
  label.style.cssText = 'color: rgba(255,255,255,0.5); font-size: 11px; padding: 4px 8px; text-transform: uppercase; letter-spacing: 1px;';
  label.textContent = 'Boards';
  fragment.appendChild(label);
  
  boards.slice(0, 10).forEach(board => {
    const row = document.createElement('div');
    row.className = 'pin_at_home-board-row';
    
    const btn = document.createElement('button');
    btn.className = 'pin_at_home-menu-btn board-item';
    if (board.cacheKey === currentBoard.cacheKey) btn.classList.add('active');
    
    if (board.type === 'local' || board.cacheKey.startsWith('local_')) {
      const folderIcon = '📁 ';
      btn.innerHTML = `<span class="pin-count">${folderIcon}</span> ${board.boardName}`;
    } else {
      const count = board.imageCount > 999 ? '999+' : board.imageCount;
      btn.innerHTML = `<span class="pin-count">${count}</span> ${capitalizeWords(board.boardName)}`;
    }
    btn.onclick = () => onBoardSwitch?.(board, boards);
    
    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'pin_at_home-delete-btn';
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Delete cache';
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${board.boardName}"?`)) {
        await deleteBoardCache(board.cacheKey);
        const updatedBoards = await getUnifiedBoards();
        onBoardDeleted?.(board, updatedBoards, currentBoard);
      }
    };
    
    row.appendChild(btn);
    row.appendChild(delBtn);
    fragment.appendChild(row);
  });
  
  return fragment;
}

function createBrowseButton() {
  const btn = document.createElement('button');
  btn.id = 'pin_at_home-browse-btn';
  btn.className = 'pin_at_home-menu-btn browse';
  btn.textContent = '🎨 Make Ref Sheet';
  btn.onclick = () => toggleBrowseMode(btn);
  return btn;
}

function createLinkLocalFolderButton() {
  const btn = document.createElement('button');
  btn.className = 'pin_at_home-menu-btn browse';
  btn.style.marginTop = '0';
  btn.innerHTML = '📁 Link Local Folder';
  
  // Create a hidden input for folder selection
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'file';
  hiddenInput.webkitdirectory = true;
  hiddenInput.style.display = 'none';

  hiddenInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      // Create a temporary "local board" from the files
      const firstFile = files[0];
      const folderName = (firstFile.webkitRelativePath && firstFile.webkitRelativePath.split('/')[0]) || 'Local Folder';
      const boardId = `local_session_${Date.now()}`;
      
      // Filter for images
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const imageFiles = files.filter(file => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        return validExtensions.includes(ext);
      });

      if (imageFiles.length === 0) {
        alert('No valid images found in the selected folder.');
        return;
      }

      // Generate Blob URLs
      const urls = imageFiles.map(file => URL.createObjectURL(file));
      const revokeAll = () => {
        urls.forEach(url => URL.revokeObjectURL(url));
        console.log(`Session: Revoked ${urls.length} Blob URLs`);
      };

      // Handle the "switch" manually for session boards
      if (state.revokeBlobUrls) {
        state.revokeBlobUrls();
      }

      updateState({ 
        cacheKey: boardId, 
        boardName: folderName, 
        pinsFound: urls, 
        revokeBlobUrls: revokeAll 
      });

      updateBoardTitle(folderName, true);
      renderPins();
      
      // Cleanup input
      hiddenInput.value = '';
    } catch (err) {
      console.error('Failed to process folder:', err);
      alert('Failed to process folder');
    }
  };

  btn.onclick = () => {
    hiddenInput.click();
  };
  
  return btn;
}

function createMenuDivider() {
  const div = document.createElement('div');
  div.className = 'pin_at_home-menu-divider';
  div.style.opacity = '1';
  return div;
}

export function updateBoardTitle(boardName, isLocal = false) {
  const title = document.getElementById('pin_at_home-board-title');
  if (title) title.textContent = isLocal ? boardName : capitalizeWords(boardName);
}

export function rebuildBoardMenu(boards, currentBoard) {
  const menuItems = document.getElementById('pin_at_home-menu-items');
  if (!menuItems) return;
  
  menuItems.innerHTML = '';
  
  if (boards.length >= 1) {
    menuItems.appendChild(createBoardList(boards, currentBoard || boards[0]));
    menuItems.appendChild(createMenuDivider());
  }
  
  menuItems.appendChild(createLinkLocalFolderButton());
  menuItems.appendChild(createBrowseButton());
}

export function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}
