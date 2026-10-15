<template>
  <header class="header ui">
    <h1 class="title">BRAIN WORLD</h1>
    <p class="sub">A miniature world inside my mind.</p>
    <p class="hint" aria-hidden="true">
      <span>Drag</span><i>/</i><span>Zoom</span><i>/</i><span>Click</span>
    </p>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: calc(26px + var(--safe-t));
  left: calc(30px + var(--safe-l));
  pointer-events: none;
  user-select: none;
  z-index: 5;
}
.title {
  margin: 0;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.34em;
  line-height: 1;
  text-shadow: 0 0 22px rgba(190, 150, 255, 0.55);
}
.sub {
  margin: 10px 0 0;
  font-weight: 300;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}
.hint {
  margin: 14px 0 0;
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.hint i {
  font-style: normal;
  opacity: 0.5;
}
.hint::before {
  content: '';
  width: 18px;
  height: 1px;
  background: var(--gold);
  opacity: 0.8;
  margin-right: 3px;
}
@media (max-width: 640px) {
  .header {
    top: calc(18px + var(--safe-t));
    left: calc(18px + var(--safe-l));
  }
  .title {
    font-size: 18px;
  }
  .sub {
    font-size: 11.5px;
    margin-top: 8px;
  }
  .hint {
    margin-top: 10px;
  }
}
</style>
