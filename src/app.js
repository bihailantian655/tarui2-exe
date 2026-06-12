// 配置数据存储
let configs = [];

// 运行中的脚本进程
let runningProcesses = {};

// 获取 Tauri invoke API（兼容 v1 和 v2）
function getTauriInvoke() {
  if (!window.__TAURI__) return null;

  // Tauri v2: withGlobalTauri 模式
  if (window.__TAURI__.core?.invoke) {
    return window.__TAURI__.core.invoke;
  }

  // Tauri v1 兼容: withGlobalTauri 模式
  if (window.__TAURI__.tauri?.invoke) {
    return window.__TAURI__.tauri.invoke;
  }

  // Tauri v1 兼容: 直接注入方式
  if (window.__TAURI__.invoke) {
    return window.__TAURI__.invoke;
  }

  // Tauri v2 兼容: __TAURI_INTERNALS__
  if (window.__TAURI_INTERNALS__?.invoke) {
    return window.__TAURI_INTERNALS__.invoke;
  }

  return null;
}

// 初始化数据
function initData() {
  const saved = localStorage.getItem('ccswitch_configs');
  if (saved) {
    configs = JSON.parse(saved);
    // 确保所有 ID 都是字符串
    configs = configs.map(c => ({ ...c, id: String(c.id) }));
  } else {
    // 默认数据
    configs = [
      {
        id: '1',
        name: 'deepseek',
        url: 'https://www.deepseek.com',
        icon: '🤖',
        enabled: false
      },
      {
        id: '2',
        name: 'qwen3.5',
        url: 'https://www.anthropic.com/claude-code',
        icon: '🧠',
        enabled: false
      },
      {
        id: '3',
        name: 'claude',
        url: 'https://www.anthropic.com/claude-code',
        icon: '💬',
        enabled: false
      },
      {
        id: '4',
        name: 'claude 4b',
        url: 'https://www.anthropic.com/claude-code',
        icon: '🔮',
        enabled: false
      },
      {
        id: '5',
        name: 'claudelogic',
        url: 'https://www.anthropic.com/claude-code',
        icon: '🧪',
        enabled: false
      }
    ];
    saveConfigs();
  }
}

// 保存配置
function saveConfigs() {
  localStorage.setItem('ccswitch_configs', JSON.stringify(configs));
}

// 生成唯一ID
function generateId() {
  return Date.now() + Math.random().toString(36).substr(2, 9);
}

