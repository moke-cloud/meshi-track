import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onCancel: () => void
}

export function BarcodeScanner({ onDetected, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('このブラウザはカメラAPIに対応していません')
          return
        }
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ])
        const reader = new BrowserMultiFormatReader(hints)
        readerRef.current = reader

        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        // 背面カメラを優先
        const deviceId =
          devices.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
          devices[0]?.deviceId

        if (!deviceId) {
          setError('カメラデバイスが見つかりません')
          return
        }
        if (cancelled) return

        const videoEl = videoRef.current
        if (!videoEl) return

        const controls = await reader.decodeFromVideoDevice(deviceId, videoEl, (result, err) => {
          if (result && !cancelled) {
            controls?.stop()
            onDetected(result.getText())
          }
          // err は no-result が多いので握りつぶし
          void err
        })
        controlsRef.current = controls
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'カメラ起動失敗')
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
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-red-500 shadow-lg" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3">
          {error}
        </div>
      )}

      <div className="text-xs text-slate-500 text-center">
        バーコードを中央の線に合わせてください
      </div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{8,14}"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
          placeholder="手入力 (JAN 13桁)"
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
