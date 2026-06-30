// Import / Export アイコン / IOButtons
// 文字を排した2つのアイコンのみで完結（赤紫=Export下向き, 緑=Import上向き）
import { useRef } from 'react'
import { FiDownload, FiUpload } from 'react-icons/fi'
import { motion } from 'motion/react'
import { usePrompt } from '@/context/PromptContext'
import { normalizeImportedState } from '@/lib/tree'

export function IOButtons() {
  const { exportState, replaceState } = usePrompt()
  const fileRef = useRef<HTMLInputElement>(null)

  const onExport = () => {
    const data = exportState()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comfy-prompt-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const onImportClick = () => fileRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイル再選択可
    if (!file) return
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return
    }
    // マージ確認付き（ここでは置換前の簡易確認ダイアログ）
    const ok = window.confirm(
      '読み込んだ JSON で現在のツリーを置き換えますか？\n（現在の内容は上書きされます）',
    )
    if (!ok) return
    // 正規化を経て置換
    replaceState(normalizeImportedState(parsed))
  }

  return (
    <div className="flex items-center gap-1.5">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onImportClick}
        title="読み込み (Import)"
        className="group p-1.5 rounded-sm border border-eva-line hover:border-eva-green text-eva-green-soft hover:text-eva-green hover:shadow-glow-green transition-all"
      >
        <FiUpload size={15} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onExport}
        title="書き出し (Export)"
        className="group p-1.5 rounded-sm border border-eva-line hover:border-eva-magenta text-eva-magenta/80 hover:text-eva-magenta transition-all"
        style={{ boxShadow: 'none' }}
      >
        <FiDownload size={15} />
      </motion.button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="hidden"
      />
    </div>
  )
}
