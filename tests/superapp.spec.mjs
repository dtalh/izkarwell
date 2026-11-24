import {test,expect} from '@playwright/test';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',rid='33333333-3333-4333-8333-333333333333';
const sample={id:rid,created_by:other,customer_name:'TEST Müşteri A',delivery_date:'2026-11-24',status:'complete',account_done:false,ford_done:false,created_at:'2026-11-24T10:00:00Z',archived_at:null,incomplete_note:'',revision:0};
async function fixture(page,role='',initial=[]){
 const rows=initial.map(r=>({...r})),uploads=new Map(),history=[];
 const session=role?{access_token:'test-token',user:{id,email:'test@example.invalid'}}:null;
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:'+JSON.stringify(session)+'},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})}})};'}));
 await page.route('https://dfexhuqdbcrjfhscmqjy.supabase.co/**',async route=>{
  const request=route.request(),u=new URL(request.url()),path=u.pathname,method=request.method(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-expose-headers':'content-type'};
  const reply=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(path.endsWith('/work_module_members'))return reply(role?[{module_key:'ford-pilot',role}]:[]);
  if(path.endsWith('/platform_is_admin'))return reply(role==='admin');
  if(path.endsWith('/platform_list_users'))return reply([{user_id:id,display_name:'TEST Yönetici',email:'test@example.invalid'}]);
  if(path.endsWith('/ford_pilot_records'))return reply(rows.filter(r=>(role==='admin'||role==='reviewer'||r.created_by===id)&&(!u.searchParams.has('archived_at')||!r.archived_at)));
  if(path.endsWith('/ford_pilot_report_creators'))return reply(rows.map(r=>({record_id:r.id,creator_name:r.created_by===id?'TEST Yönetici':'TEST Personel',creator_email:'test@example.invalid'})));
  if(path.endsWith('/ford_pilot_duplicate'))return reply(rows.length>0);
  if(path.endsWith('/ford_pilot_begin_v2')){const p=request.postDataJSON();rows.push({id:p.p_id,created_by:id,customer_name:p.p_name,delivery_date:p.p_date,status:'draft',account_done:p.p_account,ford_done:p.p_ford,incomplete_note:p.p_note,revision:0,created_at:'2026-11-24T10:00:00Z',archived_at:null});return reply(p.p_id)}
  if(path.endsWith('/ford_pilot_finish')){const p=request.postDataJSON();rows.find(r=>r.id===p.p_id).status='complete';return reply(p.p_id)}
  if(path.endsWith('/ford_pilot_edit')){const p=request.postDataJSON(),r=rows.find(r=>r.id===p.p_id);Object.assign(r,{customer_name:p.p_name,delivery_date:p.p_date,account_done:p.p_account,ford_done:p.p_ford,incomplete_note:p.p_note,revision:r.revision+1});history.push(r.id);return reply(r.revision)}
  if(path.includes('/storage/v1/object/')){const k=path.split('/').slice(-2).join('/');if(method==='POST'){uploads.set(k,request.postDataBuffer());return reply({Key:k})}if(uploads.has(k))return route.fulfill({headers,contentType:'image/jpeg',body:uploads.get(k)});return reply({error:'not_found'},404)}
  return reply({error:'fixture_not_implemented'},404)
 });
 // Prevent any unmocked outside request from reaching a real service.
 await page.route(/https:\/\/(?!cdn\.jsdelivr\.net\/|dfexhuqdbcrjfhscmqjy\.supabase\.co\/).*/,r=>r.abort());
 return {rows,uploads,history}
}
test('Guest sees personal space and can record water',async({page})=>{
 await fixture(page);await page.goto('/');await expect(page.locator('#homeWork')).toBeHidden();await expect(page.locator('#workNav')).toBeHidden();
 await expect(page.getByText('Aktif Yaşam',{exact:true})).toHaveCount(0);
 await page.locator('#page-home [data-tab=water]').click();await page.getByRole('button',{name:'+250 ml',exact:true}).click();await expect(page.locator('#waterTotal')).toHaveText('250 ml');
});
test('Authorized worker sees work center, uploads a photo and may continue duplicate',async({page})=>{
 const f=await fixture(page,'operator',[sample]);await page.goto('/');await expect(page.locator('#homeWork')).toBeVisible();await page.locator('#homeNewFord').click();
 await expect(page.locator('#fordNoteLabel')).toBeVisible();await page.locator('#fordName').fill('TEST Müşteri A');await page.locator('#fordDate').fill('2026-11-24');await page.locator('#fordAccount').check();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=30;c.height=30;c.getContext('2d').fillRect(0,0,30,30);return c.toDataURL('image/png').split(',')[1]});
 await page.locator('#fordAccountFile').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await expect(page.locator('#fordAccountPreview')).toBeVisible();
 await page.locator('#fordNote').fill('Örnek açıklama');await page.locator('#fordForm button[type=submit]').click();await expect(page.locator('#fordDuplicatePrompt')).toBeVisible();await page.locator('#fordDuplicateContinue').click();
 await expect(page.locator('#fordStatus')).toContainText('Kayıt sunucuya kaydedildi');expect(f.rows.length).toBe(2);expect(f.uploads.size).toBe(1);
 await expect(page.locator('#fordList').getByText('Örnek açıklama',{exact:false})).toBeVisible();await page.locator('#fordList').getByRole('button',{name:'Düzenle',exact:true}).click();await page.locator('#fordNote').fill('Güncellenen açıklama');await page.locator('#fordForm button[type=submit]').click();await expect(page.locator('#fordStatus')).toContainText('Kayıt güncellendi');expect(f.history.length).toBe(1)
});
test('Desktop admin filters by staff and exports report',async({page})=>{
 await fixture(page,'admin',[sample,{...sample,id:'44444444-4444-4444-8444-444444444444',created_by:id,customer_name:'TEST Müşteri B'}]);await page.goto('/admin/');await expect(page.locator('#total')).toHaveText('2');await page.locator('#person').selectOption(id);await expect(page.locator('#total')).toHaveText('1');
 await page.locator('#report').click();await expect(page.locator('#reportPreview')).toContainText('TEST Müşteri B');await expect(page.locator('#reportPreview')).not.toContainText('TEST Müşteri A');const download=page.waitForEvent('download');await page.locator('#reportDownload').click();expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)
});
