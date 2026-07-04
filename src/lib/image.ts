// ============================================================
// 画像圧縮 / Image compression
// ユーザーが選択した画像を「縦横最大 420px（比率維持）・JPEG強圧縮」の
// data URL（Base64）に変換する。chrome.storage に収めるためサイズ優先。
// ============================================================

/** 1辺の最大ピクセル数。 */
const MAX_DIM = 420

/** 1枚あたりのサイズ目安（Base64文字列長）。これを超えない品質を選ぶ。 */
const SIZE_BUDGET = 60_000

/** 検証する品質（高い→低い）。低いほどファイルが小さい。 */
const QUALITIES = [0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15]

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = src
  })
}

/** 縦横が MAX_DIM 以下に収まるよう、比率を維持して縮小。元が小さればそのまま。 */
function fitWithin(w: number, h: number): { w: number; h: number } {
  const ratio = Math.min(MAX_DIM / w, MAX_DIM / h)
  if (ratio >= 1) return { w, h }
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) }
}

/**
 * 選択ファイルを圧縮済み JPEG data URL に変換する。
 * 複数の品質で出力し、SIZE_BUDGET 以下の最小もの（なければ最も小さいもの）を採用。
 */
export async function fileToCompressedDataURL(file: File): Promise<string> {
  const raw = await readAsDataURL(file)
  const img = await loadImage(raw)
  const { w, h } = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw // フォールバック
  // 白背景を敷いて透過JPEGの黒潰れを防ぐ
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  let best = canvas.toDataURL('image/jpeg', QUALITIES[0])
  for (const q of QUALITIES) {
    const out = canvas.toDataURL('image/jpeg', q)
    if (out.length < best.length) best = out
    if (out.length <= SIZE_BUDGET) return out
  }
  return best
}
