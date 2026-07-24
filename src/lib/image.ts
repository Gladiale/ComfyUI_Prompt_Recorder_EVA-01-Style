// ============================================================
// 画像圧縮 / Image compression
// ユーザーが選択した画像を「縦横最大 N px（比率維持）・JPEG強圧縮」の
// data URL（Base64）に変換する。chrome.storage に収めるためサイズ優先。
// ============================================================

/** ワード画像のデフォルト最大辺。 */
export const WORD_IMAGE_MAX_DIM = 420;

/** プリセット画像の最大辺。 */
export const PRESET_IMAGE_MAX_DIM = 560;

/** 1枚あたりのサイズ目安（Base64文字列長）。これを超えない品質を選ぶ。 */
const DEFAULT_SIZE_BUDGET = 60_000;
const PRESET_SIZE_BUDGET = 140_000;

/** 検証する品質（高い→低い）。低いほどファイルが小さい。 */
const QUALITIES = [0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15];

export interface CompressOptions {
  /** 縦横の最大ピクセル数（既定: 420）。 */
  maxDim?: number;
  /** Base64 文字列長の予算（既定: 60_000 / プリセット時は 140_000）。 */
  sizeBudget?: number;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

/**
 * 縦横が maxDim 以下に収まるよう、比率を維持して縮小する。
 * 元がどちらも maxDim 以下ならそのまま返す。
 * （Canvas を使わない純粋計算。圧縮パイプラインの寸法決定に使用）
 */
export function fitWithin(
  w: number,
  h: number,
  maxDim: number,
): { w: number; h: number } {
  const ratio = Math.min(maxDim / w, maxDim / h);
  if (ratio >= 1) return { w, h };
  return { w: Math.round(w * ratio), h: Math.round(h * ratio) };
}

/**
 * 画像ファイルの元解像度（naturalWidth/Height）を取得する。
 * EXIF の Orientation はブラウザの Image デコード結果に従う。
 */
export async function getImageNaturalSize(
  file: File,
): Promise<{ width: number; height: number }> {
  const raw = await readAsDataURL(file);
  const img = await loadImage(raw);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

/**
 * 選択ファイルを圧縮済み JPEG data URL に変換する。
 * 複数の品質で出力し、sizeBudget 以下のもの（なければ最も小さいもの）を採用。
 */
export async function fileToCompressedDataURL(
  file: File,
  options?: CompressOptions,
): Promise<string> {
  const maxDim = options?.maxDim ?? WORD_IMAGE_MAX_DIM;
  const sizeBudget =
    options?.sizeBudget ??
    (maxDim >= PRESET_IMAGE_MAX_DIM ? PRESET_SIZE_BUDGET : DEFAULT_SIZE_BUDGET);

  const raw = await readAsDataURL(file);
  const img = await loadImage(raw);
  const { w, h } = fitWithin(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxDim,
  );

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw; // フォールバック
  // 白背景を敷いて透過JPEGの黒潰れを防ぐ
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let best = canvas.toDataURL("image/jpeg", QUALITIES[0]);
  for (const q of QUALITIES) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (out.length < best.length) best = out;
    if (out.length <= sizeBudget) return out;
  }
  return best;
}

/**
 * プリセット用：元解像度の取得と 560px 圧縮を一括で行う。
 */
export async function processPresetImage(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const raw = await readAsDataURL(file);
  const img = await loadImage(raw);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const { w, h } = fitWithin(width, height, PRESET_IMAGE_MAX_DIM);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: raw, width, height };
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let best = canvas.toDataURL("image/jpeg", QUALITIES[0]);
  for (const q of QUALITIES) {
    const out = canvas.toDataURL("image/jpeg", q);
    if (out.length < best.length) best = out;
    if (out.length <= PRESET_SIZE_BUDGET) {
      return { dataUrl: out, width, height };
    }
  }
  return { dataUrl: best, width, height };
}
