<template>
  <div class="pyramid-container">
    <div class="title">{{ title }}</div>
    <div class="pyramid">
      <div 
        v-for="(row, index) in computedRows" 
        :key="index" 
        class="row"
        :style="{ width: `${100 - (index * 10)}%` }"
      >
        <div 
          v-for="(coin, coinIndex) in row.coins" 
          :key="coinIndex" 
          class="coin"
          :class="{ 'active': coin.active }"
        ></div>
      </div>
    </div>
    <div class="stats">
      <div v-if="currentAmount !== null" class="stat">
        <span class="value">{{ currentAmount }} USDT</span>
        <span class="label">Recaudado</span>
      </div>
      <div v-if="maxAmount !== null" class="stat">
        <span class="value">{{ maxAmount }} USDT</span>
        <span class="label">Objetivo</span>
      </div>
      <div v-if="currentPlayers !== null" class="stat">
        <span class="value">{{ currentPlayers }}</span>
        <span class="label">Jugadores</span>
      </div>
      <div v-if="maxPlayers !== null" class="stat">
        <span class="value">{{ maxPlayers }}</span>
        <span class="label">Cupo</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    progress: { type: Number, default: 50 },
    rows: { type: Number, default: 5 },
    title: { type: String, default: 'Progreso' },
    currentAmount: { type: Number, default: null },
    maxAmount: { type: Number, default: null },
    currentPlayers: { type: Number, default: null },
    maxPlayers: { type: Number, default: null }
  },
  computed: {
    computedRows() {
      const rows = []
      const activeCoins = Math.floor((this.progress / 100) * this.rows * (this.rows + 1) / 2)
      
      let coinsActivated = 0
      for (let i = 0; i < this.rows; i++) {
        const coinsInRow = this.rows - i
        const row = {
          coins: []
        }
        
        for (let j = 0; j < coinsInRow; j++) {
          const isActive = coinsActivated < activeCoins
          if (isActive) coinsActivated++
          row.coins.push({ active: isActive })
        }
        
        rows.push(row)
      }
      
      return rows
    }
  }
}
</script>

<style scoped>
.pyramid-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px 0;
}

.title {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10px;
}

.pyramid {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.row {
  display: flex;
  justify-content: center;
  margin-bottom: 5px;
}

.coin {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #333;
  margin: 0 3px;
  transition: all 0.3s ease;
}

.coin.active {
  background: linear-gradient(135deg, #ffd700, #ffb400);
  box-shadow: 0 0 10px rgba(255, 180, 0, 0.5);
}

.stats {
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin-top: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.value {
  font-weight: bold;
  color: #ffb400;
}

.label {
  font-size: 0.8rem;
  color: #aaa;
}
</style>