// 渲染配置列表
function renderConfigList() {
  const container = document.getElementById('configList');
  
  if (configs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <p>暂无配置，请点击右上角 + 添加</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = configs.map(config => `
    <div class="config-card ${config.enabled ? 'active' : ''}" data-id="${config.id}">
      <span class="config-drag-handle">⋮⋮</span>
      <div class="config-icon">${config.icon}</div>
      <div class="config-info">
        <div class="config-name">${config.name}</div>
        <div class="config-url">${config.folderPath ? config.folderPath : (config.url ? config.url.substring(0, config.url.lastIndexOf('\\')) : '')}</div>
      </div>
      <span class="config-status">${config.url ? config.url.split('\\').pop() : '未选择脚本'}</span>
      <div class="config-actions">
        <button class="action-btn enable" onclick="runScript('${config.id}')" title="运行脚本">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button class="action-btn edit" onclick="openEditModal('${config.id}')" title="编辑">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn copy" onclick="copyConfig('${config.id}')" title="复制">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="action-btn up" onclick="moveUp('${config.id}')" title="上移" ${configs.indexOf(config) === 0 ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="action-btn down" onclick="moveDown('${config.id}')" title="下移" ${configs.indexOf(config) === configs.length - 1 ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="action-btn delete" onclick="deleteConfig('${config.id}')" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// 删除配置
function deleteConfig(id) {
  if (confirm('确定要删除这个配置吗？')) {
    configs = configs.filter(c => c.id != id);
    saveConfigs();
    renderConfigList();
  }
}

// 运行脚本
async function runScript(id) {
  const config = configs.find(c => c.id == id);
  if (config) {
    const filePath = config.url;
    if (!filePath || !filePath.endsWith('.bat')) {
      alert('请先选择一个有效的 .bat 脚本文件');
      return;
    }
    
    try {
      const invoke = getTauriInvoke();
      if (invoke) {
        await invoke('execute_script', { path: filePath });
        alert('脚本已启动！');
      } else {
        alert(`已打开脚本: ${filePath}\n\n在 Tauri 应用中运行时将自动执行此脚本。`);
      }
    } catch (error) {
      alert(`执行脚本失败: ${error.message}`);
    }
  }
}

// 打开编辑弹窗
async function openEditModal(id) {
  const config = configs.find(c => c.id == id);
  if (config) {
    document.getElementById('editId').value = config.id;
    document.getElementById('editName').value = config.name;
    
    // 设置文件夹路径：优先使用保存的路径，否则使用默认值
    const defaultPath = 'C:\\Users\\bihai\\Desktop\\cla';
    const folderPath = config.folderPath || defaultPath;
    document.getElementById('editFolderPath').value = folderPath;
    
    document.getElementById('editIcon').value = config.icon;
    // 设置图标选择器的选中状态
    setIconPickerSelection(config.icon);
    
    document.getElementById('editNotes').value = '';
    
    // 加载bat文件列表
    if (folderPath) {
      await loadBatFiles(folderPath, config.url);
    } else {
      document.getElementById('batList').innerHTML = '<div class="bat-list-empty">请输入文件夹路径后点击刷新按钮</div>';
    }
    
    document.getElementById('editModal').classList.add('show');
  }
}

// 加载文件夹中的bat文件列表
async function loadBatFiles(folderPath, selectedFile = null) {
  const batList = document.getElementById('batList');
  
  if (!folderPath) {
    batList.innerHTML = '<div class="bat-list-empty">请输入文件夹路径</div>';
    return;
  }
  
  try {
    let batFiles = [];
    
    // Tauri 环境：使用 invoke 调用 Rust 命令
    const invoke = getTauriInvoke();

    if (invoke) {
      console.log('invoke API 可用，尝试调用 read_dir:', folderPath);
      try {
        const entries = await invoke('read_dir', { path: folderPath });
        console.log('invoke 成功，返回:', entries);

        batFiles = entries
          .filter(entry => entry.name && entry.name.endsWith('.bat'))
          .map(entry => entry.name);
      } catch (error) {
        console.error('invoke 失败:', error);
        throw new Error(`调用失败: ${error}`);
      }
    } else {
      // 非 Tauri 环境：使用演示数据
      console.log('非 Tauri 环境，使用演示数据');
      batFiles = ['demo_script.bat', 'backup.bat', 'deploy.bat', 'cleanup.bat'];
    }
    
    if (batFiles.length === 0) {
      batList.innerHTML = '<div class="bat-list-empty">该文件夹中没有 .bat 文件</div>';
      return;
    }
    
    batList.innerHTML = batFiles.map(file => {
      const safeId = 'bat_' + file.replace(/[^a-zA-Z0-9_]/g, '_');
      return `
      <div class="bat-item ${file === selectedFile ? 'selected' : ''}">
        <input type="radio" name="batFile" value="${file}" id="${safeId}" ${file === selectedFile ? 'checked' : ''}>
        <label for="${safeId}">${file}</label>
      </div>`;
    }).join('');
    
    // 添加点击事件
    batList.querySelectorAll('.bat-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.type !== 'radio') {
          const radio = item.querySelector('input[type="radio"]');
          radio.checked = true;
        }
        
        // 移除其他选中状态
        batList.querySelectorAll('.bat-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        
        // 启用脚本操作按钮
        document.getElementById('copyScriptBtn').disabled = false;
        document.getElementById('renameScriptBtn').disabled = false;
        document.getElementById('deleteScriptBtn').disabled = false;
        
        // 加载选中文件的内容
        const fileName = item.querySelector('input').value;
        const fullPath = `${folderPath}\\${fileName}`;
        await loadBatContent(fullPath);
      });
    });
    
  } catch (error) {
    console.error('加载文件列表失败:', error);
    batList.innerHTML = `<div class="bat-list-empty">错误: ${error.message || error}</div>`;
  }
}

// 加载bat文件内容
async function loadBatContent(filePath) {
  const textarea = document.getElementById('editNotes');
  
  try {
    let content = '';
    
    const invoke = getTauriInvoke();
    if (invoke) {
      content = await invoke('read_text_file', { path: filePath });
    } else {
      content = '@echo off\nREM 演示脚本内容\nREM 在 Tauri 应用中运行时将显示实际内容\necho Hello World';
    }
    
    textarea.value = content;
  } catch (error) {
    textarea.value = `// 读取文件失败: ${error}`;
  }
}

// 复制配置
function copyConfig(id) {
  const config = configs.find(c => c.id == id);
  if (config) {
    const newConfig = {
      ...config,
      id: generateId(),
      name: config.name + ' copy',
      enabled: false
    };
    const index = configs.indexOf(config);
    configs.splice(index + 1, 0, newConfig);
    saveConfigs();
    renderConfigList();
  }
}

// 上移配置
function moveUp(id) {
  const index = configs.findIndex(c => c.id == id);
  if (index > 0) {
    const temp = configs[index];
    configs[index] = configs[index - 1];
    configs[index - 1] = temp;
    saveConfigs();
    renderConfigList();
  }
}

// 下移配置
function moveDown(id) {
  const index = configs.findIndex(c => c.id == id);
  if (index < configs.length - 1) {
    const temp = configs[index];
    configs[index] = configs[index + 1];
    configs[index + 1] = temp;
    saveConfigs();
    renderConfigList();
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initData();
  renderConfigList();
  
  // 确保页面加载时没有选中任何卡片（移除默认选中状态）
  setTimeout(() => {
    // 移除所有卡片的selected和active类，确保没有默认高亮
    document.querySelectorAll('.config-card').forEach(card => {
      card.classList.remove('selected', 'active');
      // 保留running类，因为可能真的有脚本在运行
    });
    updateControlButtons();
  }, 0);
  
  // 初始化图标选择器事件
  initIconPicker();
  
  // 添加配置按钮
  document.getElementById('addConfigBtn').addEventListener('click', () => {
    document.getElementById('configName').value = '';
    document.getElementById('configUrl').value = '';
    document.getElementById('configIcon').value = '🤖';
    document.getElementById('addModal').classList.add('show');
  });
  
  // 关闭添加弹窗
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('addModal').classList.remove('show');
  });
  
  document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('addModal').classList.remove('show');
  });
  
  // 确认添加配置
  document.getElementById('confirmBtn').addEventListener('click', () => {
    const name = document.getElementById('configName').value.trim();
    const url = document.getElementById('configUrl').value.trim();
    const icon = document.getElementById('configIcon').value.trim() || '🤖';
    
    if (!name || !url) {
      alert('请填写名称和URL');
      return;
    }
    
    const newConfig = {
      id: generateId(),
      name,
      url,
      icon,
      enabled: false
    };
    
    configs.push(newConfig);
    saveConfigs();
    renderConfigList();
    document.getElementById('addModal').classList.remove('show');
  });
  
  // 关闭编辑弹窗
  document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editModal').classList.remove('show');
  });
  
  document.getElementById('editCancelBtn').addEventListener('click', () => {
    document.getElementById('editModal').classList.remove('show');
  });
  
  // 刷新BAT文件列表按钮
  document.getElementById('refreshBatList').addEventListener('click', async () => {
    const folderPath = document.getElementById('editFolderPath').value.trim();
    if (folderPath) {
      await loadBatFiles(folderPath);
    } else {
      alert('请输入文件夹路径');
    }
  });
  
  // 确认编辑配置
  document.getElementById('editConfirmBtn').addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const icon = document.getElementById('editIcon').value.trim() || '🤖';
    const scriptContent = document.getElementById('editNotes').value;
    
    // 获取选中的bat文件
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    const batFile = selectedRadio ? selectedRadio.value : '';
    const url = batFile ? `${folderPath}\\${batFile}` : '';
    
    if (!name) {
      alert('请填写名称');
      return;
    }
    
    if (folderPath && !batFile) {
      alert('请从列表中选择一个脚本文件');
      return;
    }
    
    // 如果选择了bat文件，保存内容到磁盘
    if (url && scriptContent) {
      try {
        const invoke = getTauriInvoke();
        if (invoke) {
          await invoke('write_text_file', { path: url, content: scriptContent });
        }
      } catch (error) {
        console.log('保存文件失败:', error);
      }
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
      alert('配置已保存！');
    }
  });
  
  // 设置按钮
  document.getElementById('settingsBtn').addEventListener('click', () => {
    // 打开主题设置弹窗
    const modal = document.getElementById('themeModal');
    if (modal) {
      modal.classList.add('show');
    }
  });
  
  // 运行程序本目录下的 run.bat
  document.getElementById('runBatBtn').addEventListener('click', async () => {
    try {
      const invoke = getTauriInvoke();
      let appDir = '';
      
      if (invoke) {
        appDir = await invoke('get_exe_dir');
      } else {
        appDir = '.';
      }
      
      const runBatPath = `${appDir}\\run.bat`;
      
      if (invoke) {
        await invoke('execute_script', { path: runBatPath });
        alert(`正在启动: ${runBatPath}`);
      } else {
        alert(`在 Tauri 应用中运行时将启动: ${runBatPath}`);
      }
    } catch (error) {
      alert(`启动失败: ${error.message}`);
    }
  });
  
  // 复制脚本按钮
  document.getElementById('copyScriptBtn').addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    if (!selectedRadio) return;
    
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const fileName = selectedRadio.value;
    const sourcePath = `${folderPath}\\${fileName}`;
    
    try {
      const invoke = getTauriInvoke();
      if (invoke) {
        // 读取原文件内容
        const content = await invoke('read_text_file', { path: sourcePath });
        
        // 生成新文件名
        const nameWithoutExt = fileName.replace(/\.bat$/i, '');
        let newFileName = `${nameWithoutExt}_copy.bat`;
        let newFilePath = `${folderPath}\\${newFileName}`;
        let counter = 1;
        
        // 检查文件是否存在，如果存在则添加数字
        while (true) {
          try {
            await invoke('read_text_file', { path: newFilePath });
            counter++;
            newFileName = `${nameWithoutExt}_copy${counter}.bat`;
            newFilePath = `${folderPath}\\${newFileName}`;
          } catch {
            break;
          }
        }
        
        // 写入新文件
        await invoke('write_text_file', { path: newFilePath, content });
        
        // 刷新列表并选中新文件
        await loadBatFiles(folderPath, newFileName);
        alert(`已复制为: ${newFileName}`);
      }
    } catch (error) {
      alert(`复制失败: ${error.message}`);
    }
  });
  
  // 重命名脚本按钮
  document.getElementById('renameScriptBtn').addEventListener('click', () => {
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    if (!selectedRadio) return;
    
    const fileName = selectedRadio.value;
    const nameWithoutExt = fileName.replace(/\.bat$/i, '');
    
    document.getElementById('renameOldName').value = fileName;
    document.getElementById('renameNewName').value = nameWithoutExt;
    document.getElementById('renameModal').classList.add('show');
  });
  
  // 删除脚本按钮
  document.getElementById('deleteScriptBtn').addEventListener('click', async () => {
    const selectedRadio = document.querySelector('input[name="batFile"]:checked');
    if (!selectedRadio) return;
    
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const fileName = selectedRadio.value;
    const filePath = `${folderPath}\\${fileName}`;
    
    if (!confirm(`确定要删除脚本 "${fileName}" 吗？此操作无法撤销！`)) {
      return;
    }
    
    try {
      const invoke = getTauriInvoke();
      if (invoke) {
        await invoke('remove_file', { path: filePath });
        await loadBatFiles(folderPath);
        
        // 重置脚本内容输入框
        document.getElementById('editNotes').value = '';
        
        // 禁用脚本操作按钮
        document.getElementById('copyScriptBtn').disabled = true;
        document.getElementById('renameScriptBtn').disabled = true;
        document.getElementById('deleteScriptBtn').disabled = true;
        
        alert(`已删除: ${fileName}`);
      }
    } catch (error) {
      alert(`删除失败: ${error.message}`);
    }
  });
  
  // 关闭重命名弹窗
  document.getElementById('closeRenameModal').addEventListener('click', () => {
    document.getElementById('renameModal').classList.remove('show');
  });
  
  document.getElementById('renameCancelBtn').addEventListener('click', () => {
    document.getElementById('renameModal').classList.remove('show');
  });
  
  // 确认重命名
  document.getElementById('renameConfirmBtn').addEventListener('click', async () => {
    const oldName = document.getElementById('renameOldName').value;
    const newName = document.getElementById('renameNewName').value.trim();
    
    if (!newName) {
      alert('请输入新文件名');
      return;
    }
    
    const folderPath = document.getElementById('editFolderPath').value.trim();
    const oldPath = `${folderPath}\\${oldName}`;
    const newPath = `${folderPath}\\${newName}.bat`;
    
    try {
      const invoke = getTauriInvoke();
      if (invoke) {
        // 读取原文件内容
        const content = await invoke('read_text_file', { path: oldPath });
        
        // 写入新文件
        await invoke('write_text_file', { path: newPath, content });
        
        // 删除原文件（需要添加删除文件的命令）
        try {
          await invoke('remove_file', { path: oldPath });
        } catch (error) {
          console.log('删除原文件失败:', error);
        }
        
        // 刷新列表
        await loadBatFiles(folderPath);
        document.getElementById('renameModal').classList.remove('show');
        alert(`已重命名为: ${newName}.bat`);
      }
    } catch (error) {
      alert(`重命名失败: ${error.message}`);
    }
  });
  
  // 点击弹窗外部关闭
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
      }
    });
  });
});

