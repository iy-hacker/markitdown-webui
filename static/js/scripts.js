document.addEventListener('DOMContentLoaded', () => {
    // アコーディオン機能の初期化
    initAccordion();
    
    // ハンバーガーメニューの初期化
    initHamburgerMenu();
    
    // フォルダボタンの初期化
    initFolderButtons();
    
    // ドロップエリアの初期化
    initDropArea();
    
    // URLフォームの初期化
    initUrlForm();
    
    // モーダルの初期化
    initModals();
    
    // タスク一覧の初期化
    initTaskQueue();
  });
  
  /**
   * アコーディオン機能の初期化
   */
  function initAccordion() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-target');
        const targetBody = document.getElementById(targetId);
        const icon = header.querySelector('.accordion-icon');
        
        // アコーディオンの開閉
        targetBody.classList.toggle('active');
        icon.classList.toggle('active');
      });
    });
  }
  
  /**
   * ハンバーガーメニューの初期化
   */
  function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    const toggleDarkMode = document.getElementById('toggle-dark-mode');
    const toggleLayout = document.getElementById('toggle-layout');
    const mainContent = document.getElementById('main-content');
    
    // ハンバーガーメニューの開閉
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('active');
    });
    
    // 外部クリックでメニューを閉じる
    document.addEventListener('click', (e) => {
      if (menuDropdown.classList.contains('active') && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.remove('active');
      }
    });
    
    // ダークモード切替
    toggleDarkMode.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      menuDropdown.classList.remove('active');
      
      // LocalStorageに設定を保存
      const isDarkMode = document.body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDarkMode);
    });
    
    // レイアウト切替
    toggleLayout.addEventListener('click', () => {
      mainContent.classList.toggle('horizontal-layout');
      menuDropdown.classList.remove('active');
      
      // LocalStorageに設定を保存
      const isHorizontal = mainContent.classList.contains('horizontal-layout');
      localStorage.setItem('horizontalLayout', isHorizontal);
    });
    
    // 保存された設定を適用
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }
    
    if (localStorage.getItem('horizontalLayout') === 'true') {
      mainContent.classList.add('horizontal-layout');
    }
  }
  
  /**
   * フォルダボタンの初期化
   */
  function initFolderButtons() {
    const folderButtons = document.querySelectorAll('.folder-button');
    const folderEditBtns = document.querySelectorAll('.folder-edit');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const folderEditModal = document.getElementById('folder-edit-modal');
    const newFolderModal = document.getElementById('new-folder-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const closeNewFolderModalBtn = document.getElementById('close-new-folder-modal');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const cancelNewFolderBtn = document.getElementById('cancel-new-folder');
    const saveFolderNameBtn = document.getElementById('save-folder-name');
    const createFolderBtn = document.getElementById('create-folder');
    const folderNameInput = document.getElementById('folder-name-input');
    const newFolderNameInput = document.getElementById('new-folder-name');
    const deleteFolderBtn = document.getElementById('delete-folder');
  
    let activeFolderButton = document.querySelector('.folder-button.active');
    let currentEditingFolder = null;
  
    // フォルダ削除ボタンのイベントリスナー
    deleteFolderBtn.addEventListener('click', () => {
      if (!currentEditingFolder) return;
      
      // デフォルトフォルダは削除できないようにする
      if (currentEditingFolder.getAttribute('data-folder') === 'default') {
        alert('デフォルトフォルダは削除できません。');
        return;
      }
      
      if (confirm('この保存先ボタンを削除しますか？')) {
        const folderId = currentEditingFolder.getAttribute('data-folder');
        
        // サーバーにフォルダ削除リクエスト
        fetch(`/api/folders/${folderId}`, {
          method: 'DELETE',
        })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.error || 'フォルダの削除に失敗しました');
            });
          }
          return response.json();
        })
        .then(data => {
          // 削除対象のフォルダがアクティブな場合、デフォルトフォルダをアクティブにする
          if (currentEditingFolder.classList.contains('active')) {
            const defaultFolder = document.querySelector('.folder-button[data-folder="default"]');
            defaultFolder.classList.add('active');
            activeFolderButton = defaultFolder;
            localStorage.setItem('activeFolder', 'default');
          }
          
          // フォルダを削除
          currentEditingFolder.remove();
          
          // モーダルを閉じる
          closeFolderEditModal();
        })
        .catch(error => {
          alert(error.message);
        });
      }
    });
  
