<template>
  <q-page class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="game-chip">Cufire Infinity Battle</div>
        <h1 class="hero-title">Compite. Escala. Gana.</h1>
        <p class="hero-subtitle">
          Juega gratis para subir en la tabla o únete al torneo por 10 USDT y participa de la repartición del premio.
        </p>
        <div class="hero-actions">
          <q-btn 
            color="amber-7" 
            text-color="black" 
            unelevated 
            class="action-btn glow" 
            label="Ver torneos activos" 
            @click="scrollToTournaments" 
          />
          <q-btn 
            outline 
            color="grey-4" 
            class="action-btn" 
            label="Leaderboard global" 
            @click="scrollToLeaderboard" 
          />
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <div class="main-container q-pa-md">
      <!-- Loading State -->
      <q-inner-loading :showing="loading" label="Cargando datos..." label-class="text-amber" />

      <!-- Tournaments Section -->
      <q-card id="tournaments" class="custom-card">
        <q-card-section>
          <div class="section-header">
            <div class="text-h6">Torneos activos</div>
            <q-badge color="purple-5" v-if="hasActiveTournaments">Disponibles</q-badge>
            <q-badge color="grey-6" v-else>No hay torneos activos</q-badge>
          </div>

          <div v-if="errorTournaments" class="error-message">
            <q-icon name="error" color="negative" size="sm" />
            {{ errorTournaments }}
          </div>

          <div class="tournaments-grid">
            <q-card
              v-for="tournament in activeTournaments"
              :key="tournament.id"
              class="tournament-card glow-hover"
              @click="viewTournament(tournament.id)"
            >
              <q-card-section>
                <div class="tournament-header">
                  <div class="tournament-name">{{ tournament.name }}</div>
                  <q-badge 
                    :color="getTournamentStatusColor(tournament)" 
                    class="status-badge"
                  >
                    {{ getTournamentStatusText(tournament) }}
                  </q-badge>
                </div>
                
                <div class="tournament-stats">
                  <div class="stat-item">
                    <div class="stat-label">Bolsa</div>
                    <div class="stat-value">
                      {{ formatCurrency(tournament.prize_pool) }}
                      <span class="stat-unit">/{{ tournament.max_amount ? formatCurrency(tournament.max_amount) : '∞' }}</span> USDT
                    </div>
                  </div>
                  
                  <div class="stat-item">
                    <div class="stat-label">Jugadores</div>
                    <div class="stat-value">
                      {{ tournament.current_users || 0 }}
                      <span class="stat-unit">/{{ tournament.max_users || '∞' }}</span>
                    </div>
                  </div>
                </div>

                <div class="progress-viz">
                  <money-pyramid 
                    :progress="calculateProgress(tournament)" 
                    :current-amount="tournament.prize_pool"
                    :max-amount="tournament.max_amount"
                    :current-players="tournament.current_users"
                    :max-players="tournament.max_users"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </q-card-section>
      </q-card>

      <!-- Leaderboard Section -->
      <q-card id="leaderboard" class="custom-card">
        <q-card-section>
          <div class="section-header">
            <div class="text-h6">Leaderboard Global</div>
            <q-badge color="green-6" text-color="black">Tiempo real</q-badge>
          </div>
          
          <div v-if="errorScores" class="error-message">
            <q-icon name="error" color="negative" size="sm" />
            {{ errorScores }}
          </div>

          <q-table
            :rows="processedScores"
            :columns="scoreColumns"
            row-key="rank"
            :pagination="{ rowsPerPage: 10 }"
            class="leaderboard-table"
            flat
            bordered
            :loading="loading"
          >
            <template v-slot:body-cell-rank="props">
              <q-td :props="props">
                <div class="rank-badge" :class="getRankClass(props.row.rank)">
                  {{ props.row.rank }}
                </div>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from 'boot/axios'
import { Notify } from 'quasar'
import MoneyPyramid from 'components/MoneyPyramid.vue'

const router = useRouter()
const tournaments = ref([])
const globalScores = ref('')
const loading = ref(false)
const errorTournaments = ref(null)
const errorScores = ref(null)
const abortController = ref(new AbortController())
const pollInterval = ref(null)

// Configuración de Notify
Notify.setDefaults({
  position: 'top-right',
  timeout: 5000,
  textColor: 'white'
})

// Columnas para la tabla de puntuaciones
const scoreColumns = [
  { name: 'rank', label: '#', field: 'rank', align: 'center', sortable: true },
  { name: 'username', label: 'Usuario', field: 'username', sortable: true },
  { name: 'score', label: 'Puntuación', field: 'score', sortable: true }
]

// Procesar los scores para la tabla
const processedScores = computed(() => {
  if (!globalScores.value) return []
  
  try {
    // Parsear el string de scores (formato: "username1|Puntos100;username2|Puntos200")
    const scoresArray = globalScores.value.split(';')
    return scoresArray.map((scoreStr, index) => {
      const [usernamePart, pointsPart] = scoreStr.split('|')
      const username = usernamePart.replace('username', '')
      const score = pointsPart.replace('Puntos', '')
      
      return {
        rank: index + 1,
        username: username,
        score: parseInt(score)
      }
    })
  } catch (error) {
    console.error('Error processing scores:', error)
    return []
  }
})

// Computed
const activeTournaments = computed(() => {
  return tournaments.value.filter(t => 
    t.status === 'open' || (t.status === 'closed' && !isTournamentEnded(t))
  )
})

const hasActiveTournaments = computed(() => activeTournaments.value.length > 0)

// Métodos
const showNotification = (message, caption, type = 'negative') => {
  Notify.create({
    type,
    message,
    caption,
    actions: [{ icon: 'close', color: 'white' }]
  })
}

