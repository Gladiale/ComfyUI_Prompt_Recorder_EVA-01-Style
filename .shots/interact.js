// CDP 経由で popup を自動操作し、選択 → 総括反映 → 解除 を検証する。
// chrome --headless --remote-debugging-port を起動し、ここから CDP JSON を叩く。
const http = require('http')

const PORT = 9333
const URL = 'http://localhost:4188/popup.html'

function fetchJSON(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `http://127.0.0.1:${PORT}${path}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
      },
    )
    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

async function send(wsId, method, params = {}) {
  // 簡易: WebSocket の代わりに CDP の HTTP は使えないので、ここでは puppeteer が無いと厳しい。
  // 代替として、ページ内にスクリプトを仕込み DOM を直接操作する方式へ切り替える（別ファイル）。
}

;(async () => {
  try {
    const ver = await fetchJSON('/json/version')
    console.log('CDP OK:', ver.Browser)
    const tabs = await fetchJSON('/json')
    let tab = tabs.find((t) => t.url && t.url.startsWith('http://localhost:4188'))
    console.log('tabs:', tabs.map((t) => t.url))
    console.log('Found popup tab:', !!tab)
    // WebSocket 操作は Node 標準だけだと面倒なので、ここは接続確認まで。
  } catch (e) {
    console.error('ERR', e.message)
  }
})()
