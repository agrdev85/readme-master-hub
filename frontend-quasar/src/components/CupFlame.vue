<template>
  <div class="cup-container">
    <div class="cup">
      <div class="flame" :style="{ height: `${percentage}%` }"></div>
    </div>
    <div class="cup-info">
      <div class="title">{{ title }}</div>
      <div class="amount">{{ amount }} USDT</div>
      <div v-if="target" class="target">Objetivo: {{ target }} USDT</div>
      <div class="participants" v-if="participants !== null">
        {{ participants }}/{{ maxParticipants || '∞' }} jugadores
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    size: { type: Number, default: 200 },
    percentage: { type: Number, default: 50 },
    title: { type: String, default: 'Bolsa del Torneo' },
    amount: { type: Number, default: 0 },
    target: { type: Number, default: null },
    participants: { type: Number, default: null },
    maxParticipants: { type: Number, default: null },
    sharePercent: { type: Number, default: 50 }
  }
}
</script>

<style scoped>
.cup-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.cup {
  width: v-bind(size + 'px');
  height: v-bind(size + 'px');
  background: linear-gradient(to right, #3a3a3a, #1a1a1a);
  border-radius: 0 0 50% 50%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.3);
}

.flame {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: linear-gradient(to top, #ff9a00, #ff5e00);
  transition: height 0.5s ease;
}

.cup-info {
  text-align: center;
  margin-top: 15px;
}

.title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #fff;
}

.amount {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffb400;
  margin: 5px 0;
}

.target {
  font-size: 0.9rem;
  color: #aaa;
}

.participants {
  font-size: 0.9rem;
  color: #ccc;
  margin-top: 5px;
}
</style>