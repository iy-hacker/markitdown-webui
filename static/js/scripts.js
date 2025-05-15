/**
 * Markitdown WebUI JavaScript
 * 各種UI操作とAPIとの連携を行うスクリプト
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初期化関数
    initUI();
    initHamburgerMenu();
    initFolderButtons();
    initInputTabs();
    initDropArea();
    initUrlForm();
    initModals();
    initTaskQueue();
    initTaskFilters();
    initTaskSearch();
    
    // 初期状態の表示設定
    applyPreferences();
});

/**
 * UI全般の初期化
 */
function initUI() {
    // アコーディオンは今回のバージョンでは<details>タグを使用するため、追加のJSは不要

    // アプリケーション情報の取得
    fetch('/api/config')
        .then(response => response.json())
        .then(config => {
            console.log('アプリケーション設定を読み込みました', config);
        })
        .catch(error => {
            console.error('設定情報の取得に失敗しました', error);
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
        const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
        hamburgerBtn.setAttribute('aria-expanded', !expanded);
        menuDropdown.classList.toggle('active');
        menuDropdown.setAttribute('aria-hidden', expanded);
    });
    
    // 外部クリックでメニューを閉じる
    document.addEventListener('click', (e) => {
        if (menuDropdown.classList.contains('active') && !menuDropdown.contains(e.target)) {
            menuDropdown.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
            menuDropdown.setAttribute('aria-hidden', 'true');
        }
    });
    
    // ダークモード切替
    toggleDarkMode.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        menuDropdown.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        menuDropdown.setAttribute('aria-hidden', 'true');
        
        // LocalStorageに設定を保存
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        
        // 通知表示
        showToast({
            type: 'info',
            title: isDarkMode ? 'ダークモードに切り替えました' : 'ライトモードに切り替えました',
            message: 'この設定はブラウザに保存されます'
        });
    });
    
    // レイアウト切替
    toggleLayout.addEventListener('click', () => {
        mainContent.classList.toggle('horizontal-layout');
        menuDropdown.classList.remove('active');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        menuDropdown.setAttribute('aria-hidden', 'true');
        
        // LocalStorageに設定を保存
        const isHorizontal = mainContent.classList.contains('horizontal-layout');
        localStorage.setItem('horizontalLayout', isHorizontal);
        
        // 通知表示
        showToast({
            type: 'info',
            title: isHorizontal ? '水平レイアウトに切り替えました' : '垂直レイアウトに切り替えました',
            message: 'この設定はブラウザに保存されます'
        });
    });
}

/**
 * 入力タブの初期化
 */
