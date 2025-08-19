<template>
  <q-page class="tournament-detail-page">
    <!-- Hero Section -->
    <div class="hero-section" :style="heroStyle">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <q-badge color="amber-7" text-color="black" class="tournament-badge">
          Torneo
        </q-badge>
        <h1 class="tournament-title">{{ tournament.name }}</h1>
        <div class="tournament-status">
          <q-icon :name="statusIcon" size="sm" />
          <span>{{ statusText }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Prize Pool Section -->
      <q-card class="prize-card">
        <q-card-section>
          <div class="prize-header">
            <h2 class="section-title">Bolsa de Premios</h2>
            <div class="prize-total">
              <span class="amount">{{ formatCurrency(tournament.prize_pool) }}</span>
              <span class="currency">USDT</span>
            </div>
          </div>
          
          <div class="prize-progress">
            <q-linear-progress
              :value="progressPercentage / 100"
              size="20px"
              color="amber-7"
              class="q-mt-md"
            >
              <div class="absolute-full flex flex-center">
                <q-badge color="white" text-color="amber-7">
                  {{ progressPercentage }}%
                </q-badge>
              </div>
            </q-linear-progress>
            
            <div class="progress-details">
              <div class="progress-item">
                <span class="label">Recaudado:</span>
                <span class="value">{{ formatCurrency(tournament.current_amount) }} USDT</span>
              </div>
              <div class="progress-item" v-if="tournament.max_amount">
                <span class="label">Objetivo:</span>
                <span class="value">{{ formatCurrency(tournament.max_amount) }} USDT</span>
              </div>
            </div>
          </div>
          
          <div class="prize-distribution">
            <h3 class="section-subtitle">Distribución de Premios</h3>
            <div class="distribution-grid">
              <div 
                v-for="(prize, index) in prizeDistribution" 
                :key="index" 
                class="prize-tier"
                :class="{ 'highlight-tier': index < 3 }"
              >
                <div class="tier-position">
                  <q-icon v-if="index === 0" name="military_tech" color="gold" />
                  <q-icon v-else-if="index === 1" name="military_tech" color="silver" />
                  <q-icon v-else-if="index === 2" name="military_tech" color="bronze" />
                  <span v-else>{{ index + 1 }}º</span>
                </div>
                <div class="tier-percent">{{ prize.percentage }}%</div>
                <div class="tier-amount">{{ formatCurrency(prize.amount) }} USDT</div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Tournament Info Section -->
      <q-card class="info-card">
        <q-card-section>
          <h2 class="section-title">Información del Torneo</h2>
          
          <div class="info-grid">
            <div class="info-item">
              <q-icon name="people" size="sm" />
              <div class="info-content">
                <div class="info-label">Participantes</div>
                <div class="info-value">
                  {{ tournament.current_users }}/{{ tournament.max_users || '∞' }}
                </div>
              </div>
            </div>
            
            <div class="info-item">
              <q-icon name="payments" size="sm" />
              <div class="info-content">
                <div class="info-label">Costo de entrada</div>
                <div class="info-value">
                  {{ formatCurrency(tournament.entry_fee) }} USDT
                </div>
              </div>
            </div>
            
            <div class="info-item">
              <q-icon name="calendar_today" size="sm" />
              <div class="info-content">
                <div class="info-label">Fecha de inicio</div>
                <div class="info-value">
                  {{ formatDate(tournament.start_date) || 'Por definir' }}
                </div>
              </div>
            </div>
            
            <div class="info-item">
              <q-icon name="timer" size="sm" />
              <div class="info-content">
                <div class="info-label">Duración</div>
                <div class="info-value">
                  {{ tournament.duration }} minutos
                </div>
              </div>
            </div>
          </div>
          
          <div class="countdown-section" v-if="tournament.start_date && !isTournamentEnded">
            <h3 class="section-subtitle">Tiempo restante</h3>
            <countdown 
              :target="tournament.end_date" 
              color="amber-7" 
              class="custom-countdown"
            />
          </div>
          
          <div class="action-buttons">
            <q-btn
              v-if="!isRegistered && !hasPendingPayment"
              color="amber-7"
              text-color="black"
              unelevated
              label="Unirme al Torneo"
              :loading="loading"
              @click="joinTournament"
              class="action-btn glow"
            />
            
            <q-btn
              v-else-if="hasPendingPayment"
              color="orange"
              unelevated
              label="Pago Pendiente"
              icon="pending"
              class="action-btn"
              disable
            />
            
            <q-btn
              v-else
              color="positive"
              unelevated
              label="Ya estás registrado"
              icon="check_circle"
              class="action-btn"
              disable
            />
            
            <q-btn
              outline
              color="grey-7"
              label="Jugar Gratis"
              @click="playFree"
              class="action-btn"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Leaderboard Section -->
      <q-card class="leaderboard-card">
        <q-card-section>
          <div class="section-header">
            <h2 class="section-title">Leaderboard</h2>
            <q-badge color="green-6" text-color="black">
              Tiempo real
            </q-badge>
          </div>
          
          <q-table
            :rows="leaderboard"
            :columns="leaderboardColumns"
            row-key="user_id"
            :pagination="{ rowsPerPage: 10 }"
            class="leaderboard-table"
            flat
            bordered
          >
            <template v-slot:body-cell-position="props">
              <q-td :props="props">
                <div class="position-badge" :class="getPositionClass(props.row.position)">
                  {{ props.row.position }}
                </div>
              </q-td>
            </template>
            
            <template v-slot:body-cell-user="props">
              <q-td :props="props">
                <div class="user-cell">
                  <q-avatar size="sm" color="primary" text-color="white">
                    {{ props.row.user_name.charAt(0).toUpperCase() }}
                  </q-avatar>
                  <span class="user-name">{{ props.row.user_name }}</span>
                </div>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Payment Dialog -->
      <q-dialog v-model="paymentDialog" persistent>
        <q-card style="min-width: 500px">
          <q-card-section>
            <div class="text-h6">Unirse al Torneo</div>
            <div class="text-subtitle2">
              Costo: {{ formatCurrency(tournament.entry_fee) }} USDT
            </div>
          </q-card-section>

          <q-stepper v-model="paymentStep" vertical color="amber-7">
            <!-- Step 1: Wallet Verification -->
            <q-step :name="1" title="Verificar Wallet" icon="account_balance_wallet">
              <div v-if="userWallet">
                <q-banner class="bg-positive text-white q-mb-md">
                  <template v-slot:avatar>
                    <q-icon name="check_circle" />
                  </template>
                  Tu wallet USDT (TRC20) está configurada correctamente
                </q-banner>
                
                <q-input
                  v-model="userWallet"
                  label="Tu dirección USDT (TRC20)"
                  readonly
                  outlined
                  class="q-mb-md"
                >
                  <template v-slot:append>
                    <q-btn 
                      flat 
                      round 
                      icon="content_copy" 
                      @click="copyToClipboard(userWallet)"
                    />
                  </template>
                </q-input>
              </div>
              
              <div v-else>
                <q-banner class="bg-orange text-white q-mb-md">
                  <template v-slot:avatar>
                    <q-icon name="warning" />
                  </template>
                  Necesitas configurar una wallet USDT (TRC20) para participar
                </q-banner>
                
                <q-input
                  v-model="tempWallet"
                  label="Ingresa tu dirección USDT (TRC20)"
                  outlined
                  :rules="[
                    val => !!val || 'Campo requerido',
                    val => val.startsWith('T') && val.length === 34 || 'Dirección TRC20 inválida'
                  ]"
                  class="q-mb-md"
                />
                
                <q-btn
                  color="amber-7"
                  text-color="black"
                  label="Guardar Wallet"
                  @click="saveWallet"
                  :loading="savingWallet"
                  class="full-width"
                />
              </div>
              
              <q-stepper-navigation>
                <q-btn 
                  color="amber-7" 
                  text-color="black" 
                  label="Continuar" 
                  @click="paymentStep = 2" 
                  :disable="!userWallet"
                  class="q-mt-md"
                />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 2: Payment Instructions -->
            <q-step :name="2" title="Realizar Pago" icon="payment">
              <q-banner class="bg-blue text-white q-mb-md">
                <template v-slot:avatar>
                  <q-icon name="info" />
                </template>
                Envía exactamente {{ formatCurrency(tournament.entry_fee) }} USDT a la siguiente dirección
              </q-banner>
              
              <q-input
                v-model="tournamentWallet"
                label="Dirección del torneo"
                readonly
                outlined
                class="q-mb-md"
              >
                <template v-slot:append>
                  <q-btn 
                    flat 
                    round 
                    icon="content_copy" 
                    @click="copyToClipboard(tournamentWallet)"
                  />
                </template>
              </q-input>
              
              <q-banner class="bg-orange text-white q-mb-md">
                <template v-slot:avatar>
                  <q-icon name="warning" />
                </template>
                Asegúrate de enviar desde tu wallet registrada: {{ userWallet }}
              </q-banner>
              
              <q-stepper-navigation>
                <q-btn 
                  color="amber-7" 
                  text-color="black" 
                  label="Ya realicé el pago" 
                  @click="paymentStep = 3" 
                  class="q-mt-md"
                />
                <q-btn 
                  flat 
                  label="Atrás" 
                  @click="paymentStep = 1" 
                  class="q-ml-sm"
                />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 3: Transaction Confirmation -->
            <q-step :name="3" title="Confirmar Transacción" icon="receipt">
              <q-banner class="bg-blue text-white q-mb-md">
                <template v-slot:avatar>
                  <q-icon name="info" />
                </template>
                Ingresa el hash de transacción para verificar tu pago
              </q-banner>
              
              <q-input
                v-model="txHash"
                label="Hash de transacción"
                outlined
                :rules="[
                  val => !!val || 'Campo requerido',
                  val => /^[a-fA-F0-9]{64}$/.test(val) || 'Hash inválido'
                ]"
                class="q-mb-md"
              />
              
              <q-stepper-navigation>
                <q-btn 
                  color="amber-7" 
                  text-color="black" 
                  label="Confirmar Pago" 
                  @click="confirmPayment" 
                  :loading="confirmingPayment"
                  class="q-mt-md"
                />
                <q-btn 
                  flat 
                  label="Atrás" 
                  @click="paymentStep = 2" 
                  class="q-ml-sm"
                />
              </q-stepper-navigation>
            </q-step>
          </q-stepper>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'
