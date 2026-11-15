import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const manifest = JSON.parse(await fs.readFile(path.join(root,".agents/tooling.json"),"utf8"));
const requested = process.argv.slice(2);
const selected = requested.length ? requested : Object.keys(manifest.stdioServers);
const results = [];

async function checkStdio(name) {
  return new Promise(resolve => {
    const child = spawn(process.execPath,[path.join(root,"scripts/dev/mcp-server.mjs"),name],{cwd:root,stdio:["pipe","pipe","pipe"],windowsHide:true});
    let buffer = "";
    let done = false;
    const finish = result => {
      if (done) return; done = true; clearTimeout(timer);
      child.stdin.end(); child.kill();
      resolve({name,...result});
    };
    const send = object => child.stdin.write(JSON.stringify(object)+"\n");
    const timer = setTimeout(()=>finish({status:"timeout"}),55000);
    child.on("error",()=>finish({status:"could_not_start"}));
    child.on("exit",code=>{if(!done)finish({status:"exited",exitCode:code});});
    child.stdin.on("error",()=>{});
    // Server diagnostics may contain account or connection data; do not print stderr.
    child.stderr.on("data",()=>{});
    child.stdout.on("data",chunk=>{
      buffer += chunk;
      let newline;
      while ((newline=buffer.indexOf("\n")) >= 0) {
        const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);
        let response;try{response=JSON.parse(line);}catch{continue;}
        if(response.id===1){
          if(response.error){finish({status:"initialize_failed"});return;}
          send({jsonrpc:"2.0",method:"notifications/initialized"});
          send({jsonrpc:"2.0",id:2,method:"tools/list",params:{}});
        }
        if(response.id===2){finish(response.error?{status:"tools_unavailable"}:{status:"ready",tools:response.result?.tools?.length??0});return;}
      }
    });
    send({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"rappel-beauty-setup-check",version:"1.0.0"}}});
  });
}

async function checkHttp(name) {
  const server=manifest.httpServers[name];
  if(server.tokenEnv&&!process.env[server.tokenEnv])return{name,status:"token_env_missing",tokenEnv:server.tokenEnv};
  const headers={"Content-Type":"application/json",Accept:"application/json, text/event-stream"};
  if(server.tokenEnv)headers.Authorization=`Bearer ${process.env[server.tokenEnv]}`;
  const parse=async response=>{
    const text=await response.text();
    if(response.headers.get("content-type")?.includes("application/json"))return JSON.parse(text);
    const messages=text.split("\n").filter(line=>line.startsWith("data:")).map(line=>{try{return JSON.parse(line.slice(5));}catch{return null;}});
    return messages.find(message=>message?.id===2)||messages.find(message=>message?.id===1);
  };
  try{
    const post=body=>fetch(server.url,{method:"POST",headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    const init=await post({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-03-26",capabilities:{},clientInfo:{name:"rappel-beauty-setup-check",version:"1.0.0"}}});
    if(init.status===401||init.status===403)return{name,status:"authentication_required",httpStatus:init.status};
    if(!init.ok)return{name,status:"http_error",httpStatus:init.status};
    const initial=await parse(init);if(initial?.error)return{name,status:"initialize_failed"};
    const session=init.headers.get("mcp-session-id");if(session)headers["Mcp-Session-Id"]=session;
    headers["MCP-Protocol-Version"]=initial?.result?.protocolVersion||"2025-03-26";
    await post({jsonrpc:"2.0",method:"notifications/initialized"});
    const response=await post({jsonrpc:"2.0",id:2,method:"tools/list",params:{}});
    if(!response.ok)return{name,status:"tools_http_error",httpStatus:response.status};
    const data=await parse(response);
    return{name,status:data?.result?.tools?"ready":"tools_unavailable",tools:data?.result?.tools?.length??0};
  }catch{return{name,status:"network_or_protocol_error"};}
}

// Keep checks bounded; two independent servers can warm their caches together.
for(let i=0;i<selected.length;i+=2){
  const pair=await Promise.all(selected.slice(i,i+2).map(name=>manifest.stdioServers[name]?checkStdio(name):checkHttp(name)));
  for(const result of pair){results.push(result);console.log(JSON.stringify(result));}
}
await fs.mkdir(path.join(root,".tmp"),{recursive:true});
await fs.writeFile(path.join(root,".tmp/agent-mcp-readiness.json"),JSON.stringify(results,null,2));
