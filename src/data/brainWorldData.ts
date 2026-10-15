// BRAIN WORLD のコンテンツ定義。
// 文言や色を変えたいときは、基本的にこのファイルだけを編集すればOK。

export type NodeType = 'area' | 'item' | 'subitem'

export interface WorldNode {
  id: string
  label: string
  type: NodeType
  /** カード下部に出る一言説明 */
  description: string
  url?: string
  children?: WorldNode[]
}

export interface AreaData extends WorldNode {
  type: 'area'
  /** 英語の小見出し（ラベル・カード用） */
  en: string
  /** メインカラー */
  color: string
  /** サブカラー（グラデーションや差し色） */
  accent: string
  items: WorldNode[]
}

export const brainWorldData: AreaData[] = [
  {
    id: 'music',
    label: '音楽',
    en: 'MUSIC',
    type: 'area',
    color: '#ff6fd8',
    accent: '#9b6bff',
    description: '音楽エリア。好きなアーティストのステージが並ぶ、小さなライブ会場。',
    items: [
      {
        id: 'super_beaver',
        label: 'SUPER BEAVER',
        type: 'item',
        description: '音楽カテゴリ。好きなアーティスト。ライトに照らされたメインステージとして表現。',
      },
      {
        id: 'tuki',
        label: 'tuki.',
        type: 'item',
        description: '音楽カテゴリ。好きなアーティスト。名前にちなんで、月が浮かぶ小さなステージに。',
      },
      {
        id: 'aespa',
        label: 'aespa',
        type: 'item',
        description: '音楽カテゴリ。好きなアーティスト。近未来的な世界観を、ホログラムのステージで表現。',
      },
    ],
  },
  {
    id: 'programming',
    label: 'プログラミング',
    en: 'PROGRAMMING',
    type: 'area',
    color: '#58b6ff',
    accent: '#3ff2ff',
    description: 'プログラミングエリア。回路の道でつながった、ミニチュアの開発都市。',
    items: [
      {
        id: 'webs',
        label: 'WebS',
        type: 'item',
        description: 'プログラミングカテゴリ。Web系の取り組み（Webサービス開発）。電波を飛ばすサーバー塔の拠点。',
      },
      {
        id: 'webd',
        label: 'WebD',
        type: 'item',
        description: 'プログラミングカテゴリ。Webデザイン / 開発。大きなモニターとUIパーツが浮かぶ拠点。',
      },
      {
        id: 'iphone',
        label: 'iPhone',
        type: 'item',
        description: 'プログラミングカテゴリ。スマホアプリ開発（iOS）。',
      },
      {
        id: 'android',
        label: 'Android',
        type: 'item',
        description: 'プログラミングカテゴリ。スマホアプリ開発（Android）。',
      },
    ],
  },
  {
    id: 'sports',
    label: 'スポーツ',
    en: 'SPORTS',
    type: 'area',
    color: '#ff9a57',
    accent: '#ff5a5a',
    description: 'スポーツエリア。コート、雪山、グラウンドが集まるアクティブなフィールド。',
    items: [
      {
        id: 'basketball',
        label: 'バスケ',
        type: 'item',
        description: 'スポーツカテゴリ。バスケ。小さなコートで、ボールがゴールへ弧を描く。',
      },
      {
        id: 'snowboard',
        label: 'スノボ',
        type: 'item',
        description: 'スポーツカテゴリ。スノボ。雪の舞う斜面をすべり降りる。',
      },
      {
        id: 'baseball',
        label: '野球',
        type: 'item',
        description: 'スポーツカテゴリ。野球。ナイター照明に照らされたグラウンド。',
      },
    ],
  },
  {
    id: 'hobby',
    label: '趣味',
    en: 'HOBBY',
    type: 'area',
    color: '#7de1b0',
    accent: '#c98a52',
    description: '趣味エリア。サウナ小屋・水風呂・ととのいスペースのある、静かな場所。',
    items: [
      {
        id: 'sauna',
        label: 'サウナ',
        type: 'item',
        description: '趣味カテゴリ。サウナ。サウナ → 水風呂 → 外気浴で、ととのう。',
      },
    ],
  },
  {
    id: 'anime',
    label: 'アニメ',
    en: 'ANIME',
    type: 'area',
    color: '#af8cff',
    accent: '#ff7a3d',
    description: 'アニメエリア。忍の世界を思わせる、高台の和風の隠れ里。',
    items: [
      {
        id: 'naruto',
        label: 'NARUTO',
        type: 'item',
        description: 'アニメカテゴリ。NARUTO。門、巻物、渦巻きのシンボル、舞う木の葉で忍の世界を表現。',
      },
    ],
  },
  {
    id: 'making',
    label: '好きなこと',
    en: 'FAVORITE',
    type: 'area',
    color: '#ffd86a',
    accent: '#fff4c9',
    description: '好きなことエリア。箱庭の中心にある、ものづくりの工房。',
    items: [
      {
        id: 'monozukuri',
        label: 'ものづくり',
        type: 'item',
        description: '好きなことカテゴリ。ものづくり。アイデアが灯る、この世界の中心。',
        children: [
          {
            id: 'term60',
            label: '前期60',
            type: 'subitem',
            description: 'ものづくりカテゴリ。成果・到達点を示す要素。60個のブロックを積み上げたタワー。',
          },
          {
            id: 'qr',
            label: 'QR',
            type: 'subitem',
            description: '外部作品リンク。ゲートの先は作品「weekly-works-tower」へ。',
            url: 'https://gil0304.github.io/weekly-works-tower/',
          },
        ],
      },
    ],
  },
]

export interface NodeEntry {
  node: WorldNode
  area: AreaData
  /** subitem の場合の親 item */
  parent?: WorldNode
}

/** id → ノード情報の索引 */
export const nodeIndex: Map<string, NodeEntry> = (() => {
  const map = new Map<string, NodeEntry>()
  for (const area of brainWorldData) {
    map.set(area.id, { node: area, area })
    for (const item of area.items) {
      map.set(item.id, { node: item, area })
      for (const child of item.children ?? []) {
        map.set(child.id, { node: child, area, parent: item })
      }
    }
  }
  return map
})()

export const getArea = (id: string): AreaData => {
  const area = brainWorldData.find((a) => a.id === id)
  if (!area) throw new Error(`Unknown area: ${id}`)
  return area
}
