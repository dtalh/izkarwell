/* Small dependency-free OOXML workbook writer. All user values are inline strings, never formulas. */
(function(){
'use strict';
const enc=new TextEncoder(), xml=s=>String(s??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',pkg='http://schemas.openxmlformats.org/package/2006/relationships',head='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
function sheet(rows,widths,filter){
 const end=col(Math.max(0,rows[0].length-1))+Math.max(1,rows.length);
 return head+'<worksheet xmlns="'+ns+'"><dimension ref="A1:'+end+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>'+widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols><sheetData>'+rows.map((r,i)=>'<row r="'+(i+1)+'">'+r.map((v,j)=>'<c r="'+col(j)+(i+1)+'" t="inlineStr" s="'+(i===0?1:0)+'"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData>'+(filter?'<autoFilter ref="A1:'+end+'"/>':'')+'</worksheet>';
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});
function crc(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zip(files,type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
 let offset=0,centralLength=0;const chunks=[],central=[];
 for(const [name,content] of files){const n=enc.encode(name),b=content instanceof Uint8Array?content:enc.encode(content),sum=crc(b),l=new Uint8Array(30),d=new DataView(l.buffer);
 d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);d.setUint16(12,33,true);d.setUint32(14,sum,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true);
 const c=new Uint8Array(46),v=new DataView(c.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,sum,true);v.setUint32(20,b.length,true);v.setUint32(24,b.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);
 chunks.push(l,n,b);central.push(c,n);offset+=l.length+n.length+b.length;centralLength+=c.length+n.length;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralLength,true);e.setUint32(16,offset,true);
 return new Blob([...chunks,...central,end],{type});
}
window.izkarFordZip=files=>zip(files,'application/zip');
window.izkarFordWorkbook=(rows,summary,staff=[['Personel']])=>zip([
 ['[Content_Types].xml',head+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
 ['_rels/.rels',head+'<Relationships xmlns="'+pkg+'"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ['xl/workbook.xml',head+'<workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><sheets><sheet name="Kayıtlar" sheetId="1" r:id="rId1"/><sheet name="Özet" sheetId="2" r:id="rId2"/><sheet name="Personel" sheetId="3" r:id="rId4"/></sheets></workbook>'],
 ['xl/_rels/workbook.xml.rels',head+'<Relationships xmlns="'+pkg+'"><Relationship Id="rId1" Type="'+rel+'/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="'+rel+'/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="'+rel+'/styles" Target="styles.xml"/><Relationship Id="rId4" Type="'+rel+'/worksheet" Target="worksheets/sheet3.xml"/></Relationships>'],
 ['xl/styles.xml',head+'<styleSheet xmlns="'+ns+'"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12233C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
 ['xl/worksheets/sheet1.xml',sheet(rows,[32,18,22,22,18,22,30,38,24,48],true)],
 ['xl/worksheets/sheet2.xml',sheet(summary,[35,60],false)],
 ['xl/worksheets/sheet3.xml',sheet(staff,[55,20,25,25,20],true)]
]);
})();