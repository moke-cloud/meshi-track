import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onCancel: () => void
}

type CameraState =
  | { kind: 'initializing' }
  | { kind: 'running' }
  | { kind: 'error'; message: string; hint?: string }

/**
 * ZXing の BarcodeScanner.
 *
 * 重要な仕様:
 * - `enumerateDevices()` は getUserMedia 許可前だと label が空になる。
 *   そのため label 文字列で背面カメラを判定しようとすると失敗する。
 * - 代わりに `decodeFromConstraints({video: {facingMode: 'environment'}}, ...)` を使うと、
 *   ブラウザが自動で背面カメラ (無ければ前面) を選び、権限ダイアログも自動表示される。
 * - getUserMedia はセキュアコンテキスト (https) でのみ動作。
 *   GitHub Pages は https なので本番は問題なし。ローカル開発は localhost 経由。
 */
export function BarcodeScanner({ onDetected, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [state, setState] = useState<CameraState>({ kind: 'initializing' })
  const [manual, setManual] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!window.isSecureContext) {
        setState({
          kind: 'error',
          message: '安全なコンテキスト (HTTPS) が必要です',
          hint: 'localhost か https:// でアクセスしてください。',
        })
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({
          kind: 'error',
          message: 'このブラウザはカメラAPIに対応していません',
          hint: 'iOS Safari / Android Chrome / Edge / Chrome 最新版でお試しください。',
        })
        return
      }

      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.ITF,
      ])
      const reader = new BrowserMultiFormatReader(hints)

      // 優先順位: (1) 背面カメラ (2) 任意のカメラ
      const constraintCandidates: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        { video: true, audio: false },
      ]

      let lastError: unknown = null
      for (const constraints of constraintCandidates) {
        try {
          const videoEl = videoRef.current
          if (!videoEl) return
          const controls = await reader.decodeFromConstraints(
            constraints,
            videoEl,
            (result, err) => {
              if (cancelled) return
              if (result) {
                controlsRef.current?.stop()
                onDetected(result.getText())
                return
              }
              // err はフレームごとに no-result 相当の例外が来るので握りつぶし
              void err
            },
          )
          if (cancelled) {
            controls.stop()
            return
          }
          controlsRef.current = controls
          setState({ kind: 'running' })
          return
        } catch (err) {
          lastError = err
          continue
        }
      }

      // 全候補失敗: 原因を推測してメッセージ化
      const name = (lastError as { name?: string } | null)?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setState({
          kind: 'error',
          message: 'カメラのアクセスが許可されませんでした',
          hint: 'ブラウザの設定 > このサイト > カメラ を「許可」に切り替えて再読み込みしてください。',
        })
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setState({
          kind: 'error',
          message: 'カメラデバイスが見つかりません',
          hint: 'PCに内蔵/外付けカメラが無い場合は、下の「手入力」欄にJANコードを直接入力してください。',
        })
      } else {
        setState({
          kind: 'error',
          message: 'カメラ起動に失敗しました',
          hint: lastError instanceof Error ? lastError.message : '手入力をご利用ください。',
        })
      }
    }

    void start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onDetected])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{8,14}$/.test(manual)) return
    controlsRef.current?.stop()
    onDetected(manual)
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        {state.kind === 'running' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-red-500 shadow-lg" />
          </div>
        )}
        {state.kind === 'initializing' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            📷 カメラ起動中...
          </div>
        )}
      </div>

      {state.kind === 'error' && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm p-3 space-y-1">
          <div className="font-semibold">⚠ {state.message}</div>
          {state.hint && <div className="text-xs">{state.hint}</div>}
        </div>
      )}

      {state.kind === 'running' && (
        <div className="text-xs text-slate-500 text-center">
          バーコードを中央の赤線に合わせてください
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{8,14}"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
          placeholder="JAN手入力 (8〜14桁)"
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={manual.length < 8}
          className="px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm disabled:opacity-50"
        >
          検索
        </button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm"
      >
        キャンセル
      </button>
    </div>
  )
}
