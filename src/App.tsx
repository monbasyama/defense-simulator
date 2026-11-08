import { useEffect, useState } from 'react'
import './App.css'
import {
  PLAYER_COUNT,
  TOTAL_TURNS,
  calculateGrid,
  key,
  rotateStatus,
  type CellStatus,
} from './sim'

type Pattern = { id: number; name: string; status: CellStatus }

const STORAGE_KEY = 'defense-simulator-patterns'
const circled = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

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
  onChange,
  onDuplicate,
  onDelete,
}: {
  index: number
  pattern: Pattern
  onChange: (p: Pattern) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const grid = calculateGrid(pattern.status)
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
                <td className="sticky-col">{circled[p - 1]}</td>
                {turns.map((t) => {
                  const c = grid[p][t]
                  let cls = ''
                  let title: string | undefined
                  if (c.status === 'follow') cls = 'cell-follow'
                  else if (c.status === 'defend') {
                    if (c.healExhausted) {
                      cls = 'cell-no-heal'
                      title = '回復上限(3回)消費済み'
                    } else if (c.alert) {
                      cls = 'cell-alert'
                      title = `守備前GP不足 (${c.value})`
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
    </div>
  )
}

export default function App() {
  const [patterns, setPatterns] = useState<Pattern[]>(load)

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
      </div>

      {patterns.map((p, i) => (
        <PatternCard
          key={p.id}
          index={i}
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
