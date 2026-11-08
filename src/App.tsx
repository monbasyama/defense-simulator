import { useEffect, useState } from 'react'
import './App.css'
import {
  PLAYER_COUNT,
  TOTAL_TURNS,
  buildRoundEntries,
  buildRides,
  buildRounds,
  calculateGrid,
  key,
  roundsToText,
  rotateStatus,
  statusFromRounds,
  type CellStatus,
} from './sim'

type Pattern = { id: number; name: string; status: CellStatus }

const STORAGE_KEY = 'defense-simulator-patterns'

// 丸数字フォントは字形のサイズが不揃いなため、CSSで統一サイズの丸を描く
const Badge = ({ n }: { n: number }) => <span className="badge">{n}</span>

function load(): Pattern[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Pattern[]
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch {
    /* ignore */
  }
  return [{ id: 1, name: 'パターン 1', status: rotateStatus() }]
}

function PatternCard({
  index,
  pattern,
  names,
  onChange,
  onDuplicate,
  onDelete,
}: {
  names: string[]
  index: number
  pattern: Pattern
  onChange: (p: Pattern) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const grid = calculateGrid(pattern.status)
  const rounds = buildRounds(pattern.status)
  const entries = buildRoundEntries(pattern.status)
  const rides = entries.length ? buildRides(pattern.status, entries[0]) : []
  const orderText = roundsToText(pattern.status, names)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(orderText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const turns = Array.from({ length: TOTAL_TURNS }, (_, i) => i + 1)
  const players = Array.from({ length: PLAYER_COUNT }, (_, i) => i + 1)

  // 未設定 → 守備 → 追 → 解除
  const cycle = (p: number, t: number) => {
    const k = key(p, t)
    const next = { ...pattern.status }
    const cur = next[k]
    if (!cur) next[k] = 'defend'
    else if (cur === 'defend') next[k] = 'follow'
    else delete next[k]
    onChange({ ...pattern, status: next })
  }

  return (
    <div className="pattern-card">
      <div className="pattern-header">
        <div>
          パターン {index + 1}:{' '}
          <input
            className="pattern-title-input"
            value={pattern.name}
            onChange={(e) => onChange({ ...pattern, name: e.target.value })}
          />
        </div>
        <div className="header-btns">
          <button className="btn btn-secondary small" onClick={onDuplicate}>複製</button>
          <button className="btn btn-danger small" onClick={onDelete}>削除</button>
        </div>
      </div>
      <div className="setting-panel">
        <button className="btn" onClick={() => onChange({ ...pattern, status: rotateStatus() })}>
          1〜10 ローテ自動
        </button>
        <button className="btn btn-secondary" onClick={() => onChange({ ...pattern, status: {} })}>
          選択クリア
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="sticky-col">番</th>
              {turns.map((t) => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p}>
                <td className="sticky-col"><Badge n={p} /></td>
                {turns.map((t) => {
                  const c = grid[p][t]
                  let cls = c.status === null && c.alert ? 'cell-alert' : ''
                  let title: string | undefined
                  if (c.status === 'follow') cls = 'cell-follow'
                  else if (c.status === 'defend') {
                    if (c.alert) {
                      cls = 'cell-alert'
                      title = `守備前GP不足 (${c.value})`
                    } else if (c.healExhausted) {
                      cls = 'cell-no-heal'
                      title = '回復上限(3回)消費済み'
                    } else cls = 'cell-defend'
                  }
                  return (
                    <td key={t} className={cls} title={title} onClick={() => cycle(p, t)}>
                      {c.value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="order-panel">
        <div className="order-head">
          <span>進行順</span>
          <button className="btn btn-secondary small" onClick={copy} disabled={!orderText}>
            {copied ? '✓ コピーしました' : '📋 コピー'}
          </button>
        </div>
        <div className="order-text">
          {rounds.length === 0 && '守備が未設定です'}
          {rides.length > 0 && (
            <div className="order-rides">
              <div className="order-title">・1周目の追いポカ</div>
              {rides.map((ride, k) => (
                <div key={k} className="order-ride">
                  <Badge n={ride.defender} />
                  {names[ride.defender - 1] && `(${names[ride.defender - 1]})`}に
                  <Badge n={ride.rider} />
                  {names[ride.rider - 1] && `(${names[ride.rider - 1]})`}が乗る
                </div>
              ))}
            </div>
          )}
          {rounds.map((r, i) => (
            <div key={i} className="order-row">
              <span className="order-label">・{i + 1}周目：</span>
              {r.map((p, j) => <Badge key={j} n={p} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


const NAMES_KEY = 'defense-simulator-names'

function loadNames(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(NAMES_KEY) ?? '[]')
    if (Array.isArray(parsed)) return Array.from({ length: PLAYER_COUNT }, (_, i) => String(parsed[i] ?? ''))
  } catch {
    /* ignore */
  }
  return Array(PLAYER_COUNT).fill('')
}

function NamesPanel({ names, onChange }: { names: string[]; onChange: (n: string[]) => void }) {
  return (
    <div className="builder">
      <h2>名前設定</h2>
      <div className="names-grid">
        {names.map((name, i) => (
          <label key={i} className="name-field">
            <Badge n={i + 1} />
            <input
              value={name}
              placeholder={`${i + 1}番の名前`}
              onChange={(e) => onChange(names.map((x, j) => (j === i ? e.target.value : x)))}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

function OrderBuilder({ onCreate }: { onCreate: (rounds: number[][]) => void }) {
  const [rounds, setRounds] = useState<number[][]>(() => Array.from({ length: 4 }, () => []))
  const players = Array.from({ length: PLAYER_COUNT }, (_, i) => i + 1)

  const toggle = (r: number, n: number) =>
    setRounds(
      rounds.map((row, i) =>
        i !== r ? row : row.includes(n) ? row.filter((x) => x !== n) : [...row, n],
      ),
    )
  const total = rounds.reduce((a, r) => a + r.length, 0)

  return (
    <div className="builder">
      <h2>進行順からパターンを作成</h2>
      <p className="builder-note">各周目で守備に出る番号を順番にタップしてください（もう一度タップで取り消し）。</p>
      {rounds.map((row, r) => (
        <div key={r} className="builder-row">
          <span className="order-label">{r + 1}周目</span>
          <div className="builder-picks">
            {players.map((n) => {
              const idx = row.indexOf(n)
              return (
                <button
                  key={n}
                  className={`pick ${idx >= 0 ? 'picked' : ''}`}
                  onClick={() => toggle(r, n)}
                >
                  {n}
                  {idx >= 0 && <sup>{idx + 1}</sup>}
                </button>
              )
            })}
          </div>
          <div className="builder-result">
            {row.map((n, j) => <Badge key={j} n={n} />)}
          </div>
          <button className="btn btn-secondary small" onClick={() => setRounds(rounds.map((x, i) => (i === r ? [] : x)))}>
            クリア
          </button>
        </div>
      ))}
      <div className="builder-actions">
        {rounds.length < 10 && (
          <button className="btn btn-secondary" onClick={() => setRounds([...rounds, []])}>＋ 周を追加</button>
        )}
        <button className="btn btn-add" disabled={total === 0} onClick={() => onCreate(rounds)}>
          この進行順でパターンを作成
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [patterns, setPatterns] = useState<Pattern[]>(load)
  const [names, setNames] = useState<string[]>(loadNames)

  useEffect(() => {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names))
  }, [names])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns))
  }, [patterns])

  const nextId = () => Math.max(0, ...patterns.map((p) => p.id)) + 1

  const add = (status: CellStatus = {}) =>
    setPatterns([...patterns, { id: nextId(), name: `パターン ${patterns.length + 1}`, status }])

  return (
    <div className="container">
      <h1>バトル守備進行表シミュレーター</h1>
      <div className="conditions">
        <strong>【ルール設定】</strong>
        <br />
        ・1ターン進むごとに<span className="red-text">GP+4回復</span>（上限100）
        <br />
        ・守備が出たターンの数値＝<span className="red-text">直前GP＋当ターン4</span>
        <br />
        ・守備が出た<span className="red-text">次のターンは 50 ＋ 4 ＝ 54</span> スタート（回復50適用・3回まで）
        <br />
        ・「<strong>追</strong>」はGPをリセットせず、通常回復（+4）を維持します。
        <br />
        ・タップ操作： 1回＝<strong>守備</strong> / 2回＝<strong>追</strong> / 3回＝<strong>解除</strong>
      </div>

      <div className="global-actions">
        <button className="btn btn-add" onClick={() => add()}>＋ 比較パターンを追加</button>
        <button className="btn btn-dl" onClick={() => window.print()}>📄 PDF出力</button>
      </div>

      <NamesPanel names={names} onChange={setNames} />

      <OrderBuilder
        onCreate={(r) => {
          const status = statusFromRounds(r)
          // 何も入力されていないパターンが1つだけなら、新規追加せずそこに反映する
          if (patterns.length === 1 && Object.keys(patterns[0].status).length === 0) {
            setPatterns([{ ...patterns[0], status }])
          } else add(status)
        }}
      />

      {patterns.map((p, i) => (
        <PatternCard
          key={p.id}
          index={i}
          names={names}
          pattern={p}
          onChange={(np) => setPatterns(patterns.map((x) => (x.id === p.id ? np : x)))}
          onDuplicate={() => add({ ...p.status })}
          onDelete={() => {
            if (patterns.length <= 1) return alert('最低1つのパターンが必要です。')
            if (confirm('このパターンを削除してもよろしいですか？'))
              setPatterns(patterns.filter((x) => x.id !== p.id))
          }}
        />
      ))}

      <div className="legend">
        <div className="legend-item"><div className="color-box" style={{ background: '#ffe3e3', border: '2px solid #d9534f' }} /><span>守備枠（赤字＝守備前GP+4）</span></div>
        <div className="legend-item"><div className="color-box" style={{ background: '#fd7e14', border: '2px solid #e8590c' }} /><span>「追」枠（GP消費なし・通常回復）</span></div>
        <div className="legend-item"><div className="color-box" style={{ background: '#ffec99', border: '2px solid #f0ad4e' }} /><span>守備切れリスク（守備前GP&lt;35）</span></div>
        <div className="legend-item"><div className="color-box" style={{ background: '#f8d7da', border: '2px solid #721c24' }} /><span>回復切れ枠（3回回復使い切り・次回スタート4）</span></div>
      </div>
    </div>
  )
}