// 初始化图标选择器
function initIconPicker() {
  const iconPicker = document.getElementById('iconPicker');
  if (!iconPicker) return;
  
  // 为每个图标选项添加点击事件
  iconPicker.querySelectorAll('.icon-option').forEach(option => {
    option.addEventListener('click', () => {
      // 移除其他选中状态
      iconPicker.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
      // 添加当前选中状态
      option.classList.add('selected');
      // 更新隐藏输入框的值
      const icon = option.dataset.icon;
      document.getElementById('editIcon').value = icon;
    });
  });
}

// 设置图标选择器选中状态
function setIconPickerSelection(icon) {
  const iconPicker = document.getElementById('iconPicker');
  if (!iconPicker) return;
  
  iconPicker.querySelectorAll('.icon-option').forEach(option => {
    if (option.dataset.icon === icon) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// ========== 主题切换功能 ==========

// 主题配置
let themeConfig = {
  mode: 'light', // light, dark, auto
  darkStartTime: '19:00',
  darkEndTime: '07:00'
};

let themeInterval = null;

// 加载主题配置
function loadThemeConfig() {
  const saved = localStorage.getItem('themeConfig');
  if (saved) {
    try {
      themeConfig = JSON.parse(saved);
    } catch (e) {
      console.error('加载主题配置失败:', e);
    }
  }
}

// 保存主题配置
function saveThemeConfig() {
  localStorage.setItem('themeConfig', JSON.stringify(themeConfig));
}

// 应用主题
function applyTheme(mode) {
  const body = document.body;
  
  if (mode === 'dark') {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }
  
  // 更新主题切换按钮图标
  updateThemeButton(mode);
}

// 更新主题切换按钮图标
function updateThemeButton(mode) {
  const themeBtn = document.getElementById('themeToggleBtn');
  if (!themeBtn) return;
  
  const icon = themeBtn.querySelector('svg');
  if (!icon) return;
  
  if (mode === 'dark') {
    // 显示太阳图标（表示当前是夜间模式，点击切换到白天）
    icon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
    themeBtn.title = '切换到白天模式';
  } else {
    // 显示月亮图标（表示当前是白天模式，点击切换到夜间）
    icon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
    themeBtn.title = '切换到夜间模式';
  }
}

// 检查当前时间是否应该使用夜间模式
function shouldUseDarkMode() {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = themeConfig.darkStartTime.split(':').map(Number);
  const [endHour, endMin] = themeConfig.darkEndTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // 如果开始时间早于结束时间（如 19:00 - 07:00）
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  // 如果开始时间晚于结束时间（如 07:00 - 19:00）
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// 更新自动主题
function updateAutoTheme() {
  if (themeConfig.mode === 'auto') {
    const shouldBeDark = shouldUseDarkMode();
    applyTheme(shouldBeDark ? 'dark' : 'light');
  }
}

// 启动自动主题检查
function startAutoThemeCheck() {
  // 清除之前的定时器
  if (themeInterval) {
    clearInterval(themeInterval);
  }
  
  // 每分钟检查一次
  themeInterval = setInterval(updateAutoTheme, 60000);
  
  // 立即执行一次
  updateAutoTheme();
}

// 初始化主题
function initTheme() {
  loadThemeConfig();
  
  // 设置弹窗中的选项
  document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
    radio.checked = radio.value === themeConfig.mode;
  });
  
  document.getElementById('darkStartTime').value = themeConfig.darkStartTime;
  document.getElementById('darkEndTime').value = themeConfig.darkEndTime;
  
  // 显示/隐藏自动时间设置
  updateAutoTimeGroup();
  
  // 应用主题
  if (themeConfig.mode === 'auto') {
    updateAutoTheme();
    startAutoThemeCheck();
  } else {
    applyTheme(themeConfig.mode);
  }
}

// 更新自动时间组的显示
function updateAutoTimeGroup() {
  const autoTimeGroup = document.getElementById('autoTimeGroup');
  const autoMode = document.querySelector('input[name="themeMode"][value="auto"]').checked;
  
  if (autoMode) {
    autoTimeGroup.classList.add('show');
  } else {
    autoTimeGroup.classList.remove('show');
  }
}

// 主题切换按钮点击事件
document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('themeModal');
  if (modal) {
    modal.classList.add('show');
  }
});

