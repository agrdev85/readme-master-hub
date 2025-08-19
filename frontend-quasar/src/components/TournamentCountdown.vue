<template>
  <div class="countdown-container">
    <div v-if="targetDate" class="countdown">
      <div class="countdown-item">
        <span class="countdown-value">{{ days }}</span>
        <span class="countdown-label">Días</span>
      </div>
      <div class="countdown-separator">:</div>
      <div class="countdown-item">
        <span class="countdown-value">{{ hours }}</span>
        <span class="countdown-label">Horas</span>
      </div>
      <div class="countdown-separator">:</div>
      <div class="countdown-item">
        <span class="countdown-value">{{ minutes }}</span>
        <span class="countdown-label">Min</span>
      </div>
      <div class="countdown-separator">:</div>
      <div class="countdown-item">
        <span class="countdown-value">{{ seconds }}</span>
        <span class="countdown-label">Seg</span>
      </div>
    </div>
    <div v-else class="countdown-ended">
      <q-icon name="timer_off" size="sm" />
      <span>Torneo finalizado</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

export default {
  name: 'TournamentCountdown',
  props: {
    target: {
      type: [Date, String, Number],
      required: true
    },
    color: {
      type: String,
      default: 'primary'
    }
  },

  setup(props) {
    const now = ref(new Date())
    let interval

    const targetDate = computed(() => {
      if (!props.target) return null
      return new Date(props.target)
    })

    const timeLeft = computed(() => {
      if (!targetDate.value) return 0
      return targetDate.value - now.value
    })

    const isEnded = computed(() => {
      return timeLeft.value <= 0
    })

    const days = computed(() => {
      return isEnded.value ? '00' : Math.floor(timeLeft.value / (1000 * 60 * 60 * 24)).toString().padStart(2, '0')
    })

    const hours = computed(() => {
      return isEnded.value ? '00' : Math.floor((timeLeft.value % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0')
    })

    const minutes = computed(() => {
      return isEnded.value ? '00' : Math.floor((timeLeft.value % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0')
    })

    const seconds = computed(() => {
      return isEnded.value ? '00' : Math.floor((timeLeft.value % (1000 * 60)) / 1000).toString().padStart(2, '0')
    })

    onMounted(() => {
      interval = setInterval(() => {
        now.value = new Date()
      }, 1000)
    })

    onBeforeUnmount(() => {
      clearInterval(interval)
    })

    return {
      days,
      hours,
      minutes,
      seconds,
      targetDate,
      isEnded
    }
  }
}
</script>

<style scoped>
.countdown-container {
  font-family: 'Rajdhani', sans-serif;
}

.countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.countdown-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: v-bind(color);
  line-height: 1;
}

.countdown-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}

.countdown-separator {
  font-size: 1.2rem;
  font-weight: bold;
  padding-bottom: 8px;
  color: v-bind(color);
}

.countdown-ended {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ff5555;
  font-size: 0.9rem;
}
</style>