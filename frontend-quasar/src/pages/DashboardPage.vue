<template>
  <q-page class="dashboard-page">
    <div class="header">
      <div class="header-content">
        <h1 class="title">Panel de Control</h1>
        <div class="user-info">
          <q-avatar color="primary" text-color="white" size="md">
            {{ userInitials }}
          </q-avatar>
          <span class="username">{{ currentUser.name }}</span>
          <q-badge v-if="isAdmin" color="amber-7" text-color="black">
            Admin
          </q-badge>
        </div>
      </div>
    </div>

    <!-- Admin Dashboard -->
    <template v-if="isAdmin">
      <!-- Users Management -->
      <q-card class="section-card">
        <q-card-section>
          <div class="section-header">
            <h2 class="section-title">Gestión de Usuarios</h2>
            <q-btn 
              color="primary" 
              icon="add" 
              label="Nuevo Usuario" 
              @click="openUserDialog(null)" 
            />
          </div>
          
          <q-table
            :rows="users"
            :columns="userColumns"
            row-key="id"
            :loading="loading"
            :pagination="{ rowsPerPage: 10 }"
            class="admin-table"
            flat
            bordered
          >
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn 
                  flat 
                  round 
                  color="primary" 
                  icon="edit" 
                  @click="openUserDialog(props.row)"
                >
                  <q-tooltip>Editar</q-tooltip>
                </q-btn>
                <q-btn 
                  flat 
                  round 
                  color="negative" 
                  icon="delete" 
                  @click="confirmDeleteUser(props.row)"
                >
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Tournaments Management -->
      <q-card class="section-card">
        <q-card-section>
          <div class="section-header">
            <h2 class="section-title">Gestión de Torneos</h2>
            <q-btn 
              color="primary" 
              icon="add" 
              label="Nuevo Torneo" 
              @click="tournamentDialog = true" 
            />
          </div>
          
          <q-table
            :rows="tournaments"
            :columns="tournamentColumns"
            row-key="id"
            :loading="loading"
            :pagination="{ rowsPerPage: 10 }"
            class="admin-table"
            flat
            bordered
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="getStatusColor(props.row.status)">
                  {{ props.row.status }}
                </q-badge>
              </q-td>
            </template>
            
            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn 
                  v-if="props.row.status === 'closed' && !props.row.prizes_distributed"
                  flat 
                  color="amber-7" 
                  label="Distribuir Premios" 
                  @click="distributePrizes(props.row)"
                />
                <q-btn 
                  flat 
                  round 
                  color="negative" 
                  icon="delete" 
                  @click="confirmDeleteTournament(props.row)"
                >
                  <q-tooltip>Eliminar</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Payments Management -->
      <q-card class="section-card">
        <q-card-section>
          <h2 class="section-title">Gestión de Pagos</h2>
          
          <div class="filter-row">
            <q-select
              v-model="selectedTournament"
              :options="tournamentOptions"
              label="Filtrar por torneo"
              outlined
              dense
              style="min-width: 250px"
            />
            <q-select
              v-model="paymentStatus"
              :options="statusOptions"
              label="Filtrar por estado"
              outlined
              dense
              style="min-width: 200px"
            />
          </div>
          
          <q-table
            :rows="filteredPayments"
            :columns="paymentColumns"
            row-key="id"
            :loading="loading"
            :pagination="{ rowsPerPage: 10 }"
            class="admin-table"
            flat
            bordered
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-toggle
                  :model-value="props.row.status === 'confirmed'"
                  @update:model-value="togglePaymentStatus(props.row)"
                  color="positive"
                />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </template>

    <!-- User Dashboard -->
    <template v-else>
      <q-card class="section-card">
        <q-card-section>
          <h2 class="section-title">Tus Torneos</h2>
          
          <div v-if="userTournaments.length > 0" class="user-tournaments">
            <q-card 
              v-for="tournament in userTournaments" 
              :key="tournament.id" 
              class="tournament-card"
            >
              <q-card-section>
                <div class="tournament-header">
                  <h3 class="tournament-name">{{ tournament.name }}</h3>
                  <q-badge :color="getStatusColor(tournament.status)">
                    {{ tournament.status }}
                  </q-badge>
                </div>
                
                <div class="tournament-details">
                  <div class="detail-item">
                    <q-icon name="emoji_events" size="sm" />
                    <span>Bolsa: {{ formatCurrency(tournament.prize_pool) }} USDT</span>
                  </div>
                  <div class="detail-item">
                    <q-icon name="people" size="sm" />
                    <span>Participantes: {{ tournament.current_users }}/{{ tournament.max_users }}</span>
                  </div>
                  <div class="detail-item">
                    <q-icon name="schedule" size="sm" />
                    <span v-if="tournament.end_date">
                      Finaliza: {{ formatDate(tournament.end_date) }}
                    </span>
                    <span v-else>
                      Sin fecha de finalización
                    </span>
                  </div>
                </div>
                
                <div v-if="tournament.status === 'closed'" class="countdown-section">
                  <countdown :target="tournament.end_date" color="amber-7" />
                </div>
                
                <div v-if="tournament.user_position" class="user-position">
                  <q-badge color="amber-7" text-color="black">
                    Tu posición: {{ tournament.user_position }}
                  </q-badge>
                </div>
              </q-card-section>
            </q-card>
          </div>
          
          <div v-else class="no-tournaments">
            <q-icon name="emoji_events" size="xl" color="grey-5" />
            <p>No estás inscrito en ningún torneo</p>
            <q-btn 
              color="primary" 
              label="Ver Torneos Disponibles" 
              to="/" 
            />
          </div>
        </q-card-section>
      </q-card>
    </template>

    <!-- User Dialog -->
    <q-dialog v-model="userDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">
            {{ editingUser ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveUser" class="q-gutter-md">
            <q-input
              v-model="userForm.name"
              label="Nombre"
              outlined
              dense
              :rules="[val => !!val || 'Campo requerido']"
            />
            
            <q-input
              v-model="userForm.email"
              label="Email"
              type="email"
              outlined
              dense
              :rules="[
                val => !!val || 'Campo requerido',
                val => /.+@.+\..+/.test(val) || 'Email no válido'
              ]"
            />
            
            <q-input
              v-model="userForm.wallet_usdt"
              label="Wallet USDT (TRC20)"
              outlined
              dense
              :rules="[
                val => !!val || 'Campo requerido',
                val => val.startsWith('T') && val.length === 34 || 'Dirección TRC20 inválida'
              ]"
            />
            
            <q-toggle
              v-model="userForm.is_admin"
              label="Es administrador"
              :disable="currentUser.id === userForm.id"
            />
            
            <div class="dialog-actions">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn 
                type="submit" 
                color="primary" 
                :label="editingUser ? 'Actualizar' : 'Crear'" 
                :loading="savingUser"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Tournament Dialog -->
    <q-dialog v-model="tournamentDialog" persistent>
      <q-card style="min-width: 600px">
        <q-card-section>
          <div class="text-h6">
            {{ editingTournament ? 'Editar Torneo' : 'Nuevo Torneo' }}
          </div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="saveTournament" class="q-gutter-md">
            <q-input
              v-model="tournamentForm.name"
              label="Nombre del Torneo"
              outlined
              dense
              :rules="[val => !!val || 'Campo requerido']"
            />
            
            <q-input
              v-model="tournamentForm.description"
              label="Descripción"
              type="textarea"
              outlined
              dense
              autogrow
            />
            
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model.number="tournamentForm.entry_fee"
                  label="Costo de entrada (USDT)"
                  type="number"
                  outlined
                  dense
                  :rules="[val => val >= 0 || 'Debe ser positivo']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="tournamentForm.max_users"
                  label="Máx. participantes"
                  type="number"
                  outlined
                  dense
                  :rules="[val => val > 0 || 'Debe ser mayor a 0']"
                />
              </div>
            </div>
            
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="tournamentForm.start_date"
                  label="Fecha de inicio"
                  type="datetime-local"
                  outlined
                  dense
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="tournamentForm.duration"
                  label="Duración (minutos)"
                  type="number"
                  outlined
                  dense
                  :rules="[val => val > 0 || 'Debe ser mayor a 0']"
                />
              </div>
            </div>
            
            <div class="dialog-actions">
              <q-btn flat label="Cancelar" v-close-popup />
              <q-btn 
                type="submit" 
                color="primary" 
                :label="editingTournament ? 'Actualizar' : 'Crear'" 
                :loading="savingTournament"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { api } from 'boot/axios'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'
