<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { BrainWorld, type SaveRatio } from '../three/BrainWorld'

const emit = defineEmits<{
  select: [id: string | null]
  hover: [id: string | null]
  ready: []
  error: [message: string]
}>()

const el = ref<HTMLDivElement>()
const world = shallowRef<BrainWorld>()

onMounted(async () => {
  try {
    const w = new BrainWorld(el.value!, {
      onSelect: (id) => emit('select', id),
      onHover: (id) => emit('hover', id),
    })
    world.value = w
    await w.init()
    emit('ready')
    if (import.meta.env.DEV) (window as unknown as { __bw: BrainWorld }).__bw = w
  } catch (e) {
    console.error(e)
    emit('error', e instanceof Error ? e.message : String(e))
  }
})

onBeforeUnmount(() => world.value?.dispose())

defineExpose({
  select: (id: string | null) => world.value?.select(id),
  reset: (duration?: number) => world.value?.resetView(duration) ?? Promise.resolve(),
  capture: (ratio: SaveRatio) => {
    if (!world.value) throw new Error('Scene not ready')
    return world.value.capture(ratio)
  },
})
</script>

<template>
  <div ref="el" class="bw-stage" />
</template>
