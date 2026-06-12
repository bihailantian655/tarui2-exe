let configs = [];
let runningProcesses = {};
let dragState = null;

function getTauriInvoke() {
  try {
    if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
      return window.__TAURI_INTERNALS__.invoke;
    }
  } catch (e) {}
  try {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return window.__TAURI__.core.invoke;
    }
  } catch (e) {}
  try {
    if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
      return window.__TAURI__.invoke;
    }
  } catch (e) {}
  try {
    if (window.__TAURI__ && window.__TAURI__.tauri && typeof window.__TAURI__.tauri.invoke === 'function') {
      return window.__TAURI__.tauri.invoke;
    }
  } catch (e) {}
  return null;
}

async function tauriInvoke(cmd, args) {
  const invoke = getTauriInvoke();
  if (!invoke) throw new Error('Tauri API 不可用');
  return await invoke(cmd, args || {});
}

function initData() {
  const saved = localStorage.getItem('ccswitch_configs');
  if (saved) {
    try {
      configs = JSON.parse(saved);
      configs = configs.map(c => ({ ...c, id: String(c.id) }));
    } catch (e) {
      configs = [];
    }
  }
  if (!configs || configs.length === 0) {
    configs = [
      { id: '1', name: 'deepseek', url: 'https://www.deepseek.com', icon: '\u{1F916}', enabled: false },
      { id: '2', name: 'qwen3.5', url: 'https://www.anthropic.com/claude-code', icon: '\u{1F9E0}', enabled: false },
      { id: '3', name: 'claude', url: 'https://www.anthropic.com/claude-code', icon: '\u{1F4AC}', enabled: false },
      { id: '4', name: 'claude 4b', url: 'https://www.anthropic.com/claude-code', icon: '\u{1F52E}', enabled: false },
      { id: '5', name: 'claudelogic', url: 'https://www.anthropic.com/claude-code', icon: '\u{1F9EA}', enabled: false }
    ];
    saveConfigs();
  }
}

function saveConfigs() {
  localStorage.setItem('ccswitch_configs', JSON.stringify(configs));
}

function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