// 主题模式选项变化事件
document.querySelectorAll('input[name="themeMode"]').forEach(radio => {
  radio.addEventListener('change', updateAutoTimeGroup);
});

// 关闭主题弹窗
document.getElementById('closeThemeModal')?.addEventListener('click', () => {
  const modal = document.getElementById('themeModal');
  if (modal) {
    modal.classList.remove('show');
  }
});

document.getElementById('themeCancelBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('themeModal');
  if (modal) {
    modal.classList.remove('show');
  }
});

// 保存主题设置
document.getElementById('themeSaveBtn')?.addEventListener('click', () => {
  const mode = document.querySelector('input[name="themeMode"]:checked')?.value || 'light';
  const darkStartTime = document.getElementById('darkStartTime').value || '19:00';
  const darkEndTime = document.getElementById('darkEndTime').value || '07:00';
  
  themeConfig.mode = mode;
  themeConfig.darkStartTime = darkStartTime;
  themeConfig.darkEndTime = darkEndTime;
  
  saveThemeConfig();
  
  // 应用新的主题设置
  if (mode === 'auto') {
    updateAutoTheme();
    startAutoThemeCheck();
  } else {
    applyTheme(mode);
    // 如果之前有定时器，清除它
    if (themeInterval) {
      clearInterval(themeInterval);
      themeInterval = null;
    }
  }
  
  // 关闭弹窗
  const modal = document.getElementById('themeModal');
  if (modal) {
    modal.classList.remove('show');
  }
});

