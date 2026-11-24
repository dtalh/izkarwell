/* Shared, local-only photo preview and optional crop. Never changes the source file. */
(function(){
'use strict';
const maxBytes=10000000;
async function decode(file){
 if(!file||file.size>maxBytes)throw Error('En fazla 10 MB boyutunda fotoğraf seç.');
 const url=URL.createObjectURL(file),img=new Image();
 try{img.src=url;await img.decode();if(!img.naturalWidth||!img.naturalHeight)throw Error();return img}
 catch{throw Error('Fotoğraf okunamadı. JPEG veya PNG biçiminde yeniden dene.')}
 finally{URL.revokeObjectURL(url)}
}
function draw(img,crop,max){
 const [l,t,r,b]=crop.map(Number),w=img.naturalWidth,h=img.naturalHeight;
 const sx=w*l/100,sy=h*t/100,sw=w*(100-l-r)/100,sh=h*(100-t-b)/100,ratio=Math.min(1,max/Math.max(sw,sh));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(sw*ratio));canvas.height=Math.max(1,Math.round(sh*ratio));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);return canvas
}
function attach(input,host){
 let image=null,seq=0;
 const canvas=document.createElement('canvas'),details=document.createElement('details'),summary=document.createElement('summary'),controls=[],msg=document.createElement('p');
 canvas.className='ford-preview';canvas.setAttribute('aria-label','Fotoğraf ön izlemesi');summary.textContent='Fotoğrafı kırp (isteğe bağlı)';details.append(summary);
 for(const title of ['Sol','Üst','Sağ','Alt']){const label=document.createElement('label'),range=document.createElement('input');range.type='range';range.min='0';range.max='40';range.step='1';range.value='0';label.textContent=title;label.append(range);details.append(label);controls.push(range)}
 host.replaceChildren(canvas,details,msg);host.hidden=true;
 const crop=()=>controls.map(x=>Number(x.value));
 function render(){if(!image)return;const c=draw(image,crop(),480);canvas.width=c.width;canvas.height=c.height;canvas.getContext('2d').drawImage(c,0,0)}
 function reset(){seq++;image=null;canvas.width=0;canvas.height=0;for(const r of controls)r.value='0';details.open=false;host.hidden=true;msg.textContent=''}
 input.addEventListener('change',async()=>{reset();const file=input.files[0];if(!file)return;const n=seq;host.hidden=false;msg.textContent='Ön izleme hazırlanıyor…';try{const img=await decode(file);if(n!==seq)return;image=img;render();msg.textContent='Fotoğraf yüklemeden önce cihazda optimize edilir.'}catch(e){if(n===seq){msg.textContent=e.message;input.value=''}}});
 for(const r of controls)r.addEventListener('input',render);
 return {reset,crop};
}
async function compress(file,crop=[0,0,0,0]){
 const img=await decode(file);
 for(const size of [1600,1280,1024]){const c=draw(img,crop,size);for(const quality of [.82,.72,.62]){const b=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',quality));if(b&&b.size<=maxBytes)return b}}
 throw Error('Fotoğraf 10 MB sınırına indirilemedi.')
}
window.izkarPhotoEditor={attach,compress};
})();