function initInputTabs() {
    const fileTab = document.getElementById('file-tab');
    const urlTab = document.getElementById('url-tab');
    const filePanel = document.getElementById('file-upload-panel');
    const urlPanel = document.getElementById('url-upload-panel');
    
    fileTab.addEventListener('click', () => {
        // アクティブなタブとパネルを切り替え
        fileTab.classList.add('active');
        urlTab.classList.remove('active');
        filePanel.classList.add('active');
        urlPanel.classList.remove('active');
        
        // アクセシビリティ属性を更新
        fileTab.setAttribute('aria-selected', 'true');
        urlTab.setAttribute('aria-selected', 'false');
    });
    
    urlTab.addEventListener('click', () => {
        // アクティブなタブとパネルを切り替え
        urlTab.classList.add('active');
        fileTab.classList.remove('active');
        urlPanel.classList.add('active');
        filePanel.classList.remove('active');
        
        // アクセシビリティ属性を更新
        urlTab.setAttribute('aria-selected', 'true');
        fileTab.setAttribute('aria-selected', 'false');
        
        // URL入力フィールドにフォーカス
        document.getElementById('url-input').focus();
    });
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
            showToast({
                type: 'error',
                title: '削除できません',
                message: 'デフォルトフォルダは削除できません'
            });
            return;
        }
        
        if (confirm('この保存先フォルダを削除しますか？フォルダ内のファイルも削除されます。')) {
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
                    updateActiveFolder(defaultFolder);
                }
                
                // フォルダを削除
                currentEditingFolder.remove();
                
                // モーダルを閉じる
                closeFolderEditModal();
                
                // 通知表示
                showToast({
                    type: 'success',
                    title: 'フォルダを削除しました',
                    message: `フォルダ "${currentEditingFolder.querySelector('span').textContent}" を削除しました`
                });
            })
            .catch(error => {
                showToast({
                    type: 'error',
                    title: 'エラー',
                    message: error.message
                });
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
            
            updateActiveFolder(button);
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
            openModal(folderEditModal);
        });
    });
  
    // 新規フォルダボタン
    addFolderBtn.addEventListener('click', () => {
        newFolderNameInput.value = '';
        openModal(newFolderModal);
    });
  
    // 編集モーダルを閉じる
    function closeFolderEditModal() {
        closeModal(folderEditModal);
        currentEditingFolder = null;
    }
  
    // 新規フォルダモーダルを閉じる
    function closeNewFolderModal() {
        closeModal(newFolderModal);
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
        if (newName === '') {
            showToast({
                type: 'error',
                title: '入力エラー',
                message: 'フォルダ名を入力してください'
            });
            return;
        }
        
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
            
            // 通知表示
            showToast({
                type: 'success',
                title: 'フォルダ名を更新しました',
                message: `フォルダ名を "${newName}" に変更しました`
            });
        })
        .catch(error => {
            showToast({
                type: 'error',
                title: 'エラー',
                message: error.message
            });
        });
    });
  
    // 新規フォルダを作成
    createFolderBtn.addEventListener('click', () => {
        const folderName = newFolderNameInput.value.trim();
        if (folderName === '') {
            showToast({
                type: 'error',
                title: '入力エラー',
                message: 'フォルダ名を入力してください'
            });
            return;
        }
        
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
            const newFolderButton = document.createElement('button');
            newFolderButton.className = 'folder-button';
            newFolderButton.setAttribute('data-folder', data.id);
            newFolderButton.setAttribute('aria-pressed', 'false');
            
            newFolderButton.innerHTML = `
                <span>${data.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="folder-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" aria-label="フォルダを編集">
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
                openModal(folderEditModal);
            });
            
            // フォルダ選択のイベントリスナーを追加
            newFolderButton.addEventListener('click', (e) => {
                if (e.target.closest('.folder-edit')) return;
                updateActiveFolder(newFolderButton);
            });
            
            // 追加ボタンの前に挿入
            const folderButtons = document.getElementById('folder-buttons');
            folderButtons.insertBefore(newFolderButton, addFolderBtn);
            
            // 新しいフォルダをアクティブに設定
            updateActiveFolder(newFolderButton);
            
            // モーダルを閉じる
            closeNewFolderModal();
            
            // 通知表示
            showToast({
                type: 'success',
                title: 'フォルダを作成しました',
                message: `新しいフォルダ "${data.name}" を作成しました`
            });
        })
        .catch(error => {
            showToast({
                type: 'error',
                title: 'エラー',
                message: error.message
            });
        });
    });
    
    // アクティブなフォルダを更新する関数
    function updateActiveFolder(folderButton) {
        if (activeFolderButton) {
            activeFolderButton.classList.remove('active');
            activeFolderButton.setAttribute('aria-pressed', 'false');
        }
        folderButton.classList.add('active');
        folderButton.setAttribute('aria-pressed', 'true');
        activeFolderButton = folderButton;
        
        // 現在のフォルダを保存
        localStorage.setItem('activeFolder', folderButton.getAttribute('data-folder'));
    }
    
    // 保存されたアクティブフォルダを適用
    const savedFolder = localStorage.getItem('activeFolder');
    if (savedFolder) {
        const savedFolderButton = document.querySelector(`.folder-button[data-folder="${savedFolder}"]`);
        if (savedFolderButton && savedFolderButton !== activeFolderButton) {
            updateActiveFolder(savedFolderButton);
        }
    }
}

/**
 * ドロップエリアの初期化
 */
function initDropArea() {
    const dropArea = document.getElementById('drop-area');
    
    // キーボード操作のサポート
    dropArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // ファイル選択ダイアログを表示
            simulateFileInput();
        }
    });
    
    // ドラッグ&ドロップのイベント
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-active');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-active');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-active');
        
        // ファイル処理
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });
    
    dropArea.addEventListener('click', () => {
        simulateFileInput();
    });
    
    function simulateFileInput() {
        // ファイル選択ダイアログを表示
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '.docx,.xlsx,.pptx,.pdf,.html,.htm,.txt,.doc,.xls,.ppt,.jpg,.jpeg,.png,.gif,.csv,.json,.xml';
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });
        
        fileInput.click();
    }
}

/**
 * ファイル処理
 */
function handleFiles(files) {
    // 現在のアクティブフォルダを取得
    const activeFolder = document.querySelector('.folder-button.active');
    const folderId = activeFolder ? activeFolder.getAttribute('data-folder') : 'default';
    
    // アップロードするファイル数をカウント
    let totalFiles = files.length;
    let processedFiles = 0;
    
    // 5ファイル以上の場合は通知
    if(totalFiles > 4) {
        showToast({
            type: 'info',
            title: `${totalFiles}個のファイルを処理します`,
            message: '処理が完了するまでお待ちください'
        });
    }
    
    // 各ファイルをアップロード
    Array.from(files).forEach(file => {
        uploadFile(file, folderId, () => {
            processedFiles++;
            if(processedFiles === totalFiles && totalFiles > 1) {
                showToast({
                    type: 'success',
                    title: 'アップロード完了',
                    message: `${totalFiles}個のファイルの処理が開始されました`
                });
            }
        });
    });
}

/**
 * ファイルアップロード処理
 */
function uploadFile(file, folder, callback) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
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
        
        if(callback) callback();
    })
    .catch(error => {
        // エラー状態に更新
        updateTaskStatus(tempTaskId, 'error');
        
        showToast({
            type: 'error',
            title: 'アップロードエラー',
            message: error.message
        });
        
        if(callback) callback();
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
            
            // 通知表示
            showToast({
                type: 'success',
                title: 'URLを追加しました',
                message: 'URLの処理が開始されました'
            });
        })
        .catch(error => {
            // エラー状態に更新
            updateTaskStatus(tempTaskId, 'error');
            
            showToast({
                type: 'error',
                title: 'エラー',
                message: error.message
            });
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
                closeModal(modal);
            }
        });
        
        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal(modal);
            }
        });
    });
    
    // ファイルプレビューモーダルの閉じるボタン
    const closePreviewBtn = document.getElementById('close-preview');
    const closeFilePreviewBtn = document.getElementById('close-file-preview');
    const filePreviewModal = document.getElementById('file-preview-modal');
    const copyMarkdownBtn = document.getElementById('copy-markdown');
    
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            closeModal(filePreviewModal);
        });
    }
    
    if (closeFilePreviewBtn) {
        closeFilePreviewBtn.addEventListener('click', () => {
            closeModal(filePreviewModal);
        });
    }
    
    // コピーボタンの実装
    if (copyMarkdownBtn) {
        copyMarkdownBtn.addEventListener('click', () => {
            const markdownContent = document.getElementById('markdown-preview').textContent;
            navigator.clipboard.writeText(markdownContent)
                .then(() => {
                    showToast({
                        type: 'success',
                        title: 'コピーしました',
                        message: 'マークダウン内容をクリップボードにコピーしました',
                        duration: 3000
                    });
                })
                .catch(err => {
                    showToast({
                        type: 'error',
                        title: 'コピーに失敗しました',
                        message: err.message,
                        duration: 3000
                    });
                });
        });
    }
}

/**
 * モーダルを開く
 */
function openModal(modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    
    // フォーカスをモーダル内の最初の入力要素に設定
    const firstInput = modal.querySelector('input, button:not(.modal-close)');
    if (firstInput) {
        firstInput.focus();
    }
    
    // スクロールを無効にする
    document.body.style.overflow = 'hidden';
}

/**
 * モーダルを閉じる
 */
function closeModal(modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    
    // スクロールを有効に戻す
    document.body.style.overflow = '';
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
            const noTasksMessage = document.getElementById('no-tasks-message');
            
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
                // インデックスにタスク情報を追加（成功したタスクの場合）
                indexTaskResult(task.id, task);
                
                if (existingTaskIds.has(task.id)) {
                    // 既存のタスクを更新（全タスクデータを渡す）
                    updateTaskStatus(task.id, task.status, task);
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
            
            // タスクがあるかどうかで空メッセージの表示切り替え
            if (taskList.children.length === 0) {
                noTasksMessage.style.display = 'flex';
            } else {
                noTasksMessage.style.display = 'none';
            }
            
            // 現在のフィルターを適用
            applyTaskFilter();
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
    const noTasksMessage = document.getElementById('no-tasks-message');
    
    // タスク情報をインデックスに追加
    indexTaskResult(task.id, task);
    
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
    row.setAttribute('data-status', task.status);
    row.setAttribute('data-filename', task.filename);
    row.setAttribute('data-folder', task.folder);
    if (task.output_path) {
        row.setAttribute('data-output-path', task.output_path);
    }
    
    // ファイル名を短くする（30文字以上の場合）
    let displayFilename = task.filename;
    if (displayFilename.length > 30) {
        displayFilename = displayFilename.substring(0, 27) + '...';
    }
    
    // URLの場合はホスト名を表示
    if (displayFilename.startsWith('http')) {
        try {
            const url = new URL(task.filename);
            displayFilename = url.hostname + url.pathname.substring(0, 20);
            if (url.pathname.length > 20) displayFilename += '...';
        } catch (e) {
            // URLのパース失敗時は元の表示を使用
        }
    }
    
    row.innerHTML = `
        <td>${dateStr}<br />${timeStr}</td>
        <td title="${task.filename}">${displayFilename}</td>
        <td>${getStatusBadge(task.status)}</td>
        <td>${task.folder}</td>
        <td class="task-actions-cell">
            <button class="view-result" title="結果を表示" ${task.status !== 'success' ? 'disabled' : ''}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
        </td>
    `;
    
    // 結果表示ボタンのイベントリスナー
    const viewResultBtn = row.querySelector('.view-result');
    if (viewResultBtn) {
        viewResultBtn.addEventListener('click', () => {
            if (task.status === 'success') {
                // デバッグログ
                console.log('View result clicked for task:', task);
                console.log('Row attributes:', {
                    'data-output-path': row.getAttribute('data-output-path'),
                    'data-folder': row.getAttribute('data-folder'),
                    'data-filename': row.getAttribute('data-filename')
                });
                
                // 出力パスがある場合はそれを使用
                const outputPath = row.getAttribute('data-output-path');
                if (outputPath) {
                    console.log('Using output path:', outputPath);
                    previewMarkdownFile(outputPath, getFileNameFromPath(outputPath));
                } else {
                    console.log('No output path, using folder and filename');
                    // フォルダとファイル名から推測して表示
                    const folder = row.getAttribute('data-folder');
                    const filename = row.getAttribute('data-filename');
                    findAndPreviewMarkdownFile(folder, filename);
                }
            }
        });
    }
    
    // テーブルの先頭に追加
    if (taskList.firstChild) {
        taskList.insertBefore(row, taskList.firstChild);
    } else {
        taskList.appendChild(row);
    }
    
    // 空メッセージを非表示に
    noTasksMessage.style.display = 'none';
    
    // 現在のフィルターを適用
    applyTaskFilter();
}

/**
 * 特定のタスクのステータスを更新
 */
function updateTaskStatus(taskId, status, taskData) {
    const row = document.querySelector(`#task-list tr[data-task-id="${taskId}"]`);
    if (row) {
        const statusCell = row.querySelector('td:nth-child(3)');
        updateStatusCell(statusCell, status);
        
        // ステータス属性も更新
        row.setAttribute('data-status', status);
        
        // 追加データがある場合は更新
        if (taskData) {
            // 出力パスを更新
            if (taskData.output_path) {
                row.setAttribute('data-output-path', taskData.output_path);
            }
            
            // その他必要なデータを更新
            if (taskData.folder) {
                row.setAttribute('data-folder', taskData.folder);
            }
            
            if (taskData.filename) {
                row.setAttribute('data-filename', taskData.filename);
            }
        }
        
        // 成功時にはビューボタンを有効化
        if (status === 'success') {
            const viewBtn = row.querySelector('.view-result');
            if (viewBtn) {
                viewBtn.disabled = false;
            }
        }
    }
}

/**
 * ステータスセルを更新
 */
function updateStatusCell(cell, status) {
    // バッジで更新
    cell.innerHTML = getStatusBadge(status);
}

/**
 * ステータスバッジを生成
 */
function getStatusBadge(status) {
    let icon = '';
    let text = '';
    
    switch (status) {
        case 'waiting':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
            text = '待機中';
            break;
        case 'processing':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>';
            text = '処理中';
            break;
        case 'success':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            text = '完了';
            break;
        case 'error':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            text = 'エラー';
            break;
        case 'canceled':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>';
            text = 'キャンセル';
            break;
        default:
            text = status;
    }
    
    return `<span class="status-badge status-${status}">${icon} ${text}</span>`;
}

/**
 * 仮のタスクを正式なタスクで置き換え
 */
function replaceTask(tempTaskId, task) {
    const row = document.querySelector(`#task-list tr[data-task-id="${tempTaskId}"]`);
    if (row) {
        row.setAttribute('data-task-id', task.id);
        // 出力パスを含むすべてのデータを更新
        updateTaskStatus(task.id, task.status, task);
    } else {
        // 見つからない場合は追加
        addTaskToTable(task);
    }
}

/**
 * タスクフィルターの初期化
 */
function initTaskFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブなフィルターを変更
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            
            // フィルターを適用
            applyTaskFilter();
        });
    });
}

