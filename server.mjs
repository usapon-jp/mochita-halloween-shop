// 依存なしの静的サーバー: node server.mjs → http://127.0.0.1:4193
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname), port=Number(process.env.PORT||4193);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url,'http://x').pathname);
    const f=resolve(root,'.'+(p==='/'?'/index.html':p));
    if(!f.startsWith(root+sep)||p.split('/').some(s=>s.startsWith('.'))){res.writeHead(403);res.end();return}
    const body=await readFile(f);
    res.writeHead(200,{'Content-Type':mime[extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log('shop-scenery: http://127.0.0.1:'+port));