import { useAuthStore } from 'stores/auth'
import Countdown from 'src/components/TournamentCountdown.vue'

export default {
  components: { Countdown },
  
  setup() {
    const $q = useQuasar()
    const route = useRoute()
    const authStore = useAuthStore()
    
    // Data
    const tournament = ref({
      name: '',
      description: '',
      entry_fee: 10,
      prize_pool: 0,
      current_amount: 0,
      max_amount: 0,
      current_users: 0,
      max_users: 0,
      start_date: null,
      end_date: null,
      status: 'open'
    })
    
    const leaderboard = ref([])
    const isRegistered = ref(false)
    const hasPendingPayment = ref(false)
    const loading = ref(false)
    const userWallet = ref('')
    
    // Payment
    const paymentDialog = ref(false)
    const paymentStep = ref(1)
    const tempWallet = ref('')
    const savingWallet = ref(false)
    const tournamentWallet = ref('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE')
    const txHash = ref('')
    const confirmingPayment = ref(false)
    
    // Columns
    const leaderboardColumns = [
      { name: 'position', label: '#', field: 'position', align: 'center' },
      { name: 'user', label: 'Usuario', field: 'user_name' },
      { name: 'score', label: 'Puntuación', field: 'score', align: 'center' },
      { name: 'prize', label: 'Premio', field: 'prize', align: 'right', format: val => val ? `${val} USDT` : '-' }
    ]
    
    // Computed
    const heroStyle = computed(() => ({
      backgroundImage: `url(${tournament.value.image_url || '/images/tournament-bg.jpg'})`
    }))
    
    const statusText = computed(() => {
      switch (tournament.value.status) {
        case 'open': return 'Inscripciones abiertas'
        case 'closed': return isTournamentEnded.value ? 'Torneo finalizado' : 'En progreso'
        case 'completed': return 'Torneo completado'
        default: return 'Estado desconocido'
      }
    })
    
    const statusIcon = computed(() => {
      switch (tournament.value.status) {
        case 'open': return 'lock_open'
        case 'closed': return isTournamentEnded.value ? 'flag' : 'timer'
        case 'completed': return 'check_circle'
        default: return 'help'
      }
    })
    
    const isTournamentEnded = computed(() => {
      if (!tournament.value.end_date) return false
      return new Date(tournament.value.end_date) < new Date()
    })
    
    const progressPercentage = computed(() => {
      if (tournament.value.max_amount) {
        return Math.min(100, Math.round((tournament.value.current_amount / tournament.value.max_amount) * 100))
      }
      return 0
    })
    
    const prizeDistribution = computed(() => {
      const distribution = [
        { position: 1, percentage: 35 },
        { position: 2, percentage: 20 },
        { position: 3, percentage: 15 },
        { position: 4, percentage: 10 },
        { position: 5, percentage: 7 },
        { position: '6-10', percentage: 2 }
      ]
      
      return distribution.map(item => ({
        ...item,
        amount: (tournament.value.prize_pool * item.percentage) / 100
      }))
    })
    
    // Methods
    const loadTournament = async () => {
      loading.value = true
      try {
        const [tournamentRes, leaderboardRes, registrationRes, paymentRes] = await Promise.all([
          api.get(`/tournaments/${route.params.id}`),
          api.get(`/tournaments/${route.params.id}/leaderboard`),
          api.get(`/tournaments/${route.params.id}/is-registered`),
          api.get(`/payments?tournament_id=${route.params.id}&status=pending`)
        ])
        
        tournament.value = tournamentRes.data
        leaderboard.value = leaderboardRes.data
        isRegistered.value = registrationRes.data.is_registered
        hasPendingPayment.value = paymentRes.data.length > 0
        
        if (authStore.user) {
          userWallet.value = authStore.user.wallet_usdt
        }
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error cargando torneo',
          caption: error.response?.data?.message || error.message
        })
      } finally {
        loading.value = false
      }
    }
    
    const joinTournament = () => {
      paymentDialog.value = true
      paymentStep.value = userWallet.value ? 2 : 1
    }
    
    const saveWallet = async () => {
      if (!tempWallet.value.startsWith('T') || tempWallet.value.length !== 34) {
        $q.notify({
          type: 'negative',
          message: 'Dirección USDT (TRC20) inválida',
          timeout: 2000
        })
        return
      }
      
      savingWallet.value = true
      try {
        await authStore.updateWallet(tempWallet.value)
        userWallet.value = tempWallet.value
        tempWallet.value = ''
        paymentStep.value = 2
        $q.notify({
          type: 'positive',
          message: 'Wallet guardada correctamente',
          timeout: 1000
        })
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error guardando wallet',
          caption: error.response?.data?.message || error.message
        })
      } finally {
        savingWallet.value = false
      }
    }
    
    const confirmPayment = async () => {
      if (!txHash.value || !/^[a-fA-F0-9]{64}$/.test(txHash.value)) {
        $q.notify({
          type: 'negative',
          message: 'Hash de transacción inválido',
          timeout: 2000
        })
        return
      }
      
      confirmingPayment.value = true
      try {
        await api.post(`/tournaments/${route.params.id}/join`, {
          tx_hash: txHash.value
        })
        
        $q.notify({
          type: 'positive',
          message: 'Pago registrado correctamente',
          caption: 'Tu participación será verificada pronto',
          timeout: 3000
        })
        
        paymentDialog.value = false
        await loadTournament()
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error registrando pago',
          caption: error.response?.data?.message || error.message
        })
      } finally {
        confirmingPayment.value = false
      }
    }
    
    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text)
      $q.notify({
        type: 'positive',
        message: 'Copiado al portapapeles',
        timeout: 1000
      })
    }
    
    const playFree = () => {
      $q.notify({
        type: 'info',
        message: 'Modo juego gratuito activado',
        timeout: 1000
      })
    }
    
    const formatCurrency = (amount) => {
      return Number(amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return null
      return new Date(dateString).toLocaleString()
    }
    
    const getPositionClass = (position) => {
      if (position === 1) return 'position-gold'
      if (position === 2) return 'position-silver'
      if (position === 3) return 'position-bronze'
      return ''
    }
    
    // Lifecycle
    onMounted(loadTournament)
    
    return {
      // Data
      tournament,
      leaderboard,
      isRegistered,
      hasPendingPayment,
      loading,
      userWallet,
      
      // Payment
      paymentDialog,
      paymentStep,
      tempWallet,
      savingWallet,
      tournamentWallet,
      txHash,
      confirmingPayment,
      
      // Columns
      leaderboardColumns,
      
      // Computed
      heroStyle,
      statusText,
      statusIcon,
      isTournamentEnded,
      progressPercentage,
      prizeDistribution,
      
      // Methods
      joinTournament,
      saveWallet,
      confirmPayment,
      copyToClipboard,
      playFree,
      formatCurrency,
      formatDate,
      getPositionClass
    }
  }
}
</script>

