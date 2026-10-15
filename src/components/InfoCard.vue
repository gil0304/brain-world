<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { nodeIndex, type WorldNode } from '../data/brainWorldData'

const props = defineProps<{ id: string | null }>()
const emit = defineEmits<{ close: []; select: [id: string] }>()

const entry = computed(() => (props.id ? nodeIndex.get(props.id) ?? null : null))

const crumbs = computed(() => {
  const e = entry.value
  if (!e) return ''
  if (e.node.type === 'area') return `${e.area.en}`
  if (e.parent) return `${e.area.label} › ${e.parent.label}`
  return `${e.area.label}`
})

const typeLabel = computed(() => {
  const t = entry.value?.node.type
  return t === 'area' ? 'AREA' : t === 'subitem' ? 'DETAIL' : 'ITEM'
})

/** related nodes shown as chips */
const related = computed<WorldNode[]>(() => {
  const e = entry.value
  if (!e) return []
  if (e.node.type === 'area') return e.area.items.flatMap((i) => [i, ...(i.children ?? [])])
  if (e.node.children?.length) return e.node.children
  if (e.parent) return [e.parent, ...(e.parent.children ?? []).filter((c) => c.id !== e.node.id)]
  return e.area.items.filter((i) => i.id !== e.node.id)
})

const qr = ref<string | null>(null)
watch(
  () => entry.value?.node.url,
  async (url) => {
    qr.value = url ? await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0b0a14', light: '#ffffff' } }) : null
  },
  { immediate: true },
)

const prettyUrl = (u: string) => u.replace(/^https?:\/\//, '').replace(/\/$/, '')
</script>

<template>
  <Transition name="card">
    <section
      v-if="entry"
      :key="entry.node.id"
      class="card glass ui"
      :style="{ '--accent': entry.area.color, '--accent2': entry.area.accent }"
      role="dialog"
      aria-live="polite"
      :aria-label="entry.node.label"
    >
      <button class="close" type="button" aria-label="閉じる" @click="emit('close')">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
      </button>
      <p class="meta">
        <span class="dot" />
        <span class="crumbs">{{ crumbs }}</span>
        <span class="type">{{ typeLabel }}</span>
      </p>
      <h2 class="name">{{ entry.node.label }}</h2>
      <p class="desc">{{ entry.node.description }}</p>

      <div v-if="entry.node.url" class="link">
        <img v-if="qr" :src="qr" alt="作品ページのQRコード" width="96" height="96" />
        <div class="link-body">
          <span class="url">{{ prettyUrl(entry.node.url) }}</span>
          <a class="open" :href="entry.node.url" target="_blank" rel="noopener">
            作品を開く
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </a>
        </div>
      </div>

      <div v-if="related.length" class="chips">
        <button v-for="n in related" :key="n.id" type="button" class="chip" @click="emit('select', n.id)">
          {{ n.label }}
        </button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.card {
  position: fixed;
  left: 50%;
  bottom: calc(26px + var(--safe-b));
  transform: translateX(-50%);
  width: min(400px, calc(100vw - 32px));
  padding: 18px 20px 18px;
  border-radius: 20px;
  z-index: 10;
  background: linear-gradient(160deg, rgba(22, 18, 48, 0.82), rgba(10, 9, 26, 0.74));
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}
.card::before {
  content: '';
  position: absolute;
  inset: 0 18px auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.9;
}
.close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  color: var(--ink-soft);
  transition: background 0.2s;
}
.close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--ink-soft);
  font-family: var(--font-jp);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}
.type {
  margin-left: 2px;
  padding: 2px 7px;
  border-radius: 99px;
  font-family: var(--font-latin);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
}
.name {
  margin: 10px 0 6px;
  font-family: var(--font-latin);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
  padding-right: 28px;
}
.desc {
  margin: 0;
  font-family: var(--font-jp);
  font-size: 13.5px;
  line-height: 1.75;
  color: rgba(240, 236, 255, 0.86);
}
.link {
  margin-top: 14px;
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.link img {
  border-radius: 8px;
  display: block;
  flex: none;
}
.link-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.url {
  font-size: 12px;
  color: var(--ink-soft);
  word-break: break-all;
}
.open {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 99px;
  background: var(--accent);
  color: #1a1306;
  font-family: var(--font-jp);
  font-weight: 700;
  font-size: 12.5px;
  text-decoration: none;
  box-shadow: 0 0 20px color-mix(in srgb, var(--accent) 50%, transparent);
  transition: transform 0.2s;
}
.open:hover {
  transform: translateY(-1px);
}
.chips {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 5px 11px;
  border-radius: 99px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  background: rgba(255, 255, 255, 0.04);
  font-family: var(--font-jp);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.chip:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: var(--accent);
}

.card-enter-active,
.card-leave-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translate(-50%, 14px);
}

@media (max-width: 640px) {
  .card {
    bottom: calc(84px + var(--safe-b));
    padding: 16px 16px 15px;
  }
  .name {
    font-size: 22px;
  }
  .desc {
    font-size: 13px;
  }
}
</style>
