export const PLAYER_COUNT = 10
export const TOTAL_TURNS = 50
export const MAX_HEAL_COUNT = 3
export const GP_REGEN = 4
export const GP_HEAL = 50
export const GP_MAX = 100
export const GP_ALERT = 35

export type CellState = 'defend' | 'follow'
export type CellStatus = Record<string, CellState>

export type Cell = {
  status: CellState | null
  value: number | '追'
  alert: boolean
  healExhausted: boolean
}

export const key = (player: number, turn: number) => `${player}_${turn}`

export function rotateStatus(): CellStatus {
  const s: CellStatus = {}
  for (let t = 1; t <= TOTAL_TURNS; t++) {
    s[key(((t - 1) % PLAYER_COUNT) + 1, t)] = 'defend'
  }
  return s
}

export function calculateGrid(status: CellStatus): Cell[][] {
  const gp: number[] = Array(PLAYER_COUNT + 1).fill(GP_MAX)
  const healUsed: number[] = Array(PLAYER_COUNT + 1).fill(0)
  const grid: Cell[][] = Array.from({ length: PLAYER_COUNT + 1 }, () => [])

  for (let t = 1; t <= TOTAL_TURNS; t++) {
    for (let p = 1; p <= PLAYER_COUNT; p++) {
      const s = status[key(p, t)] ?? null
      if (s === 'defend') {
        const base = gp[p]
        const exhausted = healUsed[p] >= MAX_HEAL_COUNT
        grid[p][t] = {
          status: 'defend',
          value: Math.min(GP_MAX, base + GP_REGEN),
          alert: base < GP_ALERT,
          healExhausted: exhausted,
        }
        if (exhausted) {
          gp[p] = 0
        } else {
          healUsed[p]++
          gp[p] = GP_HEAL
        }
      } else if (s === 'follow') {
        gp[p] = Math.min(GP_MAX, gp[p] + GP_REGEN)
        grid[p][t] = { status: 'follow', value: '追', alert: false, healExhausted: false }
      } else {
        gp[p] = Math.min(GP_MAX, gp[p] + GP_REGEN)
        grid[p][t] = { status: null, value: gp[p], alert: false, healExhausted: false }
      }
    }
  }
  return grid
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

// 守備の出たターン順に並べ、同じ番号が再登場した時点で次の周に切り替える
export function buildRounds(status: CellStatus): number[][] {
  const rounds: number[][] = []
  let cur: number[] = []
  for (let t = 1; t <= TOTAL_TURNS; t++) {
    for (let p = 1; p <= PLAYER_COUNT; p++) {
      if (status[key(p, t)] !== 'defend') continue
      if (cur.includes(p)) {
        rounds.push(cur)
        cur = []
      }
      cur.push(p)
    }
  }
  if (cur.length) rounds.push(cur)
  return rounds
}

export const roundsToText = (rounds: number[][]) =>
  rounds.map((r, i) => `${i + 1}周目${r.map((p) => CIRCLED[p - 1]).join('')}`).join('\n')

// 進行順(周ごとの番号列)を1ターンずつ守備として並べたパターンに変換する
export function statusFromRounds(rounds: number[][]): CellStatus {
  const s: CellStatus = {}
  let t = 1
  for (const r of rounds) {
    for (const p of r) {
      if (t > TOTAL_TURNS) return s
      s[key(p, t++)] = 'defend'
    }
  }
  return s
}