<style scoped>
.tournament-detail-page {
  background: #f5f5f5;
}

.hero-section {
  position: relative;
  height: 300px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.2));
}

.hero-content {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 30px;
  color: white;
}

.tournament-badge {
  font-size: 0.8rem;
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.tournament-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.tournament-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  font-size: 0.9rem;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 992px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }
}

.prize-card,
.info-card,
.leaderboard-card {
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.prize-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.prize-total {
  text-align: right;
}

.prize-total .amount {
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffb400;
}

.prize-total .currency {
  font-size: 1rem;
  color: #666;
}

.prize-progress {
  margin-bottom: 20px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9rem;
}

.progress-item .label {
  color: #666;
}

.progress-item .value {
  font-weight: 600;
}

.prize-distribution {
  margin-top: 30px;
}

.section-subtitle {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.prize-tier {
  padding: 10px;
  border-radius: 8px;
  background: #f0f0f0;
  text-align: center;
}

.highlight-tier {
  background: #fff8e1;
  border: 1px solid #ffd54f;
}

.tier-position {
  font-weight: 700;
  margin-bottom: 5px;
}

.tier-percent {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffb400;
}

.tier-amount {
  font-size: 0.9rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 0.8rem;
  color: #666;
}

.info-value {
  font-weight: 600;
}

.countdown-section {
  margin: 20px 0;
}

.custom-countdown {
  font-size: 1.2rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.action-btn {
  flex: 1;
}

.leaderboard-table {
  margin-top: 20px;
}

.position-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e0e0;
  font-weight: 600;
}

.position-gold {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: black;
}

.position-silver {
  background: linear-gradient(135deg, #C0C0C0, #A0A0A0);
  color: black;
}

.position-bronze {
  background: linear-gradient(135deg, #CD7F32, #A0522D);
  color: white;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-name {
  font-weight: 500;
}

.glow {
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
  transition: all 0.3s ease;
}

.glow:hover {
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.7);
}
</style>