/**
 * 現在のフィルター設定に基づいてタスクをフィルタリング
 */
function applyTaskFilter() {
    const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
    const searchTerm = document.getElementById('task-search').value.toLowerCase();
    const tasks = document.querySelectorAll('#task-list tr');
    
    tasks.forEach(task => {
        const status = task.getAttribute('data-status');
        const filename = task.getAttribute('data-filename').toLowerCase();
        const folder = task.getAttribute('data-folder').toLowerCase();
        
        // ステータスフィルター
        const statusMatch = activeFilter === 'all' || status === activeFilter;
        
        // 検索フィルター
        const searchMatch = searchTerm === '' || 
                            filename.includes(searchTerm) || 
                            folder.includes(searchTerm);
        
        // 両方のフィルターに一致する場合のみ表示
        if (statusMatch && searchMatch) {
            task.style.display = '';
        } else {
            task.style.display = 'none';
        }
    });
}

/**
 * タスク検索の初期化
 */
function initTaskSearch() {
    const searchInput = document.getElementById('task-search');
    
    searchInput.addEventListener('input', () => {
        applyTaskFilter();
    });
}

/**
 * ファイルエクスプローラーの初期化とページ読み込み関連の削除
 * 代わりにMarkdownプレビュー機能のみを残す
 */
 