// フォルダボタンの選択
folderButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // 編集アイコンをクリックした場合はイベントを伝播させない
      if (e.target.closest('.folder-edit')) {
        return;
      }
      
      // アクティブなボタンを切り替える
      activeFolderButton.classList.remove('active');
      button.classList.add('active');
      activeFolderButton = button;
      
      // 現在のフォルダを保存
      localStorage.setItem('activeFolder', button.getAttribute('data-folder'));
    });
  });
  
  // フォルダ編集ボタン
  folderEditBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentEditingFolder = btn.closest('.folder-button');
      
      // フォルダ名を入力フィールドに設定
      const folderName = currentEditingFolder.querySelector('span').textContent;
      folderNameInput.value = folderName;
      
      // モーダルを表示
      folderEditModal.style.display = 'flex';
    });
  });
  
  // 新規フォルダボタン
  addFolderBtn.addEventListener('click', () => {
    newFolderNameInput.value = '';
    newFolderModal.style.display = 'flex';
  });
  
  // 編集モーダルを閉じる
  function closeFolderEditModal() {
    folderEditModal.style.display = 'none';
    currentEditingFolder = null;
  }
  
  // 新規フォルダモーダルを閉じる
  function closeNewFolderModal() {
    newFolderModal.style.display = 'none';
  }
  
  // モーダルを閉じるボタン
  closeModalBtn.addEventListener('click', closeFolderEditModal);
  closeNewFolderModalBtn.addEventListener('click', closeNewFolderModal);
  cancelEditBtn.addEventListener('click', closeFolderEditModal);
  cancelNewFolderBtn.addEventListener('click', closeNewFolderModal);
  
  // フォルダ名を保存
  saveFolderNameBtn.addEventListener('click', () => {
    if (!currentEditingFolder) return;
    
    const folderId = currentEditingFolder.getAttribute('data-folder');
    const newName = folderNameInput.value.trim();
    if (newName === '') return;
    
    // APIでフォルダ名を更新
    fetch(`/api/folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newName
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'フォルダ名の更新に失敗しました');
        });
      }
      return response.json();
    })
    .then(data => {
      // UI更新
      currentEditingFolder.querySelector('span').textContent = newName;
      currentEditingFolder.setAttribute('data-folder', data.id);
      
      // アクティブフォルダも更新
      if (currentEditingFolder.classList.contains('active')) {
        localStorage.setItem('activeFolder', data.id);
      }
      
      // モーダルを閉じる
      closeFolderEditModal();
    })
    .catch(error => {
      alert(error.message);
    });
  });
  
  // 新規フォルダを作成
  createFolderBtn.addEventListener('click', () => {
    const folderName = newFolderNameInput.value.trim();
    if (folderName === '') return;
    
    // APIでフォルダを作成
    fetch('/api/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'フォルダの作成に失敗しました');
        });
      }
      return response.json();
    })
    .then(data => {
      // 新しいフォルダボタンを作成
      const newFolderButton = document.createElement('div');
      newFolderButton.className = 'folder-button';
      newFolderButton.setAttribute('data-folder', data.id);
      
      newFolderButton.innerHTML = `
        <span>${data.name}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="folder-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      `;
      
      // 編集ボタンにイベントリスナーを追加
      const editBtn = newFolderButton.querySelector('.folder-edit');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentEditingFolder = newFolderButton;
        folderNameInput.value = data.name;
        folderEditModal.style.display = 'flex';
      });
      
      // フォルダ選択のイベントリスナーを追加
      newFolderButton.addEventListener('click', (e) => {
        if (e.target.closest('.folder-edit')) return;
        
        activeFolderButton.classList.remove('active');
        newFolderButton.classList.add('active');
        activeFolderButton = newFolderButton;
        
        localStorage.setItem('activeFolder', data.id);
      });
      
      // 追加ボタンの前に挿入
      const folderButtons = document.getElementById('folder-buttons');
      folderButtons.insertBefore(newFolderButton, addFolderBtn);
      
      // モーダルを閉じる
      closeNewFolderModal();
    })
    .catch(error => {
      alert(error.message);
    });
  });
  
  // 保存されたアクティブフォルダを適用
  const savedFolder = localStorage.getItem('activeFolder');
  if (savedFolder) {
    const savedFolderButton = document.querySelector(`.folder-button[data-folder="${savedFolder}"]`);
    if (savedFolderButton && savedFolderButton !== activeFolderButton) {
      activeFolderButton.classList.remove('active');
      savedFolderButton.classList.add('active');
      activeFolderButton = savedFolderButton;
    }
  }
}

