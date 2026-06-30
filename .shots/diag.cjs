const WebSocket = require('ws')
async function getTab() {
  const r = await fetch('http://127.0.0.1:9334/json')
  const t = await r.json()
  return t.find((x) => x.type === 'page' && x.url && x.url.includes('popup.html'))
}
class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.p=new Map();this.ready=new Promise((r,j)=>{ws.on('open',r);ws.on('error',j)})}
  static async open(u){const ws=new WebSocket(u);const s=new CDP(ws);ws.on('message',m=>{const x=JSON.parse(m.toString());if(x.id&&s.p.has(x.id)){const{resolve,reject}=s.p.get(x.id);s.p.delete(x.id);x.error?reject(new Error(JSON.stringify(x.error))):resolve(x.result)}});await s.ready;return s}
  send(m,p={}){const id=++this.id;return new Promise((res,rej)=>{this.p.set(id,{resolve:res,reject:rej});this.ws.send(JSON.stringify({id,method:m,params:p}))})}
  async eval(e){const r=await this.send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
}
;(async()=>{
  const cdp=await CDP.open((await getTab()).webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate',{url:'http://localhost:4188/popup.html'})
  await new Promise(r=>setTimeout(r,1500))
  // ワード行を取得: title属性 = word.text を持つ truncate div の title 一覧
  const words = await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('div[title]')).filter(d=>d.parentElement&&d.parentElement.className.includes('cursor-pointer')||true).map(d=>d.title))`)
  console.log('titles:', words)
  // 各ワード行（cursor-pointer を持つ div）の数と内容
  const rows = await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('div')).filter(d=>typeof d.className==='string'&&d.className.includes('cursor-pointer')).map(d=>d.textContent.trim()))`)
  console.log('clickable rows:', rows)
  // 1つ目のワード行を特定してクリック
  await cdp.eval(`(function(){const rows=Array.from(document.querySelectorAll('div')).filter(d=>typeof d.className==='string'&&d.className.includes('cursor-pointer')&&d.textContent.includes('long silver hair'));rows[0]&&rows[0].click()})()`)
  await new Promise(r=>setTimeout(r,400))
  const s1=await cdp.eval(`JSON.stringify({sel:document.querySelectorAll('.word-selected').length, syn:document.querySelector('pre')?.textContent})`)
  console.log('after click1:', s1)
  // 2つ目 red eyes
  await cdp.eval(`(function(){const rows=Array.from(document.querySelectorAll('div')).filter(d=>typeof d.className==='string'&&d.className.includes('cursor-pointer')&&d.textContent.includes('red eyes'));rows[0]&&rows[0].click()})()`)
  await new Promise(r=>setTimeout(r,400))
  const s2=await cdp.eval(`JSON.stringify({sel:document.querySelectorAll('.word-selected').length, syn:document.querySelector('pre')?.textContent, selTitles:Array.from(document.querySelectorAll('.word-selected')).map(d=>d.textContent.trim())})`)
  console.log('after click2:', s2)
})().catch(e=>{console.error('ERR',e.message);process.exit(1)})