/**
 * ファイルとフォルダの関連付け情報を保存するインデックス
 */
const fileIndex = {};

// タスクの結果を確認し、ファイルの出力先情報を保存する
function indexTaskResult(taskId, task) {
    if (task.status === 'success' && task.output_path) {
        // ファイルと出力先を関連付ける
        const originalFilename = task.filename;
        const folder = task.folder;
        const key = `${folder}:${originalFilename}`;
        
        fileIndex[key] = {
            output_path: task.output_path,
            output_filename: task.output_path.split('/').pop()
        };
        
        // デバッグ用
        console.log(`Indexed: ${key} -> ${task.output_path}`);
    }
}

/**
 * フォルダとオリジナルファイル名からMarkdownファイルを探して表示
 */
function findAndPreviewMarkdownFile(folder, originalFilename) {
    // originalFilenameの拡張子を除いたベース部分
    let baseName = originalFilename;
    if (baseName.lastIndexOf('.') !== -1) {
        baseName = baseName.substring(0, baseName.lastIndexOf('.'));
    }
    
    // URLの場合は特別処理（URLはそのままでは使えないため）
    if (baseName.startsWith('http')) {
        // フォルダ内のすべてのMarkdownファイルを取得
        fetch(`/explore/${folder}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('フォルダ内容の取得に失敗しました');
                }
                return response.json();
            })
            .then(data => {
                // Markdownファイルのみをフィルタリング
                const markdownFiles = data.files.filter(file => 
                    !file.is_directory && file.extension === 'md'
                );
                
                // タイムスタンプで最新のものを表示
                if (markdownFiles.length > 0) {
                    // 最新ファイルを取得（最近作成されたファイルが最も可能性が高い）
                    const latestFile = markdownFiles.sort((a, b) => {
                        return new Date(b.modified_date) - new Date(a.modified_date);
                    })[0];
                    
                    previewMarkdownFile(latestFile.path, latestFile.name);
                } else {
                    showToast({
                        type: 'error',
                        title: 'ファイルが見つかりません',
                        message: `フォルダ ${folder} にMarkdownファイルがありません`
                    });
                }
            })
            .catch(error => {
                showToast({
                    type: 'error',
                    title: 'エラー',
                    message: error.message
                });
            });
        return;
    }
    
    // 日付パターンを含む可能性のあるファイル名を作成
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const possiblePath = `${folder}/${baseName}.${dateStr}.md`;
    
    // まず可能性の高いパスでチェック
    fetch(`/output/${possiblePath}`)
        .then(response => {
            if (response.ok) {
                return previewMarkdownFile(possiblePath, `${baseName}.${dateStr}.md`);
            }
            
            // 失敗した場合はフォルダ内の全ファイルを確認
            return fetch(`/explore/${folder}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('フォルダ内容の取得に失敗しました');
                    }
                    return response.json();
                })
                .then(data => {
                    // ベース名を含むMarkdownファイルを検索
                    const matchingFiles = data.files.filter(file => 
                        !file.is_directory && 
                        file.extension === 'md' && 
                        file.name.includes(baseName)
                    );
                    
                    if (matchingFiles.length > 0) {
                        // 最初に見つかったファイルを表示
                        previewMarkdownFile(matchingFiles[0].path, matchingFiles[0].name);
                    } else {
                        showToast({
                            type: 'error',
                            title: 'ファイルが見つかりません',
                            message: `${baseName} に関連するMarkdownファイルが見つかりません`
                        });
                    }
                });
        })
        .catch(error => {
            showToast({
                type: 'error',
                title: 'エラー',
                message: error.message
            });
        });
}

