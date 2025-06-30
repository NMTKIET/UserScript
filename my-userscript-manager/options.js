// Khởi tạo biến toàn cục cho CodeMirror instance
let editor;
let userScripts = [];
let currentScriptIndex = -1; // Index của script đang được chỉnh sửa

document.addEventListener('DOMContentLoaded', () => {
  const addScriptBtn = document.getElementById('addScriptBtn');
  const saveScriptBtn = document.getElementById('saveScriptBtn');
  const deleteScriptBtn = document.getElementById('deleteScriptBtn');
  const scriptSelect = document.getElementById('scriptSelect');
  const currentScriptNameSpan = document.getElementById('currentScriptName');

  // Khởi tạo CodeMirror Editor
  editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
    lineNumbers: true, // Hiển thị số dòng
    mode: "javascript", // Chế độ highlight cú pháp JavaScript
    indentUnit: 2, // Số khoảng trắng cho mỗi mức thụt lề
    tabSize: 2, // Kích thước tab
    theme: "default", // Hoặc các theme khác nếu bạn tải thêm (vd: "dracula", "material")
    // Một số tùy chọn khác để giống Tampermonkey
    extraKeys: {
      "Ctrl-Space": "autocomplete" // Gợi ý tự động (nếu có add-on)
    }
  });

  // Hàm tải danh sách script vào dropdown và CodeMirror
  function loadScriptsIntoEditorAndDropdown() {
    chrome.storage.local.get(['userScripts'], (result) => {
      userScripts = result.userScripts || [];
      scriptSelect.innerHTML = ''; // Xóa các tùy chọn cũ

      if (userScripts.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Chưa có script nào';
        scriptSelect.appendChild(option);
        editor.setValue(''); // Xóa nội dung editor
        currentScriptIndex = -1;
        currentScriptNameSpan.textContent = 'Chưa chọn script';
        saveScriptBtn.disabled = true;
        deleteScriptBtn.disabled = true;
        return;
      }

      userScripts.forEach((script, index) => {
        const option = document.createElement('option');
        option.value = index; // Lưu index của script
        option.textContent = script.name;
        scriptSelect.appendChild(option);
      });

      // Nếu có script đã được chọn trước đó, chọn lại nó
      if (currentScriptIndex !== -1 && userScripts[currentScriptIndex]) {
          scriptSelect.value = currentScriptIndex;
          editor.setValue(userScripts[currentScriptIndex].code);
          currentScriptNameSpan.textContent = userScripts[currentScriptIndex].name;
          saveScriptBtn.disabled = false;
          deleteScriptBtn.disabled = false;
      } else {
          // Mặc định chọn script đầu tiên nếu có
          scriptSelect.value = 0;
          currentScriptIndex = 0;
          editor.setValue(userScripts[0].code);
          currentScriptNameSpan.textContent = userScripts[0].name;
          saveScriptBtn.disabled = false;
          deleteScriptBtn.disabled = false;
      }
      editor.focus(); // Đặt con trỏ vào editor
    });
  }

  // Xử lý khi chọn script khác từ dropdown
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

  // Xử lý nút "Thêm Script Mới"
  addScriptBtn.onclick = () => {
    const scriptName = prompt('Nhập tên script mới:');
    if (!scriptName) {
      alert('Tên script không được để trống.');
      return;
    }

    // Tạo một template cơ bản cho user script
    const templateCode = `// ==UserScript==
// @name         ${scriptName}
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Try to take over the world!
// @author       You
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
      enabled: true
    });

    chrome.storage.local.set({ userScripts }, () => {
      alert('Script mới đã được thêm!');
      loadScriptsIntoEditorAndDropdown(); // Tải lại danh sách
      // Chọn script mới thêm vào
      scriptSelect.value = userScripts.length - 1;
      currentScriptIndex = userScripts.length - 1;
      editor.setValue(templateCode);
      currentScriptNameSpan.textContent = scriptName;
      editor.focus();
      chrome.runtime.sendMessage({ type: "scriptAdded" });
    });
  };

  // Xử lý nút "Lưu Script"
  saveScriptBtn.onclick = () => {
    if (currentScriptIndex === -1 || !userScripts[currentScriptIndex]) {
      alert('Vui lòng chọn một script để lưu.');
      return;
    }

    const updatedCode = editor.getValue();
    userScripts[currentScriptIndex].code = updatedCode;

    chrome.storage.local.set({ userScripts }, () => {
      alert('Script đã được lưu thành công!');
      chrome.runtime.sendMessage({ type: "scriptUpdated" });
    });
  };

  // Xử lý nút "Xóa Script"
  deleteScriptBtn.onclick = () => {
    if (currentScriptIndex === -1 || !userScripts[currentScriptIndex]) {
      alert('Vui lòng chọn một script để xóa.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa script "${userScripts[currentScriptIndex].name}"?`)) {
      userScripts.splice(currentScriptIndex, 1); // Xóa khỏi mảng
      chrome.storage.local.set({ userScripts }, () => {
        alert('Script đã được xóa!');
        currentScriptIndex = -1; // Reset index
        loadScriptsIntoEditorAndDropdown(); // Tải lại danh sách
        chrome.runtime.sendMessage({ type: "scriptDeleted" });
      });
    }
  };

  // Các nút menu (File, Edit, Selection...) có thể được thêm logic sau
  document.getElementById('fileMenu').onclick = () => alert('Tính năng File chưa được triển khai.');
  document.getElementById('editMenu').onclick = () => alert('Tính năng Edit chưa được triển khai.');
  document.getElementById('selectionMenu').onclick = () => alert('Tính năng Selection chưa được triển khai.');
  document.getElementById('findMenu').onclick = () => alert('Tính năng Find chưa được triển khai.');
  document.getElementById('gotoMenu').onclick = () => alert('Tính năng GoTo chưa được triển khai.');
  document.getElementById('developerMenu').onclick = () => alert('Tính năng Developer chưa được triển khai.');
  document.getElementById('settingsBtn').onclick = () => alert('Tính năng Cài đặt chưa được triển khai.');
  document.getElementById('helpBtn').onclick = () => alert('Tính năng Trợ giúp chưa được triển khai.');


  // Tải script khi popup được mở
  loadScriptsIntoEditorAndDropdown();
});