export function installInboxModule(store) {
  const fetchMessages = window.fetchGmailMessages;
  if (typeof fetchMessages !== 'function') return;
  window.fetchGmailMessages = async function fetchInboxModule(...args) {
    store.bus.emit('inbox:loading', true);
    try { return await fetchMessages.apply(this, args); }
    finally { store.bus.emit('inbox:loading', false); }
  };
}

