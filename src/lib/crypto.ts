/**
 * WebCrypto を用いた API キー等の暗号化。
 *
 * 設計:
 *   - AES-GCM 256bit キーを「非抽出 (non-extractable)」で生成し、IndexedDB に直接保存する。
 *     構造化クローンでCryptoKeyは保存可。non-extractable のまま復元されるため、
 *     ブラウザの外に出る・DevToolsから生データとして吸い上げられることはない。
 *   - 暗号化対象 (APIキー) は AES-GCM で ciphertext + IV として IndexedDB に保存。
 *   - 個人利用・個人端末前提のため、パスフレーズ入力なしでも透過的に動作。
 *     完璧な安全ではなく「同一ブラウザ内で動くスクリプト以外からは読めない」レベル。
 */

const DB_NAME = 'meshi-track'
const STORE = 'settings'
const KEY_RECORD_ID = 'cryptoKey'

interface StoredCryptoKey {
  id: 'cryptoKey'
  key: CryptoKey
}

/** IndexedDB を直接開く。lib/db.ts と同じDBに settings ストアを共有。 */
async function openSettingsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadOrCreateKey(): Promise<CryptoKey> {
  const db = await openSettingsDb()
  // 既存キー読み出し
  const existing = await new Promise<StoredCryptoKey | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(KEY_RECORD_ID)
    req.onsuccess = () => resolve(req.result as StoredCryptoKey | undefined)
    req.onerror = () => reject(req.error)
  })
  if (existing?.key) return existing.key

  // 新規作成 (non-extractable, encrypt/decrypt用途)
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  )
  // 保存
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ id: KEY_RECORD_ID, key } satisfies StoredCryptoKey)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return key
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const arr = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr as Uint8Array<ArrayBuffer>
}

export interface EncryptedPayload {
  /** AES-GCM IV (base64) */
  iv: string
  /** AES-GCM ciphertext (base64) */
  ct: string
}

export async function encryptString(plaintext: string): Promise<EncryptedPayload> {
  const key = await loadOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  )
  return { iv: toBase64(iv), ct: toBase64(ciphertext) }
}

export async function decryptString(payload: EncryptedPayload): Promise<string> {
  const key = await loadOrCreateKey()
  const iv = fromBase64(payload.iv)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromBase64(payload.ct),
  )
  return decoder.decode(plaintext)
}

/** base64エンコードされた "iv.ct" 形式の単一文字列表現。IndexedDBへの保存用。 */
export function packCipher(p: EncryptedPayload): string {
  return `${p.iv}.${p.ct}`
}
export function unpackCipher(s: string): EncryptedPayload {
  const [iv, ct] = s.split('.')
  if (!iv || !ct) throw new Error('invalid cipher format')
  return { iv, ct }
}
