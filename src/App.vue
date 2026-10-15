<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
import BrainWorldCanvas from './components/BrainWorldCanvas.vue'
import InfoCard from './components/InfoCard.vue'
import LoadingVeil from './components/LoadingVeil.vue'
import MinimalHeader from './components/MinimalHeader.vue'
import SaveControls from './components/SaveControls.vue'
import { brainWorldData } from './data/brainWorldData'
import type { SaveRatio } from './three/BrainWorld'

const world = ref<InstanceType<typeof BrainWorldCanvas>>()
const ready = ref(false)
const error = ref<string | null>(null)
const selected = ref<string | null>(null)
const ratio = ref<SaveRatio>('4:5')
const busy = ref(false)
const capturing = ref(false)
const flash = ref<HTMLDivElement>()
const toast = ref<string | null>(null)
let toastTimer = 0

function select(id: string | null) {
  world.value?.select(id)
}

function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = null), 2600)
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

async function save() {
  if (busy.value || !ready.value || !world.value) return
  busy.value = true
  capturing.value = true
  try {
    world.value.select(null)
    await world.value.reset(0.9)
    await gsap.to(flash.value!, { opacity: 1, duration: 0.14, ease: 'power2.out' })
    const blob = await world.value.capture(ratio.value)
    gsap.to(flash.value!, { opacity: 0, duration: 0.7, ease: 'power2.inOut' })
    const name = `brain-world-${ratio.value.replace(':', 'x')}.png`
    download(blob, name)
    showToast(`Saved — ${name}`)
  } catch (e) {
    console.error(e)
    gsap.to(flash.value!, { opacity: 0, duration: 0.3 })
    showToast('保存に失敗しました')
  } finally {
    capturing.value = false
    busy.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement) return
  if (e.key === 'Escape') select(null)
  if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
    select(null)
    world.value?.reset()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <main :class="{ capturing }">
    <BrainWorldCanvas ref="world" @select="selected = $event" @ready="ready = true" @error="error = $event" />
    <MinimalHeader />
    <InfoCard :id="selected" @close="select(null)" @select="select" />
    <SaveControls
      v-model:ratio="ratio"
      :busy="busy"
      @save="save"
      @reset="
        () => {
          select(null)
          world?.reset()
        }
      "
    />

    <!-- keyboard / screen-reader access to every element of the world -->
    <nav class="sr-only" aria-label="BRAIN WORLD の要素">
      <ul>
        <li v-for="a in brainWorldData" :key="a.id">
          <button type="button" @click="select(a.id)">{{ a.label }}（{{ a.en }}）</button>
          <ul>
            <template v-for="i in a.items" :key="i.id">
              <li><button type="button" @click="select(i.id)">{{ i.label }}</button></li>
              <li v-for="c in i.children ?? []" :key="c.id"><button type="button" @click="select(c.id)">{{ c.label }}</button></li>
            </template>
          </ul>
        </li>
      </ul>
    </nav>

    <div ref="flash" class="flash" aria-hidden="true" />
    <Transition name="toast">
      <p v-if="toast" class="toast glass" role="status">{{ toast }}</p>
    </Transition>
    <LoadingVeil :done="ready" :error="error" />
  </main>
</template>

<style scoped>
.flash {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(ellipse at center, rgba(255, 250, 235, 0.96), rgba(230, 215, 255, 0.92) 60%, rgba(20, 16, 40, 0.95));
}
.toast {
  position: fixed;
  left: 50%;
  top: calc(26px + var(--safe-t));
  transform: translateX(-50%);
  margin: 0;
  padding: 10px 18px;
  border-radius: 99px;
  font-size: 12.5px;
  letter-spacing: 0.04em;
  z-index: 30;
  white-space: nowrap;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
