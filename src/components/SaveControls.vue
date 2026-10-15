<script setup lang="ts">
import type { SaveRatio } from '../three/BrainWorld'

defineProps<{ ratio: SaveRatio; busy: boolean }>()
const emit = defineEmits<{ 'update:ratio': [r: SaveRatio]; save: []; reset: [] }>()
const ratios: SaveRatio[] = ['1:1', '4:5', '16:9']
</script>

<template>
  <div class="controls ui">
    <button class="reset glass" type="button" title="全体表示に戻す (R)" aria-label="全体表示に戻す" @click="emit('reset')">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div class="save glass">
      <div class="ratios" role="radiogroup" aria-label="保存比率">
        <button
          v-for="r in ratios"
          :key="r"
          type="button"
          role="radio"
          :aria-checked="r === ratio"
          :class="{ on: r === ratio }"
          @click="emit('update:ratio', r)"
        >
          <span class="frame" :data-r="r" aria-hidden="true" />{{ r }}
        </button>
      </div>
      <button class="go" type="button" :disabled="busy" @click="emit('save')">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ busy ? 'Saving…' : 'Save PNG' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.controls {
  position: fixed;
  right: calc(24px + var(--safe-r));
  bottom: calc(24px + var(--safe-b));
  display: flex;
  gap: 10px;
  align-items: center;
  z-index: 6;
}
.reset {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--ink-soft);
  transition: color 0.2s, transform 0.3s;
}
.reset:hover {
  color: #fff;
  transform: rotate(-30deg);
}
.save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  border-radius: 99px;
}
.ratios {
  display: flex;
  gap: 2px;
}
.ratios button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 11px;
  border: 0;
  border-radius: 99px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.ratios button:hover {
  color: #fff;
}
.ratios button.on {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.frame {
  display: inline-block;
  border: 1.4px solid currentColor;
  border-radius: 2px;
  opacity: 0.85;
}
.frame[data-r='1:1'] {
  width: 10px;
  height: 10px;
}
.frame[data-r='4:5'] {
  width: 9px;
  height: 11px;
}
.frame[data-r='16:9'] {
  width: 13px;
  height: 8px;
}
.go {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px 0 13px;
  border: 0;
  border-radius: 99px;
  background: linear-gradient(135deg, #ffe08a, #ffc65a);
  color: #1d1504;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 0 0 22px rgba(255, 216, 106, 0.35);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.go:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 0 30px rgba(255, 216, 106, 0.55);
}
.go:disabled {
  opacity: 0.6;
  cursor: progress;
}
@media (max-width: 640px) {
  .controls {
    left: calc(14px + var(--safe-l));
    right: calc(14px + var(--safe-r));
    bottom: calc(16px + var(--safe-b));
    justify-content: space-between;
  }
  .ratios button {
    padding: 0 8px;
  }
  .go {
    padding: 0 13px 0 11px;
  }
}
</style>
