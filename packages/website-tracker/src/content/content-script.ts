/**
 * Content Script — provides page metadata on request
 */

console.log('[Tracker] Content script loaded');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      success: true,
      data: {
        title: document.title,
        url: window.location.href,
        selection: window.getSelection()?.toString(),
      },
    });
  }
});

export {};