// 页面加载完成后初始化主题
document.addEventListener('DOMContentLoaded', initTheme);

// ========== 脚本运行控制功能 ==========

// 运行选中的脚本
async function runSelectedScript() {
  const selectedCard = document.querySelector('.config-card.selected');
  if (!selectedCard) {
    alert('请先选中一个配置项');
    return;
  }
  
  const configId = selectedCard.dataset.id;
  const config = configs.find(c => c.id === configId);
  
  if (!config || !config.url) {
    alert('配置项没有设置脚本路径');
    return;
  }
  
  // 检查是否已有脚本在运行
  if (Object.keys(runningProcesses).length > 0) {
    const runningId = Object.keys(runningProcesses)[0];
    
    // 如果是同一个脚本，不做任何操作
    if (runningId === configId) {
      alert('该脚本已经在运行中');
      return;
    }
    
    // 如果是不同脚本，提示用户是否停止当前运行的脚本
    const confirmStop = confirm('已有脚本在运行中，是否先停止它再运行新脚本？');
    if (!confirmStop) {
      return;
    }
    
    // 停止当前运行的脚本
    await stopScriptById(runningId);
  }
  
  try {
    const invoke = getTauriInvoke();
    if (!invoke) {
      alert('无法执行脚本：Tauri API不可用');
      return;
    }
    
    // 执行脚本
    const result = await invoke('execute_script', { path: config.url });
    
    // 记录进程ID
    if (result && result.pid) {
      runningProcesses[configId] = result.pid;
      
      // 更新UI状态
      selectedCard.classList.add('running');
      updateControlButtons();
      
      alert(`脚本已启动，进程ID: ${result.pid}`);
    }
  } catch (error) {
    alert(`运行脚本失败: ${error.message}`);
  }
}