/**
 * マークダウンファイルのプレビュー
 */
function previewMarkdownFile(filePath, fileName) {
    const previewModal = document.getElementById('file-preview-modal');
    const previewTitle = document.getElementById('file-preview-title');
    const markdownPreview = document.getElementById('markdown-preview');
    const downloadLink = document.getElementById('download-file');
    
    // モーダルタイトルとダウンロードリンクを設定
    previewTitle.textContent = `プレビュー: ${fileName}`;
    downloadLink.href = `/output/${filePath}`;
    downloadLink.download = fileName;
    
    // 読み込み表示
    markdownPreview.innerHTML = '<div class="loading-spinner"></div><p>読み込み中...</p>';
    
    // ファイル内容を取得
    fetch(`/output/${filePath}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('ファイルの読み込みに失敗しました');
            }
            return response.text();
        })
        .then(markdown => {
            // マークダウンをそのまま表示（コピー可能にする）
            markdownPreview.textContent = markdown;
            
            // モーダルを表示
            openModal(previewModal);
        })
        .catch(error => {
            markdownPreview.innerHTML = `<p class="error">エラー: ${error.message}</p>`;
            
            // モーダルを表示
            openModal(previewModal);
            
            showToast({
                type: 'error',
                title: 'ファイル読み込みエラー',
                message: error.message
            });
        });
}

/**
 * 非常に単純なマークダウンからHTMLへの変換関数
 * 注: 実際の実装では、marked.jsなどのライブラリを使用することをお勧めします
 */
function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown
        // エスケープ
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        
        // 見出し
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        
        // 強調
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // リンク
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        
        // コード
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        
        // リスト
        .replace(/^\s*- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
        
        // 段落
        .replace(/^(?!<[uh123456]|<li|<\/ul>)(.*$)/gm, '<p>$1</p>')
        
        // 空の段落を削除
        .replace(/<p><\/p>/g, '');
    
    return html;
}

/**
 * ファイルサイズをフォーマット
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * トースト通知を表示
 */
function showToast(options) {
    const { type = 'info', title, message, duration = 5000 } = options;
    const toastContainer = document.getElementById('toast-container');
    
    // アイコンを選択
    let icon;
    switch (type) {
        case 'success':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            break;
        case 'error':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
            break;
        case 'warning':
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            break;
        default:
            icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }
    
    // トースト要素を作成
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        ${icon}
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="閉じる">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    // トースト閉じるボタンのイベントリスナー
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    // コンテナに追加
    toastContainer.appendChild(toast);
    
    // 一定時間後に自動的に消える
    const timeoutId = setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    // タイムアウトIDを保存（ユーザーが手動で閉じた場合にクリアするため）
    toast._timeoutId = timeoutId;
    
    return toast;
}

/**
 * トースト通知を削除
 */
function removeToast(toast) {
    // すでに削除中の場合はスキップ
    if (toast.classList.contains('removing')) return;
    
    // タイムアウトをクリア
    if (toast._timeoutId) {
        clearTimeout(toast._timeoutId);
    }
    
    // アニメーションクラスを追加
    toast.classList.add('removing');
    
    // アニメーション終了後に要素を削除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300); // アニメーション時間と合わせる
}

/**
 * 保存された設定を適用
 */
function applyPreferences() {
    // ダークモード
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
    
    // レイアウト
    if (localStorage.getItem('horizontalLayout') === 'true') {
        document.getElementById('main-content').classList.add('horizontal-layout');
    }
}