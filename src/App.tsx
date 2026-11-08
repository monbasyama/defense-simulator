import { useState } from 'react'
import './App.css'

type Unit = { name: string; hp: number; atk: number; def: number }

const initial = (): Unit[] => [
  { name: '守備モンスター1', hp: 1000, atk: 200, def: 100 },
  { name: '守備モンスター2', hp: 1000, atk: 200, def: 100 },
  { name: '守備モンスター3', hp: 1000, atk: 200, def: 100 },
]

const dmg = (atk: number, def: number) => Math.max(1, atk - def)

function simulate(defenders: Unit[], attackers: Unit[]): string[] {
  const d = defenders.map((u) => ({ ...u }))
  const a = attackers.map((u) => ({ ...u }))
  const log: string[] = []
  for (let turn = 1; turn <= 50; turn++) {
    if (!d.some((u) => u.hp > 0) || !a.some((u) => u.hp > 0)) break
    log.push(`--- ターン${turn} ---`)
    for (const [src, dst] of [[a, d], [d, a]] as const) {
      for (const u of src) {
        if (u.hp <= 0) continue
        const t = dst.find((x) => x.hp > 0)
        if (!t) break
        const n = dmg(u.atk, t.def)
        t.hp -= n
        log.push(`${u.name} → ${t.name} に${n}ダメージ (残HP ${Math.max(0, t.hp)})`)
      }
    }
  }
  log.push(d.some((u) => u.hp > 0) ? '結果: 守備成功' : '結果: 守備失敗')
  return log
}

function Editor({ title, units, onChange }: { title: string; units: Unit[]; onChange: (u: Unit[]) => void }) {
  const set = (i: number, k: keyof Unit, v: string) =>
    onChange(units.map((u, j) => (j === i ? { ...u, [k]: k === 'name' ? v : Number(v) } : u)))
  return (
    <section>
      <h2>{title}</h2>
      {units.map((u, i) => (
        <div key={i} className="row">
          <input value={u.name} onChange={(e) => set(i, 'name', e.target.value)} />
          {(['hp', 'atk', 'def'] as const).map((k) => (
            <label key={k}>
              {k.toUpperCase()}
              <input type="number" value={u[k]} onChange={(e) => set(i, k, e.target.value)} />
            </label>
          ))}
        </div>
      ))}
    </section>
  )
}

export default function App() {
  const [defenders, setDefenders] = useState(initial)
  const [attackers, setAttackers] = useState(() =>
    initial().map((u, i) => ({ ...u, name: `攻撃モンスター${i + 1}` })),
  )
  const [log, setLog] = useState<string[]>([])
  return (
    <main>
      <h1>ちょいと召喚モンスターバスケット 守備シミュレーター</h1>
      <Editor title="守備側" units={defenders} onChange={setDefenders} />
      <Editor title="攻撃側" units={attackers} onChange={setAttackers} />
      <button onClick={() => setLog(simulate(defenders, attackers))}>シミュレーション実行</button>
      <pre>{log.join('\n')}</pre>
    </main>
  )
}