// 根据ID停止脚本
async function stopScriptById(configId) {
  const pid = runningProcesses[configId];
  if (!pid) return;
  
  try {
    const invoke = getTauriInvoke();
    if (invoke) {
      await invoke('kill_process', { pid: pid });
    }
  } catch (e) {
    console.error('停止脚本失败:', e);
  }
  
  // 清除进程记录
  delete runningProcesses[configId];
  
  // 更新UI状态
  const card = document.querySelector(`.config-card[data-id="${configId}"]`);
  if (card) {
    card.classList.remove('running');
  }
}

// 停止选中的脚本
async function stopSelectedScript() {
  const selectedCard = document.querySelector('.config-card.selected');
  if (!selectedCard) {
    alert('请先选中一个配置项');
    return;
  }
  
  const configId = selectedCard.dataset.id;
  const pid = runningProcesses[configId];
  
  if (!pid) {
    alert('没有正在运行的脚本');
    return;
  }
  
  try {
    const invoke = getTauriInvoke();
    if (!invoke) {
      alert('无法停止脚本：Tauri API不可用');
      return;
    }
    
    // 终止进程
    await invoke('kill_process', { pid: pid });
    
    // 清除进程记录
    delete runningProcesses[configId];
    
    // 更新UI状态
    selectedCard.classList.remove('running');
    updateControlButtons();
    
    alert('脚本已停止');
  } catch (error) {
    alert(`停止脚本失败: ${error.message}`);
  }
}

// 更新控制按钮状态
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

// 更新选中状态
function updateSelection(card) {
  // 移除其他卡片的选中状态
  document.querySelectorAll('.config-card').forEach(c => {
    c.classList.remove('selected');
  });
  
  // 添加当前卡片的选中状态
  card.classList.add('selected');
  
  // 更新控制按钮状态
  updateControlButtons();
}

// 开始按钮点击事件
document.getElementById('startScriptBtn')?.addEventListener('click', runSelectedScript);

// 停止按钮点击事件
document.getElementById('stopScriptBtn')?.addEventListener('click', stopSelectedScript);

// 配置卡片点击事件（用于选中）
document.addEventListener('click', (e) => {
  const card = e.target.closest('.config-card');
  if (card) {
    updateSelection(card);
  }
});

// 页面加载完成后初始化控制按钮状态
document.addEventListener('DOMContentLoaded', () => {
  // 确保页面加载时没有选中任何卡片
  document.querySelectorAll('.config-card').forEach(c => {
    c.classList.remove('selected');
  });
  updateControlButtons();
});