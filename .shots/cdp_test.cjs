// CDP over raw WebSocket (Node 標準 only) で popup を操作し、
// ワード選択 → 総括欄反映 → 選択解除 を検証する。
const WebSocket = require('ws')

async function getTab() {
  const res = await fetch('http://127.0.0.1:9334/json')
  const tabs = await res.json()
  const t = tabs.find((x) => x.type === 'page' && x.url && x.url.includes('popup.html'))
  if (!t) throw new Error('no popup tab found; tabs=' + JSON.stringify(tabs.map((x) => x.url)))
  return t
}

class CDPSession {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.ready = new Promise((r,j)=>{ws.on('open',r);ws.on('error',j)}) }
  static async open(wsUrl) {
    const ws = new WebSocket(wsUrl)
    const s = new CDPSession(ws)
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString())
      if (msg.id && s.pending.has(msg.id)) {
        const { resolve, reject } = s.pending.get(msg.id)
        s.pending.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    })
    await s.ready
    return s
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
}

;(async () => {
  await getTab()
  const cdp = await CDPSession.open((await getTab()).webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url: 'http://localhost:4188/popup.html' })
  await new Promise((r) => setTimeout(r, 1500))

  const log = []
  const step = async (name, fn) => { const v = await fn(); log.push(`${name}: ${v}`); return v }

  // 1) 初期状態の確認
  await step('initial group count', () => cdp.eval(`document.querySelectorAll('[class*="font-cinzel"]').length`))
  await step('initial words rendered', () => cdp.eval(`Array.from(document.querySelectorAll('div')).filter(d=>d.title==='銀髪ロング。綾波系。'||d.textContent==='long silver hair').length>0`))

  // 2) 最初のワードをクリック選択（シングルクリックは 230ms 遅延で発火）
  //    ワードのテキスト内容で検索して行をクリック
  const clickByText = (txt) => `
    (function(){
      const els = Array.from(document.querySelectorAll('div'));
      const t = els.find(d=>(d.textContent||'').trim()===${JSON.stringify(txt)} && d.querySelector('*')===null);
      if(!t) throw new Error('word not found: '+${JSON.stringify(txt)});
      // 行（onClick を持つ祖先）まで上ってクリック
      let row = t;
      while(row && !row.getAttribute('class').includes('cursor-pointer')) row = row.parentElement;
      (row||t).click();
    })()`
  await cdp.eval(clickByText('long silver hair'))
  await new Promise((r) => setTimeout(r, 400))

  await step('selected count after 1 click', () => cdp.eval(`document.querySelectorAll('.word-selected').length`))
  await step('synthesis shows word', () => cdp.eval(`{const t=document.querySelector('pre'); t? t.textContent.includes('long silver hair') : 'no-pre'}`))

  // 3) もう一つ選択（red eyes）
  await cdp.eval(clickByText('red eyes'))
  await new Promise((r) => setTimeout(r, 400))
  await step('selected count after 2 clicks', () => cdp.eval(`document.querySelectorAll('.word-selected').length`))
  await step('synthesis has 2 words', () => cdp.eval(`{const t=document.querySelector('pre'); t? t.textContent.trim().split(',').filter(Boolean).length : 0}`))

  // 4) 右下の選択ワードをクリックして解除
  await cdp.eval(`
    (function(){
      const btns = document.querySelectorAll('section button[title="クリックで選択解除"]');
      if(btns.length) btns[0].click();
    })()
  `)
  await new Promise((r) => setTimeout(r, 400))
  await step('selected count after deselect', () => cdp.eval(`document.querySelectorAll('.word-selected').length`))

  // 5) 検索で非ヒット淡色化
  await cdp.eval(`
    (function(){
      const i = document.querySelector('input[placeholder="SEARCH WORDS · NOTES"]');
      if(!i) throw new Error('searchbox not found');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      setter.call(i,'sunset');
      i.dispatchEvent(new Event('input',{bubbles:true}));
    })()
  `)
  await new Promise((r) => setTimeout(r, 300))
  await step('dimmed words after search "sunset"', () => cdp.eval(`Array.from(document.querySelectorAll('.opacity-30')).length`))

  console.log('=== INTERACTION TEST RESULTS ===')
  for (const l of log) console.log(l)
  process.exit(0)
})().catch((e) => { console.error('TEST FAILED:', e.message); process.exit(1) })
