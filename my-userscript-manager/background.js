// Lắng nghe sự kiện khi một tab được cập nhật
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Chỉ chạy khi tab hoàn tất tải và là một trang web (http/https)
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    console.log(`Tab ${tabId} updated: ${tab.url}`);

    // Lấy danh sách user scripts từ storage
    chrome.storage.local.get(['userScripts'], (result) => {
      const userScripts = result.userScripts || [];
      console.log(`Found ${userScripts.length} user scripts in storage.`);

      userScripts.forEach(script => {
        // Kiểm tra nếu script được bật và phù hợp với URL hiện tại
        // Để triển khai tính năng @match/@include/@exclude đầy đủ,
        // bạn sẽ cần một hàm phân tích cú pháp header của script
        // và so sánh URL hiện tại với các quy tắc match/include/exclude.
        // Hiện tại, chúng ta đơn giản hóa: chạy tất cả script được bật trên mọi URL.
        if (script.enabled) {
          console.log(`Attempting to inject script: ${script.name} into ${tab.url}`);
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (code) => {
              // Sử dụng eval để thực thi mã script.
              // CẦN LƯU Ý VỀ BẢO MẬT: eval() có thể không an toàn nếu user script chứa mã độc.
              // Tampermonkey phức tạp hơn nhiều trong việc tạo môi trường sandbox riêng.
              try {
                eval(code);
                console.log("User script executed successfully.");
              } catch (e) {
                console.error("Error executing user script:", e);
              }
            },
            args: [script.code] // Truyền mã script như một đối số
          }).then(() => {
            console.log(`Script "${script.name}" injected into ${tab.url}`);
          }).catch(err => {
            // Lỗi khi inject script (ví dụ: do Content Security Policy của trang)
            console.error(`Failed to inject script "${script.name}" into ${tab.url}:`, err);
          });
        }
      });
    });
  }
});

// Lắng nghe tin nhắn từ popup.js hoặc các phần khác của tiện ích
// để tải lại tab khi có thay đổi về script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "scriptStatusChange" || message.type === "scriptAdded" ||
      message.type === "scriptUpdated" || message.type === "scriptDeleted") {
    console.log(`Received message: ${message.type}. Attempting to reload active tab.`);
    // Tải lại tab đang hoạt động để áp dụng ngay lập tức các thay đổi về script.
    // Cách này đơn giản hơn so với việc tải lại tất cả các tab và ít gây khó chịu hơn.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && (tabs[0].url.startsWith('http://') || tabs[0].url.startsWith('https://'))) {
        chrome.tabs.reload(tabs[0].id);
        console.log(`Reloaded active tab: ${tabs[0].url}`);
      } else {
        console.log("No active web tab to reload.");
      }
    });
  }
});