import Countdown from 'src/components/TournamentCountdown.vue'

export default {
  components: { Countdown },
  
  setup() {
    const $q = useQuasar()
    const authStore = useAuthStore()
    
  // Estados de carga
  const savingUser = ref(false)
  const savingTournament = ref(false)
    
    // Data
    const loading = ref(false)
    const users = ref([])
    const tournaments = ref([])
    const payments = ref([])
    const userTournaments = ref([])
    
    // Forms
    const userDialog = ref(false)
    const editingUser = ref(null)
    const userForm = ref({
      name: '',
      email: '',
      wallet_usdt: '',
      is_admin: false
    })
    
    const tournamentDialog = ref(false)
    const editingTournament = ref(null)
    const tournamentForm = ref({
      name: '',
      description: '',
      entry_fee: 10,
      max_users: 100,
      start_date: '',
      duration: 1440 // 24 horas
    })
    
    // Filters
    const selectedTournament = ref(null)
    const paymentStatus = ref('all')
    
    // Computed
    const currentUser = computed(() => authStore.user)
    const isAdmin = computed(() => authStore.isAdmin)
    const userInitials = computed(() => {
      if (!currentUser.value?.name) return ''
      return currentUser.value.name.split(' ').map(n => n[0]).join('').toUpperCase()
    })
    
    const tournamentOptions = computed(() => [
      { label: 'Todos los torneos', value: null },
      ...tournaments.value.map(t => ({
        label: t.name,
        value: t.id
      }))
    ])
    
    const statusOptions = computed(() => [
      { label: 'Todos', value: 'all' },
      { label: 'Confirmados', value: 'confirmed' },
      { label: 'Pendientes', value: 'pending' }
    ])
    
    const filteredPayments = computed(() => {
      let result = payments.value
      
      if (selectedTournament.value) {
        result = result.filter(p => p.tournament_id === selectedTournament.value)
      }
      
      if (paymentStatus.value !== 'all') {
        result = result.filter(p => p.status === paymentStatus.value)
      }
      
      return result
    })
    
    // Columns
    const userColumns = [
      { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
      { name: 'name', label: 'Nombre', field: 'name', sortable: true },
      { name: 'email', label: 'Email', field: 'email', sortable: true },
      { name: 'wallet_usdt', label: 'Wallet USDT', field: 'wallet_usdt' },
      { name: 'is_admin', label: 'Admin', field: 'is_admin', format: val => val ? 'Sí' : 'No' },
      { name: 'actions', label: 'Acciones', field: '', align: 'center' }
    ]
    
    const tournamentColumns = [
      { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
      { name: 'name', label: 'Nombre', field: 'name', sortable: true },
      { name: 'status', label: 'Estado', field: 'status', align: 'center' },
      { name: 'entry_fee', label: 'Entrada (USDT)', field: 'entry_fee', align: 'right' },
      { name: 'current_users', label: 'Participantes', field: row => `${row.current_users}/${row.max_users}`, align: 'center' },
      { name: 'prize_pool', label: 'Bolsa (USDT)', field: 'prize_pool', align: 'right' },
      { name: 'actions', label: 'Acciones', field: '', align: 'center' }
    ]
    
    const paymentColumns = [
      { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
      { name: 'user_name', label: 'Usuario', field: 'user_name', sortable: true },
      { name: 'tournament_name', label: 'Torneo', field: 'tournament_name', sortable: true },
      { name: 'amount', label: 'Monto (USDT)', field: 'amount', align: 'right' },
      { name: 'tx_hash', label: 'Hash TX', field: 'tx_hash' },
      { name: 'status', label: 'Confirmado', field: 'status', align: 'center' },
      { name: 'created_at', label: 'Fecha', field: 'created_at', format: val => new Date(val).toLocaleString() }
    ]
    
    // Methods
    const loadData = async () => {
      loading.value = true
      try {
        if (isAdmin.value) {
          const [usersRes, tournamentsRes, paymentsRes] = await Promise.all([
            api.get('/admin/users'),
            api.get('/tournaments'),
            api.get('/payments')
          ])
          users.value = usersRes.data
          tournaments.value = tournamentsRes.data
          payments.value = paymentsRes.data
        } else {
          const res = await api.get('/users/current-tournaments')
          userTournaments.value = res.data
        }
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error cargando datos',
          caption: error.response?.data?.message || error.message
        })
      } finally {
        loading.value = false
      }
    }
    
    const openUserDialog = (user) => {
      editingUser.value = user
      userForm.value = user 
        ? { ...user } 
        : { name: '', email: '', wallet_usdt: '', is_admin: false }
      userDialog.value = true
    }
    
    const saveUser = async () => {
      try {
        savingUser.value = true
        if (editingUser.value) {
          await api.put(`/admin/users/${editingUser.value.id}`, userForm.value)
          $q.notify({
            type: 'positive',
            message: 'Usuario actualizado'
          })
        } else {
          await api.post('/admin/users', userForm.value)
          $q.notify({
            type: 'positive',
            message: 'Usuario creado'
          })
        }
        await loadData()
        userDialog.value = false
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error guardando usuario',
          caption: error.response?.data?.message || error.message
        })
      } finally {
        savingUser.value = false
      }
    }
    
    const confirmDeleteUser = (user) => {
      $q.dialog({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de eliminar a ${user.name}?`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          loading.value = true
          await api.delete(`/admin/users/${user.id}`)
          $q.notify({
            type: 'positive',
            message: 'Usuario eliminado'
          })
          await loadData()
        } catch (error) {
          $q.notify({
            type: 'negative',
            message: 'Error eliminando usuario',
            caption: error.response?.data?.message || error.message
          })
        } finally {
          loading.value = false
        }
      })
    }
    
    const saveTournament = async () => {
      try {
        savingTournament.value = true
        if (editingTournament.value) {
          await api.put(`/tournaments/${editingTournament.value.id}`, tournamentForm.value)
          $q.notify({
            type: 'positive',
            message: 'Torneo actualizado'
          })
        } else {
          await api.post('/tournaments', tournamentForm.value)
          $q.notify({
            type: 'positive',
            message: 'Torneo creado'
          })
        }
        await loadData()
        tournamentDialog.value = false
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error guardando torneo',
          caption: error.response?.data?.message || error.message
        })
      } finally {
        savingTournament.value = false
      }
    }
    
    const confirmDeleteTournament = (tournament) => {
      $q.dialog({
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de eliminar el torneo ${tournament.name}?`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          loading.value = true
          await api.delete(`/tournaments/${tournament.id}`)
          $q.notify({
            type: 'positive',
            message: 'Torneo eliminado'
          })
          await loadData()
        } catch (error) {
          $q.notify({
            type: 'negative',
            message: 'Error eliminando torneo',
            caption: error.response?.data?.message || error.message
          })
        } finally {
          loading.value = false
        }
      })
    }
    
    const distributePrizes = async (tournament) => {
      $q.dialog({
        title: 'Distribuir premios',
        message: `¿Deseas distribuir los premios del torneo ${tournament.name}?`,
        cancel: true,
        persistent: true
      }).onOk(async () => {
        try {
          loading.value = true
          const res = await api.post(`/tournaments/${tournament.id}/distribute-prizes`)
          $q.notify({
            type: 'positive',
            message: 'Premios distribuidos',
            caption: `Total distribuido: ${res.data.total} USDT`
          })
          await loadData()
        } catch (error) {
          $q.notify({
            type: 'negative',
            message: 'Error distribuyendo premios',
            caption: error.response?.data?.message || error.message
          })
        } finally {
          loading.value = false
        }
      })
    }
    
    const togglePaymentStatus = async (payment) => {
      const newStatus = payment.status === 'confirmed' ? 'pending' : 'confirmed'
      try {
        await api.patch(`/payments/${payment.id}`, { status: newStatus })
        $q.notify({
          type: 'positive',
          message: `Pago ${newStatus === 'confirmed' ? 'confirmado' : 'pendiente'}`
        })
        await loadData()
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: 'Error actualizando pago',
          caption: error.response?.data?.message || error.message
        })
      }
    }
    
    const getStatusColor = (status) => {
      switch (status) {
        case 'open': return 'positive'
        case 'closed': return 'warning'
        case 'completed': return 'info'
        default: return 'grey'
      }
    }
    
    const formatCurrency = (amount) => {
      return Number(amount || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).replace('$', '')
    }
    
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString()
    }
    
    // Lifecycle
    onMounted(loadData)
    
    return {
      savingUser,
      savingTournament,
      // Data
      loading,
      users,
      tournaments,
      payments,
      userTournaments,
      currentUser,
      isAdmin,
      userInitials,
      
      // Forms
      userDialog,
      editingUser,
      userForm,
      tournamentDialog,
      editingTournament,
      tournamentForm,
      
      // Filters
      selectedTournament,
      paymentStatus,
      tournamentOptions,
      statusOptions,
      filteredPayments,
      
      // Columns
      userColumns,
      tournamentColumns,
      paymentColumns,
      
      // Methods
      openUserDialog,
      saveUser,
      confirmDeleteUser,
      saveTournament,
      confirmDeleteTournament,
      distributePrizes,
      togglePaymentStatus,
      getStatusColor,
      formatCurrency,
      formatDate
    }
  }
}
</script>

<style scoped>
.dashboard-page {
  background: #f5f5f5;
}

.header {
  background: linear-gradient(135deg, #6e48aa 0%, #9d50bb 100%);
  color: white;
  padding: 20px 0;
  margin-bottom: 20px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  margin: 0;
  font-size: 2rem;
  font-weight: 500;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.username {
  font-weight: 500;
}

.section-card {
  max-width: 1200px;
  margin: 20px auto;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.admin-table {
  width: 100%;
}

.filter-row {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.user-tournaments {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.tournament-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.tournament-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.tournament-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tournament-name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

.tournament-details {
  display: grid;
  gap: 10px;
  margin-bottom: 15px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.countdown-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.user-position {
  margin-top: 10px;
  text-align: right;
}

.no-tournaments {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.no-tournaments p {
  margin: 15px 0;
  font-size: 1.1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>