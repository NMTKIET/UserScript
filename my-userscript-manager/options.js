// Khởi tạo biến toàn cục cho CodeMirror instance
let editor;
let userScripts = [];
let currentScriptIndex = -1; // Index của script đang được chỉnh sửa

document.addEventListener('DOMContentLoaded', () => {
  // === Các phần tử DOM cho Tabs ===
  const installedUserscriptsTab = document.getElementById('installedUserscriptsTab');
  const editorTab = document.getElementById('editorTab');
  const settingsTab = document.getElementById('settingsTab');
  const utilitiesTab = document.getElementById('utilitiesTab');

  const listView = document.getElementById('list-view');
  const editorView = document.getElementById('editor-view');

  // === Các phần tử DOM cho Editor View ===
  const addScriptBtn = document.getElementById('addScriptBtn');
  const saveScriptBtn = document.getElementById('saveScriptBtn');
  const deleteScriptBtn = document.getElementById('deleteScriptBtn');
  const scriptSelect = document.getElementById('scriptSelect');
  const currentScriptNameSpan = document.getElementById('currentScriptName');

  // === Các phần tử DOM cho List View ===
  const userscriptsTableBody = document.querySelector('#userscripts-table tbody');
  const selectAllEnabledCheckbox = document.getElementById('selectAllEnabled');

  // Khởi tạo CodeMirror Editor (chỉ một lần)
  editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
    lineNumbers: true,
    mode: "javascript",
    indentUnit: 2,
    tabSize: 2,
    theme: "default",
    extraKeys: {
      "Ctrl-Space": "autocomplete"
    }
  });

  // === Chức năng Tabs ===
  function showTab(tabId) {
    // Ẩn tất cả các tab-pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    // Bỏ chọn tất cả các nút tab
    document.querySelectorAll('.tab-nav button').forEach(button => {
      button.classList.remove('active');
    });

    // Hiển thị tab được chọn
    document.getElementById(tabId).classList.add('active');
    // Đánh dấu nút tab là active
    document.querySelector(`#${tabId.replace('-view', 'Tab')}`).classList.add('active');

    if (tabId === 'list-view') {
        renderUserscriptsTable(); // Tải lại bảng khi chuyển sang tab list
    } else if (tabId === 'editor-view') {
        loadScriptsIntoEditorAndDropdown(); // Đảm bảo editor được tải đúng
    }
  }

  installedUserscriptsTab.onclick = () => showTab('list-view');
  editorTab.onclick = () => showTab('editor-view');
  settingsTab.onclick = () => alert('Settings tab clicked. (Not implemented yet)');
  utilitiesTab.onclick = () => alert('Utilities tab clicked. (Not implemented yet)');

  // === Logic cho Editor View ===
  function loadScriptsIntoEditorAndDropdown() {
    chrome.storage.local.get(['userScripts'], (result) => {
      userScripts = result.userScripts || [];
      scriptSelect.innerHTML = '';

      if (userScripts.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Chưa có script nào';
        scriptSelect.appendChild(option);
        editor.setValue('');
        currentScriptIndex = -1;
        currentScriptNameSpan.textContent = 'Chưa chọn script';
        saveScriptBtn.disabled = true;
        deleteScriptBtn.disabled = true;
        return;
      }

      userScripts.forEach((script, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = script.name;
        scriptSelect.appendChild(option);
      });

      // Kiểm tra nếu script hiện tại vẫn còn tồn tại trong danh sách
      if (currentScriptIndex !== -1 && userScripts[currentScriptIndex]) {
          scriptSelect.value = currentScriptIndex;
          editor.setValue(userScripts[currentScriptIndex].code);
          currentScriptNameSpan.textContent = userScripts[currentScriptIndex].name;
          saveScriptBtn.disabled = false;
          deleteScriptBtn.disabled = false;
      } else {
          // Nếu không, chọn script đầu tiên (nếu có)
          scriptSelect.value = 0;
          currentScriptIndex = 0;
          editor.setValue(userScripts[0].code);
          currentScriptNameSpan.textContent = userScripts[0].name;
          saveScriptBtn.disabled = false;
          deleteScriptBtn.disabled = false;
      }
      editor.focus();
    });
  }

  scriptSelect.onchange = (event) => {
    const selectedIndex = parseInt(event.target.value, 10);
    if (selectedIndex >= 0 && selectedIndex < userScripts.length) {
      currentScriptIndex = selectedIndex;
      editor.setValue(userScripts[currentScriptIndex].code);
      currentScriptNameSpan.textContent = userScripts[currentScriptIndex].name;
      saveScriptBtn.disabled = false;
      deleteScriptBtn.disabled = false;
      editor.focus();
    } else {
        editor.setValue('');
        currentScriptIndex = -1;
        currentScriptNameSpan.textContent = 'Chưa chọn script';
        saveScriptBtn.disabled = true;
        deleteScriptBtn.disabled = true;
    }
  };

  addScriptBtn.onclick = () => {
    const scriptName = prompt('Nhập tên script mới:');
    if (!scriptName) {
      alert('Tên script không được để trống.');
      return;
    }

    const templateCode = `// ==UserScript==
// @name         ${scriptName}
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A new user script.
// @author       Your Name
// @match        http://*/*
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
})();`;

    userScripts.push({
      name: scriptName,
      code: templateCode,
      enabled: true,
      version: "1.0",
      size: `${(new TextEncoder().encode(templateCode).length / 1024).toFixed(2)} KB`, // Approximate size
      sites: "<all>", // Placeholder
      homepage: "",
      lastUpdated: new Date().toLocaleDateString("vi-VN") // Current date
    });

    chrome.storage.local.set({ userScripts }, () => {
      alert('Script mới đã được thêm thành công!');
      loadScriptsIntoEditorAndDropdown();
      scriptSelect.value = userScripts.length - 1; // Select the newly added script
      currentScriptIndex = userScripts.length - 1;
      editor.setValue(templateCode);
      currentScriptNameSpan.textContent = scriptName;
      editor.focus();
      chrome.runtime.sendMessage({ type: "scriptAdded" });
      renderUserscriptsTable(); // Update list view as well
      showTab('editor-view'); // Switch to editor view
    });
  };

  saveScriptBtn.onclick = () => {
    if (currentScriptIndex === -1 || !userScripts[currentScriptIndex]) {
      alert('Vui lòng chọn một script để lưu.');
      return;
    }

    const updatedCode = editor.getValue();
    userScripts[currentScriptIndex].code = updatedCode;
    userScripts[currentScriptIndex].size = `${(new TextEncoder().encode(updatedCode).length / 1024).toFixed(2)} KB`;
    userScripts[currentScriptIndex].lastUpdated = new Date().toLocaleDateString("vi-VN");

    // Optional: Parse metadata for name, version, homepage, match sites
    const metadata = parseUserscriptMetadata(updatedCode);
    userScripts[currentScriptIndex].name = metadata.name || userScripts[currentScriptIndex].name;
    userScripts[currentScriptIndex].version = metadata.version || userScripts[currentScriptIndex].version;
    userScripts[currentScriptIndex].homepage = metadata.homepage || userScripts[currentScriptIndex].homepage;
    userScripts[currentScriptIndex].sites = metadata.match.length > 0 ? metadata.match.join(', ') : "<all>";


    chrome.storage.local.set({ userScripts }, () => {
      alert('Script đã được lưu thành công!');
      chrome.runtime.sendMessage({ type: "scriptUpdated" });
      renderUserscriptsTable(); // Update list view as well
    });
  };

  deleteScriptBtn.onclick = () => {
    if (currentScriptIndex === -1 || !userScripts[currentScriptIndex]) {
      alert('Vui lòng chọn một script để xóa.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa script "${userScripts[currentScriptIndex].name}"?`)) {
      userScripts.splice(currentScriptIndex, 1);
      chrome.storage.local.set({ userScripts }, () => {
        alert('Script đã được xóa!');
        currentScriptIndex = -1;
        loadScriptsIntoEditorAndDropdown();
        chrome.runtime.sendMessage({ type: "scriptDeleted" });
        renderUserscriptsTable(); // Update list view
        showTab('list-view'); // Switch to list view after deletion
      });
    }
  };

  // Hàm parse metadata từ user script (cần cải tiến để chính xác hơn)
  function parseUserscriptMetadata(code) {
    const metadata = {
      name: null,
      version: null,
      description: null,
      author: null,
      match: [],
      include: [],
      exclude: [],
      grant: [],
      homepage: null
    };

    const lines = code.split('\n');
    let inMetadataBlock = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '// ==UserScript==') {
        inMetadataBlock = true;
        continue;
      }
      if (trimmedLine === '// ==/UserScript==') {
        inMetadataBlock = false;
        break;
      }
      if (inMetadataBlock && trimmedLine.startsWith('// @')) {
        const parts = trimmedLine.substring(4).split(/\s+/); // Split by one or more spaces
        const key = parts[0];
        const value = parts.slice(1).join(' ').trim();

        switch (key) {
          case 'name': metadata.name = value; break;
          case 'version': metadata.version = value; break;
          case 'description': metadata.description = value; break;
          case 'author': metadata.author = value; break;
          case 'match': metadata.match.push(value); break;
          case 'include': metadata.include.push(value); break;
          case 'exclude': metadata.exclude.push(value); break;
          case 'grant': metadata.grant.push(value); break;
          case 'homepage': metadata.homepage = value; break;
          // Add other metadata keys as needed
        }
      }
    }
    return metadata;
  }

  // === Logic cho Installed Userscripts View (bảng) ===
  function renderUserscriptsTable() {
    chrome.storage.local.get(['userScripts'], (result) => {
      userScripts = result.userScripts || [];
      userscriptsTableBody.innerHTML = ''; // Xóa các hàng cũ

      if (userScripts.length === 0) {
        const row = userscriptsTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 9; // Span all columns
        cell.textContent = 'Chưa có script nào được cài đặt.';
        cell.style.textAlign = 'center';
        cell.style.padding = '20px';
        return;
      }

      userScripts.forEach((script, index) => {
        // Cố gắng parse metadata mỗi khi hiển thị (có thể tối ưu bằng cách lưu vào storage)
        const metadata = parseUserscriptMetadata(script.code);

        const row = userscriptsTableBody.insertRow();
        row.dataset.index = index; // Lưu index của script vào hàng

        // # column
        row.insertCell().textContent = index + 1;

        // Enabled column
        const enabledCell = row.insertCell();
        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.checked = script.enabled;
        enabledCheckbox.dataset.index = index;
        enabledCheckbox.onchange = (event) => {
          userScripts[index].enabled = event.target.checked;
          chrome.storage.local.set({ userScripts }, () => {
            console.log(`Script "${script.name}" status updated.`);
            chrome.runtime.sendMessage({ type: "scriptStatusChange" });
          });
        };
        enabledCell.appendChild(enabledCheckbox);

        // Name column
        const nameCell = row.insertCell();
        // Optional: Add an icon placeholder like Tampermonkey
        // const iconPlaceholder = document.createElement('span');
        // iconPlaceholder.classList.add('icon-placeholder');
        // nameCell.appendChild(iconPlaceholder);
        nameCell.append(metadata.name || script.name || 'Untitled Script'); // Display parsed name

        // Version column
        row.insertCell().textContent = metadata.version || script.version || 'N/A';

        // Size column
        row.insertCell().textContent = script.size || `${(new TextEncoder().encode(script.code).length / 1024).toFixed(2)} KB`;

        // Sites column (simplified)
        row.insertCell().textContent = metadata.match.length > 0 ? metadata.match.join(', ') : "<all>";

        // Homepage column (simplified)
        const homepageCell = row.insertCell();
        if (metadata.homepage) {
            const homepageLink = document.createElement('a');
            homepageLink.href = metadata.homepage;
            homepageLink.textContent = "Link";
            homepageLink.target = "_blank"; // Open in new tab
            homepageCell.appendChild(homepageLink);
        } else {
            homepageCell.textContent = "N/A";
        }


        // Last updated column
        row.insertCell().textContent = script.lastUpdated || 'N/A';

        // Actions column
        const actionsCell = row.insertCell();
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('script-action-buttons');

        const editButton = document.createElement('button');
        editButton.classList.add('edit-btn');
        editButton.textContent = 'Sửa';
        editButton.title = 'Chỉnh sửa script';
        editButton.onclick = () => {
          currentScriptIndex = index;
          showTab('editor-view'); // Chuyển sang tab editor
          loadScriptsIntoEditorAndDropdown(); // Load script vào editor
        };
        actionsDiv.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        deleteButton.textContent = 'Xóa';
        deleteButton.title = 'Xóa script này';
        deleteButton.onclick = () => {
          if (confirm(`Bạn có chắc chắn muốn xóa script "${script.name}"?`)) {
            userScripts.splice(index, 1);
            chrome.storage.local.set({ userScripts }, () => {
              alert('Script đã được xóa!');
              chrome.runtime.sendMessage({ type: "scriptDeleted" });
              renderUserscriptsTable(); // Tải lại bảng
              // Nếu script bị xóa là script đang chỉnh sửa, reset editor
              if (currentScriptIndex === index) {
                  currentScriptIndex = -1;
                  loadScriptsIntoEditorAndDropdown();
              }
            });
          }
        };
        actionsDiv.appendChild(deleteButton);

        actionsCell.appendChild(actionsDiv);
      });
    });
  }

  // Handle select all/none for "Enabled"
  selectAllEnabledCheckbox.onchange = (event) => {
    const isChecked = event.target.checked;
    userscriptsTableBody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = isChecked;
      const index = checkbox.dataset.index;
      if (userScripts[index]) {
        userScripts[index].enabled = isChecked;
      }
    });
    chrome.storage.local.set({ userScripts }, () => {
        console.log("All script statuses updated.");
        chrome.runtime.sendMessage({ type: "scriptStatusChange" });
    });
  };


  // === Khởi tạo ban đầu ===
  // Khởi chạy khi options page được mở
  showTab('list-view'); // Hiển thị tab danh sách script khi options page mở
});

// Các nút menu trong Editor View (chưa có chức năng)
document.getElementById('fileMenu').onclick = () => alert('Tính năng File chưa được triển khai.');
document.getElementById('editMenu').onclick = () => alert('Tính năng Edit chưa được triển khai.');
document.getElementById('selectionMenu').onclick = () => alert('Tính năng Selection chưa được triển khai.');
document.getElementById('findMenu').onclick = () => alert('Tính năng Find chưa được triển khai.');
document.getElementById('gotoMenu').onclick = () => alert('Tính năng GoTo chưa được triển khai.');
document.getElementById('developerMenu').onclick = () => alert('Tính năng Developer chưa được triển khai.');
document.getElementById('settingsBtnEditor').onclick = () => alert('Tính năng Cài đặt (Editor) chưa được triển khai.');
document.getElementById('helpBtnEditor').onclick = () => alert('Tính năng Trợ giúp (Editor) chưa được triển khai.');