function renderConfigList() {
  const container = document.getElementById('configList');
  if (configs.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>\u6682\u65E0\u914D\u7F6E\uFF0C\u8BF7\u70B9\u51FB\u53F3\u4E0A\u89D2 + \u6DFB\u52A0</p></div>';
    return;
  }
  container.innerHTML = configs.map((config, index) => {
    const scriptName = config.url ? config.url.split('\\').pop() : '\u672A\u9009\u62E9\u811A\u672C';
    const folderPath = config.folderPath || (config.url ? config.url.substring(0, config.url.lastIndexOf('\\')) : '');
    return `
    <div class="config-card" data-id="${config.id}" data-index="${index}">
      <span class="config-drag-handle" data-drag="true" title="\u62D6\u52A8\u6392\u5E8F">\u22EE</span>
      <div class="config-icon">${config.icon}</div>
      <div class="config-info">
        <div class="config-name">${config.name}</div>
        <div class="config-url">${folderPath}</div>
      </div>
      <span class="config-status">${scriptName}</span>
      <div class="config-actions">
        <button class="action-btn enable" data-action="run" data-id="${config.id}" title="\u8FD0\u884C\u811A\u672C">\u25B6</button>
        <button class="action-btn edit" data-action="edit" data-id="${config.id}" title="\u7F16\u8F91">\u270E</button>
        <button class="action-btn copy" data-action="copy" data-id="${config.id}" title="\u590D\u5236">\u2398</button>
        <button class="action-btn up" data-action="up" data-id="${config.id}" title="\u4E0A\u79FB" ${index === 0 ? 'style="opacity:0.3;pointer-events:none;"' : ''}>\u25B2</button>
        <button class="action-btn down" data-action="down" data-id="${config.id}" title="\u4E0B\u79FB" ${index === configs.length - 1 ? 'style="opacity:0.3;pointer-events:none;"' : ''}>\u25BC</button>
        <button class="action-btn delete" data-action="delete" data-id="${config.id}" title="\u5220\u9664">\u2715</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.config-drag-handle').forEach(handle => {
    handle.addEventListener('mousedown', onDragMouseDown);
  });
}

function onDragMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  const card = e.target.closest('.config-card');
  if (!card) return;
  const container = document.getElementById('configList');
  const cards = Array.from(container.querySelectorAll('.config-card'));
  const startIndex = parseInt(card.dataset.index);
  const cardRect = card.getBoundingClientRect();
  const offsetY = e.clientY - cardRect.top;
  const cardHeight = cardRect.height + 12;

  const placeholder = document.createElement('div');
  placeholder.className = 'drag-placeholder';
  placeholder.style.height = cardHeight + 'px';
  card.parentNode.insertBefore(placeholder, card);

  card.classList.add('dragging');
  card.style.position = 'fixed';
  card.style.width = cardRect.width + 'px';
  card.style.left = cardRect.left + 'px';
  card.style.top = (e.clientY - offsetY) + 'px';
  card.style.zIndex = '9999';
  card.style.pointerEvents = 'none';

  dragState = { card, placeholder, startIndex, offsetY, cards };

  document.addEventListener('mousemove', onDragMouseMove);
  document.addEventListener('mouseup', onDragMouseUp);
}

function onDragMouseMove(e) {
  if (!dragState) return;
  dragState.card.style.top = (e.clientY - dragState.offsetY) + 'px';

  const container = document.getElementById('configList');
  const allCards = Array.from(container.querySelectorAll('.config-card'));
  let insertBefore = null;

  for (const c of allCards) {
    if (c === dragState.card) continue;
    const rect = c.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      insertBefore = c;
      break;
    }
  }

  if (insertBefore) {
    container.insertBefore(dragState.placeholder, insertBefore);
  } else {
    container.appendChild(dragState.placeholder);
  }
}

function onDragMouseUp(e) {
  document.removeEventListener('mousemove', onDragMouseMove);
  document.removeEventListener('mouseup', onDragMouseUp);
  if (!dragState) return;

  const { card, placeholder, startIndex } = dragState;
  card.classList.remove('dragging');
  card.style.position = '';
  card.style.width = '';
  card.style.left = '';
  card.style.top = '';
  card.style.zIndex = '';
  card.style.pointerEvents = '';

  const container = document.getElementById('configList');
  const allElements = Array.from(container.children);
  const placeholderIndex = allElements.indexOf(placeholder);

  if (placeholderIndex !== -1 && placeholderIndex !== startIndex) {
    const movedItem = configs.splice(startIndex, 1)[0];
    configs.splice(placeholderIndex > startIndex ? placeholderIndex - 1 : placeholderIndex, 0, movedItem);
    saveConfigs();
  }

  if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
  dragState = null;
  renderConfigList();
}

function deleteConfig(id) {
  if (confirm('\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u914D\u7F6E\u5417\uFF1F')) {
    configs = configs.filter(c => c.id != id);
    saveConfigs();
    renderConfigList();
  }
}

async function runScript(id) {
  const config = configs.find(c => c.id == id);
  if (!config) return;
  const filePath = config.url;
  if (!filePath || !filePath.endsWith('.bat')) {
    alert('\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u6709\u6548\u7684 .bat \u811A\u672C\u6587\u4EF6');
    return;
  }
  try {
    await tauriInvoke('execute_script', { path: filePath });
  } catch (error) {
    alert('\u6267\u884C\u811A\u672C\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
  }
}

async function openEditModal(id) {
  const config = configs.find(c => c.id == id);
  if (!config) return;
  document.getElementById('editId').value = config.id;
  document.getElementById('editName').value = config.name;
  const defaultPath = 'C:\\Users\\bihai\\Desktop\\cla';
  const folderPath = config.folderPath || defaultPath;
  document.getElementById('editFolderPath').value = folderPath;
  document.getElementById('editIcon').value = config.icon;
  setIconPickerSelection(config.icon);
  document.getElementById('editNotes').value = '';
  if (folderPath) {
    const selectedFileName = config.url ? config.url.split('\\').pop() : '';
    await loadBatFiles(folderPath, selectedFileName);
  } else {
    document.getElementById('batList').innerHTML = '<div class="bat-list-empty">\u8BF7\u8F93\u5165\u6587\u4EF6\u5939\u8DEF\u5F84\u540E\u70B9\u51FB\u5237\u65B0\u6309\u94AE</div>';
  }
  document.getElementById('editModal').classList.add('show');
}

async function loadBatFiles(folderPath, selectedFile) {
  const batList = document.getElementById('batList');
  if (!folderPath) {
    batList.innerHTML = '<div class="bat-list-empty">\u8BF7\u8F93\u5165\u6587\u4EF6\u5939\u8DEF\u5F84</div>';
    return;
  }
  try {
    let batFiles = [];
    try {
      const entries = await tauriInvoke('read_dir', { path: folderPath });
      batFiles = entries.filter(e => e.name && e.name.endsWith('.bat')).map(e => e.name);
    } catch (err) {
      batFiles = ['demo_script.bat', 'backup.bat', 'deploy.bat'];
    }
    if (batFiles.length === 0) {
      batList.innerHTML = '<div class="bat-list-empty">\u8BE5\u6587\u4EF6\u5939\u4E2D\u6CA1\u6709 .bat \u6587\u4EF6</div>';
      return;
    }
    batList.innerHTML = batFiles.map(file => {
      const safeId = 'bat_' + file.replace(/[^a-zA-Z0-9_]/g, '_');
      return `<div class="bat-item ${file === selectedFile ? 'selected' : ''}">
        <input type="radio" name="batFile" value="${file}" id="${safeId}" ${file === selectedFile ? 'checked' : ''}>
        <label for="${safeId}">${file}</label>
      </div>`;
    }).join('');
    batList.querySelectorAll('.bat-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.type !== 'radio') {
          item.querySelector('input[type="radio"]').checked = true;
        }
        batList.querySelectorAll('.bat-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        document.getElementById('copyScriptBtn').disabled = false;
        document.getElementById('renameScriptBtn').disabled = false;
        document.getElementById('deleteScriptBtn').disabled = false;
        const fileName = item.querySelector('input').value;
        await loadBatContent(folderPath + '\\' + fileName);
      });
    });
  } catch (error) {
    batList.innerHTML = '<div class="bat-list-empty">\u9519\u8BEF: ' + String(error) + '</div>';
  }
}

async function loadBatContent(filePath) {
  const textarea = document.getElementById('editNotes');
  try {
    const content = await tauriInvoke('read_text_file', { path: filePath });
    textarea.value = content;
  } catch (error) {
    textarea.value = '// \u8BFB\u53D6\u6587\u4EF6\u5931\u8D25: ' + String(error);
  }
}

function copyConfig(id) {
  const config = configs.find(c => c.id == id);
  if (!config) return;
  const newConfig = { ...config, id: generateId(), name: config.name + ' copy', enabled: false };
  const index = configs.indexOf(config);
  configs.splice(index + 1, 0, newConfig);
  saveConfigs();
  renderConfigList();
}

function moveUp(id) {
  const index = configs.findIndex(c => c.id == id);
  if (index > 0) {
    [configs[index], configs[index - 1]] = [configs[index - 1], configs[index]];
    saveConfigs();
    renderConfigList();
  }
}

function moveDown(id) {
  const index = configs.findIndex(c => c.id == id);
  if (index >= 0 && index < configs.length - 1) {
    [configs[index], configs[index + 1]] = [configs[index + 1], configs[index]];
    saveConfigs();
    renderConfigList();
  }
}

async function runSelectedScript() {
  const selectedCard = document.querySelector('.config-card.selected');
  if (!selectedCard) {
    alert('\u8BF7\u5148\u9009\u4E2D\u4E00\u4E2A\u914D\u7F6E\u9879');
    return;
  }
  const configId = selectedCard.dataset.id;
  const config = configs.find(c => c.id === configId);
  if (!config || !config.url) {
    alert('\u914D\u7F6E\u9879\u6CA1\u6709\u8BBE\u7F6E\u811A\u672C\u8DEF\u5F84');
    return;
  }
  if (Object.keys(runningProcesses).length > 0) {
    const runningId = Object.keys(runningProcesses)[0];
    if (runningId === configId) {
      alert('\u8BE5\u811A\u672C\u5DF2\u7ECF\u5728\u8FD0\u884C\u4E2D');
      return;
    }
    if (!confirm('\u5DF2\u6709\u811A\u672C\u5728\u8FD0\u884C\u4E2D\uFF0C\u662F\u5426\u5148\u505C\u6B62\u5B83\u518D\u8FD0\u884C\u65B0\u811A\u672C\uFF1F')) return;
    await stopScriptById(runningId);
  }
  try {
    const result = await tauriInvoke('execute_script', { path: config.url });
    if (result && result.pid) {
      runningProcesses[configId] = result.pid;
      selectedCard.classList.add('running');
      updateControlButtons();
    }
  } catch (error) {
    alert('\u8FD0\u884C\u811A\u672C\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
  }
}

async function stopScriptById(configId) {
  const pid = runningProcesses[configId];
  if (!pid) return;
  try {
    await tauriInvoke('kill_process', { pid: pid });
  } catch (e) {}
  delete runningProcesses[configId];
  const card = document.querySelector('.config-card[data-id="' + configId + '"]');
  if (card) card.classList.remove('running');
}

async function stopSelectedScript() {
  const selectedCard = document.querySelector('.config-card.selected');
  if (!selectedCard) {
    alert('\u8BF7\u5148\u9009\u4E2D\u4E00\u4E2A\u914D\u7F6E\u9879');
    return;
  }
  const configId = selectedCard.dataset.id;
  const pid = runningProcesses[configId];
  if (!pid) {
    alert('\u6CA1\u6709\u6B63\u5728\u8FD0\u884C\u7684\u811A\u672C');
    return;
  }
  try {
    await tauriInvoke('kill_process', { pid: pid });
    delete runningProcesses[configId];
    selectedCard.classList.remove('running');
    updateControlButtons();
  } catch (error) {
    alert('\u505C\u6B62\u811A\u672C\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
  }
}

function updateControlButtons() {
  const selectedCard = document.querySelector('.config-card.selected');
  const startBtn = document.getElementById('startScriptBtn');
  const stopBtn = document.getElementById('stopScriptBtn');
  if (!selectedCard) {
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }
  const configId = selectedCard.dataset.id;
  const isRunning = runningProcesses[configId] !== undefined;
  startBtn.disabled = isRunning;
  stopBtn.disabled = !isRunning;
}

function updateSelection(card) {
  document.querySelectorAll('.config-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  updateControlButtons();
}

function initIconPicker() {
  const iconPicker = document.getElementById('iconPicker');
  if (!iconPicker) return;
  iconPicker.querySelectorAll('.icon-option').forEach(option => {
    option.addEventListener('click', () => {
      iconPicker.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      document.getElementById('editIcon').value = option.dataset.icon;
    });
  });
}

function setIconPickerSelection(icon) {
  const iconPicker = document.getElementById('iconPicker');
  if (!iconPicker) return;
  iconPicker.querySelectorAll('.icon-option').forEach(option => {
    option.classList.toggle('selected', option.dataset.icon === icon);
  });
}

let themeConfig = { mode: 'light', darkStartTime: '19:00', darkEndTime: '07:00' };
let themeInterval = null;

function loadThemeConfig() {
  const saved = localStorage.getItem('themeConfig');
  if (saved) { try { themeConfig = JSON.parse(saved); } catch (e) {} }
}

function saveThemeConfig() {
  localStorage.setItem('themeConfig', JSON.stringify(themeConfig));
}

function applyTheme(mode) {
  document.body.classList.toggle('dark-mode', mode === 'dark');
  updateThemeButton(mode);
}

function updateThemeButton(mode) {
  const themeBtn = document.getElementById('themeToggleBtn');
  if (!themeBtn) return;
  const icon = themeBtn.querySelector('svg');
  if (!icon) return;
  if (mode === 'dark') {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    themeBtn.title = '\u5207\u6362\u5230\u767D\u5929\u6A21\u5F0F';
  } else {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    themeBtn.title = '\u5207\u6362\u5230\u591C\u95F4\u6A21\u5F0F';
  }
}

function shouldUseDarkMode() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = themeConfig.darkStartTime.split(':').map(Number);
  const [eh, em] = themeConfig.darkEndTime.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start > end) return currentMinutes >= start || currentMinutes < end;
  return currentMinutes >= start && currentMinutes < end;
}

function updateAutoTheme() {
  if (themeConfig.mode === 'auto') applyTheme(shouldUseDarkMode() ? 'dark' : 'light');
}

function startAutoThemeCheck() {
  if (themeInterval) clearInterval(themeInterval);
  themeInterval = setInterval(updateAutoTheme, 60000);
  updateAutoTheme();
}

function initTheme() {
  loadThemeConfig();
  document.querySelectorAll('input[name="themeMode"]').forEach(r => { r.checked = r.value === themeConfig.mode; });
  document.getElementById('darkStartTime').value = themeConfig.darkStartTime;
  document.getElementById('darkEndTime').value = themeConfig.darkEndTime;
  updateAutoTimeGroup();
  if (themeConfig.mode === 'auto') { updateAutoTheme(); startAutoThemeCheck(); }
  else applyTheme(themeConfig.mode);
}

function updateAutoTimeGroup() {
  const autoMode = document.querySelector('input[name="themeMode"][value="auto"]').checked;
  document.getElementById('autoTimeGroup').classList.toggle('show', autoMode);
}

function initAllEvents() {
  document.getElementById('addConfigBtn').addEventListener('click', () => {
    document.getElementById('configName').value = '';
    document.getElementById('configUrl').value = '';
    document.getElementById('configIcon').value = '\u{1F916}';
    document.getElementById('addModal').classList.add('show');
  });

  document.getElementById('closeModal').addEventListener('click', () => { document.getElementById('addModal').classList.remove('show'); });
  document.getElementById('cancelBtn').addEventListener('click', () => { document.getElementById('addModal').classList.remove('show'); });

  document.getElementById('confirmBtn').addEventListener('click', () => {
    const name = document.getElementById('configName').value.trim();
    const url = document.getElementById('configUrl').value.trim();
    const icon = document.getElementById('configIcon').value.trim() || '\u{1F916}';
    if (!name || !url) { alert('\u8BF7\u586B\u5199\u540D\u79F0\u548CURL'); return; }
    configs.push({ id: generateId(), name, url, icon, enabled: false });
    saveConfigs();
    renderConfigList();
    document.getElementById('addModal').classList.remove('show');
  });

  document.getElementById('closeEditModal').addEventListener('click', () => { document.getElementById('editModal').classList.remove('show'); });
  document.getElementById('editCancelBtn').addEventListener('click', () => { document.getElementById('editModal').classList.remove('show'); });

  document.getElementById('refreshBatList').addEventListener('click', async () => {
    const folderPath = document.getElementById('editFolderPath').value.trim();
    if (folderPath) await loadBatFiles(folderPath);
    else alert('\u8BF7\u8F93\u5165\u6587\u4EF6\u5939\u8DEF\u5F84');
  });

  document.getElementById('editConfirmBtn').addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const icon = document.getElementById('editIcon').value.trim() || '\u{1F916}';
    const scriptContent = document.getElementById('editNotes').value;
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    const batFile = selectedRadio ? selectedRadio.value : '';
    const url = batFile ? folderPath + '\\' + batFile : '';
    if (!name) { alert('\u8BF7\u586B\u5199\u540D\u79F0'); return; }
    if (url && scriptContent) {
      try { await tauriInvoke('write_text_file', { path: url, content: scriptContent }); } catch (e) {}
    }
    const config = configs.find(c => c.id == id);
    if (config) {
      config.name = name;
      config.folderPath = folderPath;
      config.url = url;
      config.icon = icon;
      config.notes = scriptContent;
      saveConfigs();
      renderConfigList();
      document.getElementById('editModal').classList.remove('show');
    }
  });

  document.getElementById('settingsBtn').addEventListener('click', () => { document.getElementById('themeModal').classList.add('show'); });

  document.getElementById('runBatBtn').addEventListener('click', async () => {
    try {
      let appDir;
      try { appDir = await tauriInvoke('get_exe_dir'); } catch (e) { appDir = '.'; }
      const runBatPath = appDir + '\\run.bat';
      await tauriInvoke('execute_script', { path: runBatPath });
    } catch (error) {
      alert('\u542F\u52A8\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
    }
  });

  document.getElementById('copyScriptBtn').addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    if (!selectedRadio) return;
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const fileName = selectedRadio.value;
    const sourcePath = folderPath + '\\' + fileName;
    try {
      const content = await tauriInvoke('read_text_file', { path: sourcePath });
      const nameWithoutExt = fileName.replace(/\.bat$/i, '');
      let newFileName = nameWithoutExt + '_copy.bat';
      let newFilePath = folderPath + '\\' + newFileName;
      let counter = 1;
      while (true) {
        try { await tauriInvoke('read_text_file', { path: newFilePath }); counter++; newFileName = nameWithoutExt + '_copy' + counter + '.bat'; newFilePath = folderPath + '\\' + newFileName; } catch { break; }
      }
      await tauriInvoke('write_text_file', { path: newFilePath, content });
      await loadBatFiles(folderPath, newFileName);
      alert('\u5DF2\u590D\u5236\u4E3A: ' + newFileName);
    } catch (error) {
      alert('\u590D\u5236\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
    }
  });

  document.getElementById('renameScriptBtn').addEventListener('click', () => {
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    if (!selectedRadio) return;
    const fileName = selectedRadio.value;
    document.getElementById('renameOldName').value = fileName;
    document.getElementById('renameNewName').value = fileName.replace(/\.bat$/i, '');
    document.getElementById('renameModal').classList.add('show');
  });

  document.getElementById('deleteScriptBtn').addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    if (!selectedRadio) return;
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const fileName = selectedRadio.value;
    if (!confirm('\u786E\u5B9A\u8981\u5220\u9664\u811A\u672C "' + fileName + '" \u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\uFF01')) return;
    try {
      await tauriInvoke('remove_file', { path: folderPath + '\\' + fileName });
      await loadBatFiles(folderPath);
      document.getElementById('editNotes').value = '';
      document.getElementById('copyScriptBtn').disabled = true;
      document.getElementById('renameScriptBtn').disabled = true;
      document.getElementById('deleteScriptBtn').disabled = true;
      alert('\u5DF2\u5220\u9664: ' + fileName);
    } catch (error) {
      alert('\u5220\u9664\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
    }
  });

  document.getElementById('closeRenameModal').addEventListener('click', () => { document.getElementById('renameModal').classList.remove('show'); });
  document.getElementById('renameCancelBtn').addEventListener('click', () => { document.getElementById('renameModal').classList.remove('show'); });

  document.getElementById('renameConfirmBtn').addEventListener('click', async () => {
    const oldName = document.getElementById('renameOldName').value;
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName) { alert('\u8BF7\u8F93\u5165\u65B0\u6587\u4EF6\u540D'); return; }
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const oldPath = folderPath + '\\' + oldName;
    const newPath = folderPath + '\\' + newName + '.bat';
    try {
      const content = await tauriInvoke('read_text_file', { path: oldPath });
      await tauriInvoke('write_text_file', { path: newPath, content });
      try { await tauriInvoke('remove_file', { path: oldPath }); } catch (e) {}
      await loadBatFiles(folderPath);
      document.getElementById('renameModal').classList.remove('show');
      alert('\u5DF2\u91CD\u547D\u540D\u4E3A: ' + newName + '.bat');
    } catch (error) {
      alert('\u91CD\u547D\u540D\u5931\u8D25: ' + (typeof error === 'string' ? error : String(error)));
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { 
      if (e.target === overlay && !overlay.id.includes('editModal')) {
        overlay.classList.remove('show'); 
      }
    });
  });

  document.getElementById('themeToggleBtn').addEventListener('click', () => { document.getElementById('themeModal').classList.add('show'); });
  document.querySelectorAll('input[name="themeMode"]').forEach(r => { r.addEventListener('change', updateAutoTimeGroup); });
  document.getElementById('closeThemeModal').addEventListener('click', () => { document.getElementById('themeModal').classList.remove('show'); });
  document.getElementById('themeCancelBtn').addEventListener('click', () => { document.getElementById('themeModal').classList.remove('show'); });

  document.getElementById('themeSaveBtn').addEventListener('click', () => {
    const mode = document.querySelector('input[name="themeMode"]:checked').value || 'light';
    themeConfig.mode = mode;
    themeConfig.darkStartTime = document.getElementById('darkStartTime').value || '19:00';
    themeConfig.darkEndTime = document.getElementById('darkEndTime').value || '07:00';
    saveThemeConfig();
    if (mode === 'auto') { updateAutoTheme(); startAutoThemeCheck(); }
    else { applyTheme(mode); if (themeInterval) { clearInterval(themeInterval); themeInterval = null; } }
    document.getElementById('themeModal').classList.remove('show');
  });

  document.getElementById('startScriptBtn').addEventListener('click', runSelectedScript);
  document.getElementById('stopScriptBtn').addEventListener('click', stopSelectedScript);

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.config-card');
    if (card) {
      const actionBtn = e.target.closest('.action-btn');
      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        const id = actionBtn.dataset.id;
        switch (action) {
          case 'run': runScript(id); break;
          case 'edit': openEditModal(id); break;
          case 'copy': copyConfig(id); break;
          case 'up': moveUp(id); break;
          case 'down': moveDown(id); break;
          case 'delete': deleteConfig(id); break;
        }
        return;
      }
      updateSelection(card);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initData();
  renderConfigList();
  initIconPicker();
  initAllEvents();
  initTheme();
  updateControlButtons();
});
