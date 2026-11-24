/* Account namespace is selected before existing modules initialize. */
window.izkarAccount='';
try{const id=localStorage.getItem('izkarwell.active-account.v1')||'';if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))window.izkarAccount=id}catch{}
