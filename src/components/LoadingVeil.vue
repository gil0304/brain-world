<script setup lang="ts">
defineProps<{ done: boolean; error?: string | null }>()
</script>

<template>
  <Transition name="veil">
    <div v-if="!done || error" class="veil" role="status" aria-live="polite">
      <div class="pulse" aria-hidden="true">
        <span v-for="i in 3" :key="i" :style="{ animationDelay: `${(i - 1) * 0.5}s` }" />
      </div>
      <p v-if="!error" class="msg">Opening the mind…</p>
      <p v-else class="msg err">
        3D表示を開始できませんでした。<br />
        <small>WebGL に対応したブラウザでお試しください。（{{ error }}）</small>
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.veil {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 22px;
  background: radial-gradient(ellipse at center, #0c0a24 0%, #04050d 70%);
}
.pulse {
  position: relative;
  width: 64px;
  height: 64px;
}
.pulse span {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--violet);
  animation: ring 1.5s cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
  opacity: 0;
}
.pulse::after {
  content: '';
  position: absolute;
  inset: 26px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 18px var(--gold);
}
@keyframes ring {
  0% {
    transform: scale(0.3);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}
.msg {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--ink-soft);
  text-align: center;
  line-height: 1.8;
}
.msg.err {
  font-family: var(--font-jp);
  letter-spacing: 0.06em;
  text-transform: none;
  font-size: 14px;
}
.veil-leave-active {
  transition: opacity 1.1s ease;
}
.veil-leave-to {
  opacity: 0;
}
</style>
