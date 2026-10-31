// Minimal ZIP support for MV project-data interoperability.
// Reads only selected entries from a Blob; it does not execute or unpack project code/assets.

const decoder=new TextDecoder('utf-8');
const encoder=new TextEncoder();
const SIG_EOCD=0x06054b50,SIG_CENTRAL=0x02014b50,SIG_LOCAL=0x04034b50;

function u16(view,o){return view.getUint16(o,true);}
function u32(view,o){return view.getUint32(o,true);}
function concat(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
function le16(n){return new Uint8Array([n&255,(n>>>8)&255]);}
function le32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);}

export async function readZipDirectory(blob){
  if(!blob||typeof blob.size!=='number'||typeof blob.slice!=='function')throw new TypeError('ZIP source must be a Blob-like object');
  const tailSize=Math.min(blob.size,65557);const tail=new Uint8Array(await blob.slice(blob.size-tailSize).arrayBuffer());const view=new DataView(tail.buffer,tail.byteOffset,tail.byteLength);
  let eocd=-1;for(let i=tail.length-22;i>=0;i--)if(u32(view,i)===SIG_EOCD){eocd=i;break;}
  if(eocd<0)throw new Error('ZIP end-of-central-directory record not found');
  const entryCount=u16(view,eocd+10),centralSize=u32(view,eocd+12),centralOffset=u32(view,eocd+16);
  if(entryCount===0xffff||centralSize===0xffffffff||centralOffset===0xffffffff)throw new Error('ZIP64 archives are not supported by the browser MV importer');
  const bytes=new Uint8Array(await blob.slice(centralOffset,centralOffset+centralSize).arrayBuffer());const cd=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const entries=[];let p=0;
  while(p+46<=bytes.length&&entries.length<entryCount){if(u32(cd,p)!==SIG_CENTRAL)throw new Error(`Invalid ZIP central directory entry at ${p}`);const method=u16(cd,p+10),crc32=u32(cd,p+16),compressedSize=u32(cd,p+20),uncompressedSize=u32(cd,p+24),nameLength=u16(cd,p+28),extraLength=u16(cd,p+30),commentLength=u16(cd,p+32),localHeaderOffset=u32(cd,p+42);const start=p+46,end=start+nameLength;if(end>bytes.length)throw new Error('Truncated ZIP central directory filename');const name=decoder.decode(bytes.slice(start,end));entries.push({name,method,crc32,compressedSize,uncompressedSize,localHeaderOffset});p=end+extraLength+commentLength;}
  if(entries.length!==entryCount)throw new Error(`ZIP central directory count mismatch (${entries.length}/${entryCount})`);
  return entries;
}

async function inflateRaw(bytes){
  if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress deflated ZIP entries');
  let stream;try{stream=new DecompressionStream('deflate-raw');}catch{throw new Error('This browser does not support raw DEFLATE ZIP decompression');}
  const result=await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();return new Uint8Array(result);
}

export async function readZipEntry(blob,entry){
  const headerBytes=new Uint8Array(await blob.slice(entry.localHeaderOffset,entry.localHeaderOffset+30).arrayBuffer());if(headerBytes.length<30)throw new Error(`Truncated ZIP local header for ${entry.name}`);const h=new DataView(headerBytes.buffer,headerBytes.byteOffset,headerBytes.byteLength);if(u32(h,0)!==SIG_LOCAL)throw new Error(`Invalid ZIP local header for ${entry.name}`);const nameLength=u16(h,26),extraLength=u16(h,28),start=entry.localHeaderOffset+30+nameLength+extraLength;const compressed=new Uint8Array(await blob.slice(start,start+entry.compressedSize).arrayBuffer());let out;if(entry.method===0)out=compressed;else if(entry.method===8)out=await inflateRaw(compressed);else throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}`);if(out.length!==entry.uncompressedSize)throw new Error(`ZIP size mismatch for ${entry.name}`);return out;
}

export function mvDataZipEntries(entries){
  const wanted=/^(?:.*\/)?data\/(Actors|Animations|Armors|Classes|CommonEvents|Enemies|Items|MapInfos|Skills|States|System|Tilesets|Troops|Weapons|Map\d{3})\.json$/i;
  return (entries||[]).filter(e=>wanted.test(String(e.name||'').replace(/\\/g,'/')));
}

export async function readMvDataZip(blob){
  const directory=await readZipDirectory(blob),selected=mvDataZipEntries(directory),files={},sources={},errors=[];
  for(const entry of selected){const name=entry.name.replace(/\\/g,'/').split('/').pop();if(name in files){errors.push({code:'MV_ZIP_DUPLICATE_DATA_FILE',file:name,path:entry.name});continue;}try{files[name]=JSON.parse(decoder.decode(await readZipEntry(blob,entry)));sources[name]=entry.name;}catch(error){errors.push({code:'MV_ZIP_ENTRY_INVALID',file:name,path:entry.name,message:error.message});}}
  return {files,sources,entries:selected,errors};
}

let crcTable=null;
function table(){if(crcTable)return crcTable;crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}return crcTable;}
export function crc32(bytes){let c=0xffffffff,t=table();for(const b of bytes)c=t[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}

export function createStoredZip(entries,{prefix='data/'}={}){
  const locals=[],centrals=[];let offset=0;
  for(const item of entries){const nameBytes=encoder.encode(prefix+item.name),data=encoder.encode(typeof item.text==='string'?item.text:JSON.stringify(item.data)),crc=crc32(data);const local=concat([le32(SIG_LOCAL),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(nameBytes.length),le16(0),nameBytes,data]);locals.push(local);const central=concat([le32(SIG_CENTRAL),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(nameBytes.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),nameBytes]);centrals.push(central);offset+=local.length;}
  const localBytes=concat(locals),centralBytes=concat(centrals),eocd=concat([le32(SIG_EOCD),le16(0),le16(0),le16(entries.length),le16(entries.length),le32(centralBytes.length),le32(localBytes.length),le16(0)]);return new Blob([localBytes,centralBytes,eocd],{type:'application/zip'});
}