const fetchTournaments = async () => {
  try {
    loading.value = true
    errorTournaments.value = null
    const response = await api.get('/tournaments?status=active', {
      signal: abortController.value.signal,
      timeout: 30000
    })
    
    tournaments.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    if (error.name !== 'CanceledError') {
      console.error('Error fetching tournaments:', error)
      errorTournaments.value = error.userMessage || 'Error al cargar torneos'
      showNotification(errorTournaments.value, error.message)
    }
  } finally {
    loading.value = false
  }
}

const fetchGlobalScores = async () => {
  try {
    errorScores.value = null
    const response = await api.get('/api/scores/global', {
      signal: abortController.value.signal,
      timeout: 30000,
      responseType: 'text' // Importante para manejar la respuesta como texto
    })
    
    // Guardamos el string directamente para procesarlo en computed
    globalScores.value = response.data
  } catch (error) {
    if (error.name !== 'CanceledError') {
      console.error('Error fetching global scores:', error)
      errorScores.value = error.userMessage || 'Error al cargar puntuaciones'
      showNotification(errorScores.value, error.message)
    }
  }
}

const calculateProgress = (tournament) => {
  if (tournament.max_amount) {
    return Math.min(100, (tournament.prize_pool / tournament.max_amount) * 100)
  }
  if (tournament.max_users) {
    return Math.min(100, (tournament.current_users / tournament.max_users) * 100)
  }
  return 0
}

const isTournamentEnded = (tournament) => {
  if (!tournament.end_date) return false
  return new Date(tournament.end_date) < new Date()
}

const getTournamentStatusColor = (tournament) => {
  if (isTournamentEnded(tournament)) return 'grey-6'
  if (tournament.status === 'closed') return 'orange'
  return 'purple-5'
}

const getTournamentStatusText = (tournament) => {
  if (isTournamentEnded(tournament)) return 'Terminado'
  if (tournament.status === 'closed') return 'En curso'
  return 'Abierto'
}

const formatCurrency = (amount) => {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const getRankClass = (rank) => {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

const viewTournament = (id) => {
  router.push(`/tournaments/${id}`)
}

const scrollToTournaments = () => {
  const element = document.getElementById('tournaments')
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const scrollToLeaderboard = () => {
  const element = document.getElementById('leaderboard')
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

// Lifecycle Hooks
onMounted(() => {
  // Configurar limpieza primero
  onBeforeUnmount(() => {
    if (pollInterval.value) clearInterval(pollInterval.value)
    abortController.value.abort()
  })

  // Función de inicialización
  const initialize = async () => {
    try {
      await Promise.all([fetchTournaments(), fetchGlobalScores()])
      
      // Configurar polling con manejo de errores
      pollInterval.value = setInterval(async () => {
        try {
          await Promise.all([fetchTournaments(), fetchGlobalScores()])
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 30000)
      
    } catch (error) {
      console.error('Initialization error:', error)
      showNotification('Error inicializando la página', error.message)
    }
  }

  initialize()
})
</script>

<style scoped>
/* Tus estilos existentes se mantienen igual */
.home-page {
  min-height: 100vh;
  background: 
    radial-gradient(80% 60% at 50% 0%, rgba(133, 26, 255, 0.18), rgba(0, 0, 0, 0.8)),
    url('~assets/background.jpg') center/cover no-repeat fixed;
  color: white;
}

.hero-section {
  position: relative;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('~assets/hero-bg.jpg') center/cover no-repeat;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 60% at 50% 50%, rgba(140, 0, 250, 0.35), rgba(0, 0, 0, 0.8));
  backdrop-filter: blur(2px);
}

.hero-content {
  position: relative;
  text-align: center;
  padding: 24px;
  max-width: 900px;
  z-index: 1;
}

.game-chip {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-weight: 600;
  letter-spacing: 0.4px;
  margin-bottom: 16px;
}

.hero-title {
  font-size: clamp(28px, 6vw, 54px);
  margin: 0.4rem 0;
  font-weight: 900;
  text-transform: uppercase;
  text-shadow: 0 3px 18px rgba(120, 0, 255, 0.35);
}

.hero-subtitle {
  opacity: 0.9;
  max-width: 700px;
  margin: 0 auto;
  font-size: 1.1rem;
}

.hero-actions {
  margin-top: 24px;
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 24px;
  font-weight: 600;
}

.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.custom-card {
  background: rgba(14, 12, 22, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.tournaments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.tournament-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: rgba(30, 30, 30, 0.7);
  border-radius: 12px;
  overflow: hidden;
}

.tournament-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.tournament-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tournament-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.status-badge {
  font-weight: 600;
  padding: 4px 8px;
}

.tournament-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;
}

.stat-label {
  font-size: 0.8rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
}

.stat-unit {
  opacity: 0.7;
  margin-left: 4px;
  font-weight: 600;
  font-size: 0.9rem;
}

.progress-viz {
  margin: 16px 0;
}

.leaderboard-table {
  background: transparent;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #333;
  color: white;
  font-weight: 600;
}

.rank-gold {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: black;
}

.rank-silver {
  background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
  color: black;
}

.rank-bronze {
  background: linear-gradient(135deg, #CD7F32, #A0522D);
  color: white;
}

.glow {
  box-shadow: 0 0 0 rgba(255, 193, 7, 0.5);
  transition: box-shadow 0.25s, transform 0.25s;
}

.glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(255, 193, 7, 0.35);
}

.glow-hover:hover {
  box-shadow: 0 5px 15px rgba(255, 193, 7, 0.3);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff6b6b;
  margin-bottom: 16px;
  padding: 8px;
  background: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
}
</style>