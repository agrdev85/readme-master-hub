<template>
  <q-page class="register-page row items-center justify-center">
    <q-card class="register-card">
      <q-card-section class="text-center">
        <div class="logo">
          <q-icon name="emoji_events" size="xl" color="amber-7" />
          <h1 class="app-name">Cufire</h1>
        </div>
        <div class="text-h5 q-mt-md">Crear Cuenta</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="register" class="q-gutter-md">
          <q-input
            v-model="form.name"
            label="Nombre"
            outlined
            dense
            :rules="[val => !!val || 'Nombre es requerido']"
          />
          
          <q-input
            v-model="form.email"
            label="Email"
            type="email"
            outlined
            dense
            :rules="[
              val => !!val || 'Email es requerido',
              val => /.+@.+\..+/.test(val) || 'Email no válido'
            ]"
          />
          
          <q-input
            v-model="form.password"
            label="Contraseña"
            type="password"
            outlined
            dense
            :rules="[
              val => !!val || 'Contraseña es requerida',
              val => val.length >= 6 || 'Mínimo 6 caracteres'
            ]"
          />
          
          <q-input
            v-model="form.wallet_usdt"
            label="Wallet USDT (TRC20)"
            outlined
            dense
            :rules="[
              val => !!val || 'Wallet es requerida',
              val => val.startsWith('T') && val.length === 34 || 'Dirección TRC20 inválida'
            ]"
          />
          
          <div class="q-mt-lg">
            <q-btn 
              type="submit" 
              color="amber-7" 
              text-color="black" 
              label="Registrarme" 
              class="full-width" 
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <div class="text-caption">
          ¿Ya tienes cuenta? 
          <router-link to="/login" class="text-amber-7">Inicia Sesión</router-link>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth'

export default {
  setup() {
    const $q = useQuasar()
    const router = useRouter()
    const authStore = useAuthStore()
    
    const form = ref({
      name: '',
      email: '',
      password: '',
      wallet_usdt: ''
    })
    
    const loading = ref(false)
    
    const register = async () => {
      loading.value = true
      try {
        await authStore.register(form.value)
        $q.notify({
          type: 'positive',
          message: 'Registro exitoso! Por favor inicia sesión',
          timeout: 2000
        })
        router.push('/login')
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: error || 'Error en el registro',
          timeout: 2000
        })
      } finally {
        loading.value = false
      }
    }
    
    return {
      form,
      loading,
      register
    }
  }
}
</script>

<style scoped>
.register-page {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.register-card {
  width: 100%;
  max-width: 400px;
  border-radius: 10px;
}

.logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.app-name {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #ffb400;
  text-transform: uppercase;
  letter-spacing: 2px;
}
</style>