/**
 * ドロップエリアの初期化
 */
function initDropArea() {
  const dropArea = document.getElementById('drop-area');
  
  // ドラッグ&ドロップのイベント
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('active');
  });
  
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('active');
  });
  
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('active');
    
    // ファイル処理
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  });
  
  dropArea.addEventListener('click', () => {
    // ファイル選択ダイアログを表示
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.docx,.xlsx,.pptx,.pdf,.html,.htm,.txt,.doc,.xls,.ppt';
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    });
    
    fileInput.click();
  });
}

/**
 * ファイル処理
 */
function handleFiles(files) {
  // 現在のアクティブフォルダを取得
  const activeFolder = document.querySelector('.folder-button.active');
  const folderId = activeFolder ? activeFolder.getAttribute('data-folder') : 'default';
  
  // 各ファイルをアップロード
  Array.from(files).forEach(file => {
    uploadFile(file, folderId);
  });
}

/**
 * ファイルアップロード処理
 */
function uploadFile(file, folder) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  
  // ファイル名とアップロード時間をタスクリストに追加
  const timeStr = new Date().toLocaleString('ja-JP');
  
  // 仮のタスクID (サーバーからのレスポンスで更新される)
  const tempTaskId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // タスクリストに追加
  addTaskToTable({
    id: tempTaskId,
    added_at: new Date().toISOString(),
    filename: file.name,
    status: 'waiting',
    folder: folder
  });
  
  // アップロードリクエスト
  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new Error(data.error || 'ファイルのアップロードに失敗しました');
      });
    }
    return response.json();
  })
  .then(data => {
    // 仮のタスクを正式なタスクで置き換え
    replaceTask(tempTaskId, {
      id: data.task_id,
      added_at: new Date().toISOString(),
      filename: file.name,
      status: data.status,
      folder: folder
    });
  })
  .catch(error => {
    // エラー状態に更新
    updateTaskStatus(tempTaskId, 'error');
    alert(error.message);
  });
}

/**
 * URLフォームの初期化
 */
function initUrlForm() {
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const url = urlInput.value.trim();
    if (url === '') return;
    
    // 現在のアクティブフォルダを取得
    const activeFolder = document.querySelector('.folder-button.active');
    const folderId = activeFolder ? activeFolder.getAttribute('data-folder') : 'default';
    
    // 仮のタスクID (サーバーからのレスポンスで更新される)
    const tempTaskId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // タスクリストに追加
    addTaskToTable({
      id: tempTaskId,
      added_at: new Date().toISOString(),
      filename: url,
      status: 'waiting',
      folder: folderId
    });
    
    // URL処理リクエスト
    fetch('/api/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        folder: folderId
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'URLの処理に失敗しました');
        });
      }
      return response.json();
    })
    .then(data => {
      // 仮のタスクを正式なタスクで置き換え
      replaceTask(tempTaskId, {
        id: data.task_id,
        added_at: new Date().toISOString(),
        filename: url,
        status: data.status,
        folder: folderId
      });
    })
    .catch(error => {
      // エラー状態に更新
      updateTaskStatus(tempTaskId, 'error');
      alert(error.message);
    });
    
    // フォームをリセット
    urlForm.reset();
  });
}

/**
 * モーダルの初期化
 */
