import {test,expect} from '@playwright/test';
async function setup(page,admin=true){
 const session={access_token:'synthetic',user:{id:'synthetic-admin',email:'admin@example.invalid'}};
 let allowed=admin,deny=false;const changes=[];
 await page.route('https://**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'application/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:${JSON.stringify(session)}}}),onAuthStateChange:cb=>{window.changeSession=s=>cb('SIGNED_IN',s)},signOut:async()=>({})}})}`});
 if(!u.hostname.endsWith('supabase.co'))return route.abort();
 const name=u.pathname.split('/').pop(),p=route.request().postDataJSON();
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(name==='platform_is_admin')return reply(allowed);
 if(deny)return reply({},403);
 if(name==='platform_list_modules')return reply([{module_key:'ford-pilot',title:'Ford'}]);
 if(name==='platform_list_users')return reply([{user_id:'synthetic-user',display_name:'TEST Üye',email:'user@example.invalid',module_roles:{'ford-pilot':'operator'}}]);
 if(name==='platform_role_history')return reply(changes.map(x=>({module_key:'ford-pilot',old_role:'operator',new_role:x.p_role,target_email:'user@example.invalid'})));
 if(name==='platform_set_module_role'){changes.push(p);return reply(true)}
 return reply([]);
 });return {revoke:()=>{allowed=false},deny:()=>{deny=true},changes};
}
test('Profile management link requires affirmative server authorization',async({page})=>{
 const f=await setup(page);await page.goto('/');await page.locator('[data-tab=profile]').last().click();await expect(page.locator('#platformAdminLink')).toBeVisible();f.revoke();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('#platformAdminPanel')).toBeHidden();
});
test('Non-admin cannot open user management',async({page})=>{await setup(page,false);await page.goto('/admin/users.html');await expect(page.locator('#workspace')).toBeHidden();await expect(page.locator('#status')).toContainText('yalnızca');});
test('Mobile role edit and history fit viewport; denial clears private rows',async({page})=>{
 const f=await setup(page);await page.goto('/admin/users.html');await expect(page.locator('#users tr')).toHaveCount(1);await expect(page.locator('#workspace')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Yetkileri düzenle'}).click();await page.locator('#role').selectOption('reviewer');page.once('dialog',d=>d.accept());await page.locator('#saveRole').click();await expect(page.locator('#history')).toContainText('İnceleyici');expect(f.changes[0].p_role).toBe('reviewer');
 f.deny();await page.locator('#reload').click();await expect(page.locator('#workspace')).toBeHidden();await expect(page.locator('#users tr')).toHaveCount(0);
});
test('Account change closes editor and removes prior data',async({page})=>{
 await setup(page);await page.goto('/admin/users.html');await page.getByRole('button',{name:'Yetkileri düzenle'}).click();await page.evaluate(()=>window.changeSession(null));await expect(page.locator('#editDialog')).not.toBeVisible();await expect(page.locator('#users tr')).toHaveCount(0);await expect(page.locator('#workspace')).toBeHidden();
});
test('Revocation before save prevents role mutation',async({page})=>{
 const f=await setup(page);await page.goto('/admin/users.html');await page.getByRole('button',{name:'Yetkileri düzenle'}).click();f.revoke();page.once('dialog',d=>d.accept());await page.locator('#saveRole').click();await expect(page.locator('#workspace')).toBeHidden();expect(f.changes).toHaveLength(0);
});

test('Late user response cannot restore data after sign-out',async({page})=>{
 await setup(page);let release,started;
 const pending=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 await page.route('**/rest/v1/rpc/platform_list_users',async route=>{started();await gate;await route.fulfill({contentType:'application/json',body:JSON.stringify([{user_id:'old',display_name:'TEST Old'}])})});
 await page.goto('/admin/users.html');await pending;await page.evaluate(()=>window.changeSession(null));await expect(page.locator('#workspace')).toBeHidden();release();await expect(page.locator('#users tr')).toHaveCount(0);await expect(page.locator('#status')).toContainText('Önce');
});
