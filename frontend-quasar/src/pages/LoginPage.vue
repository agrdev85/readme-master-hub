<template>
  <q-page class="login-page row items-center justify-center">
    <q-card class="login-card">
      <q-card-section class="text-center">
        <div class="logo">
          <q-icon name="emoji_events" size="xl" color="amber-7" />
          <h1 class="app-name">Cufire</h1>
        </div>
        <div class="text-h5 q-mt-md">Iniciar Sesión</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit.prevent="login" class="q-gutter-md">
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
            :rules="[val => !!val || 'Contraseña es requerida']"
          />
          
          <div class="q-mt-lg">
            <q-btn 
              type="submit" 
              color="amber-7" 
              text-color="black" 
              label="Ingresar" 
              class="full-width" 
              :loading="loading"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <div class="text-caption">
          ¿No tienes cuenta? 
          <router-link to="/register" class="text-amber-7">Regístrate</router-link>
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
      email: '',
      password: ''
    })
    
    const loading = ref(false)
    
    const login = async () => {
      loading.value = true
      try {
        await authStore.login(form.value)
        $q.notify({
          type: 'positive',
          message: 'Bienvenido!',
          timeout: 1000
        })
        router.push('/dashboard')
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: error || 'Error en el login',
          timeout: 2000
        })
      } finally {
        loading.value = false
      }
    }
    
    return {
      form,
      loading,
      login
    }
  }
}
</script>

<style scoped>
.login-page {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.login-card {
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