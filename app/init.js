// Replace the init function at the bottom of app.html
(function init(){
  const hash = location.hash;
  
  if (hash && hash.includes('token=')) {
    // Token passed via URL hash from callback
    const hashParams = new URLSearchParams(hash.slice(1));
    const tokenB64 = hashParams.get('token');
    const expiry = hashParams.get('expiry');
    const refreshB64 = hashParams.get('refresh');
    
    if (tokenB64) {
      try {
        const token = atob(tokenB64.replace(/-/g, '+').replace(/_/g, '/'));
        lsSet('wh_token', token);
        lsSet('wh_expiry', expiry || String(Date.now() + 3500000));
        if (refreshB64) lsSet('wh_refresh', atob(refreshB64.replace(/-/g, '+').replace(/_/g, '/')));
        
        state.accessToken = token;
        state.authed = true;
        history.replaceState({}, '', '/app.html');
        showToast('Gmail connected! Loading emails...', 'success');
        syncGmailWithToken(token);
      } catch(e) {
        showToast('Auth error: ' + e.message, 'error');
      }
    }
    render();
    return;
  }
  
  const params = new URLSearchParams(location.search);
  if (params.get('error')) {
    showToast('Auth error: ' + params.get('error'), 'error');
    history.replaceState({}, '', '/app.html');
  }
  
  // Check stored token
  const t = getToken();
  if (t) { state.accessToken = t; state.authed = true; syncGmailWithToken(t); }
  render();
})();