function initModals() {
  const modals = document.querySelectorAll('.modal-overlay');
  
  // モーダル外をクリックして閉じる
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

/**
 * タスクキューの初期化と更新
 */
function initTaskQueue() {
  // 初期タスク一覧の読み込み
  loadTasks();
  
  // 定期的なタスク更新
  setInterval(loadTasks, 5000);
}

/**
 * タスク一覧の読み込み
 */
function loadTasks() {
  fetch('/api/tasks')
    .then(response => response.json())
    .then(tasks => {
      // タスクリストをすべて更新
      const taskList = document.getElementById('task-list');
      
      // 既存のタスクIDを記録
      const existingTaskIds = new Set();
      document.querySelectorAll('#task-list tr[data-task-id]').forEach(row => {
        const taskId = row.getAttribute('data-task-id');
        if (!taskId.startsWith('temp-')) {
          existingTaskIds.add(taskId);
        }
      });
      
      // サーバーからのタスクを処理
      tasks.forEach(task => {
        if (existingTaskIds.has(task.id)) {
          // 既存のタスクを更新
          updateTaskStatus(task.id, task.status);
          existingTaskIds.delete(task.id);
        } else {
          // 新しいタスクを追加
          addTaskToTable(task);
        }
      });
      
      // サーバーにないタスクは削除（定期的な整理）
      existingTaskIds.forEach(taskId => {
        const row = document.querySelector(`#task-list tr[data-task-id="${taskId}"]`);
        if (row) {
          row.remove();
        }
      });
    })
    .catch(error => {
      console.error('タスク一覧の読み込みに失敗しました', error);
    });
}

/**
 * タスクをテーブルに追加
 */
function addTaskToTable(task) {
  const taskList = document.getElementById('task-list');
  
  // 日時のフォーマット
  const addedDate = new Date(task.added_at);
  const dateStr = addedDate.toLocaleDateString('ja-JP');
  const timeStr = addedDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  // 既存の行を探す
  const existingRow = document.querySelector(`#task-list tr[data-task-id="${task.id}"]`);
  if (existingRow) {
    // ステータスのみ更新
    const statusCell = existingRow.querySelector('td:nth-child(3)');
    updateStatusCell(statusCell, task.status);
    return;
  }
  
  // 新しい行を作成
  const row = document.createElement('tr');
  row.setAttribute('data-task-id', task.id);
  
  row.innerHTML = `
    <td>${dateStr}<br />${timeStr}</td>
    <td>${task.filename}</td>
    <td class="status-${task.status}">${getStatusText(task.status)}</td>
    <td>${task.folder}</td>
  `;
  
  // テーブルの先頭に追加
  if (taskList.firstChild) {
    taskList.insertBefore(row, taskList.firstChild);
  } else {
    taskList.appendChild(row);
  }
}

/**
 * 特定のタスクのステータスを更新
 */
function updateTaskStatus(taskId, status) {
  const row = document.querySelector(`#task-list tr[data-task-id="${taskId}"]`);
  if (row) {
    const statusCell = row.querySelector('td:nth-child(3)');
    updateStatusCell(statusCell, status);
  }
}

/**
 * ステータスセルを更新
 */
function updateStatusCell(cell, status) {
  // クラスを更新
  cell.className = `status-${status}`;
  
  // テキストを更新
  cell.textContent = getStatusText(status);
}

/**
 * 仮のタスクを正式なタスクで置き換え
 */
function replaceTask(tempTaskId, task) {
  const row = document.querySelector(`#task-list tr[data-task-id="${tempTaskId}"]`);
  if (row) {
    row.setAttribute('data-task-id', task.id);
    updateTaskStatus(task.id, task.status);
  } else {
    // 見つからない場合は追加
    addTaskToTable(task);
  }
}

/**
 * ステータスのテキスト表示を取得
 */
function getStatusText(status) {
  switch (status) {
    case 'waiting':
      return '待機中';
    case 'processing':
      return '処理中';
    case 'success':
      return '完了';
    case 'error':
      return 'エラー';
    case 'canceled':
      return 'キャンセル';
    default:
      return status;
  }
}