// Boot
(function init(){
  const params=new URLSearchParams(location.search);
  if(params.get('connected')==='true'){
    history.replaceState({},'','/app.html');
    const t=lsGet('wh_token'),e=parseInt(lsGet('wh_expiry')||'0');
    console.log('connected=true, token:', t?'found len='+t.length:'MISSING', 'expiry ok:', e>Date.now());
    if(t&&e>Date.now()){
      state.accessToken=t;state.authed=true;
      showToast('Gmail connected! Loading emails...','success');
      syncGmailWithToken(t);
    } else {
      showToast('Token missing — please try connecting again','error');
    }
    render();return;
  }
  if(params.get('error')){showToast('Auth error: '+params.get('error'),'error');history.replaceState({},'','/app.html');}
  const t=lsGet('wh_token'),e=parseInt(lsGet('wh_expiry')||'0');
  if(t&&e>Date.now()){state.accessToken=t;state.authed=true;syncGmailWithToken(t);}
  render();
})();
