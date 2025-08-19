import { defineStore } from 'pinia'
import { api } from 'boot/axios'
//import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAdmin: false
  }),
  
  actions: {
    async login(credentials) {
      try {
        const response = await api.post('/api/auth/login', credentials)
        this.token = response.data.token
        this.user = response.data.user
        this.isAdmin = response.data.user?.is_admin || false
        localStorage.setItem('token', this.token)
        return true
      } catch (error) {
        throw error.response?.data?.message || 'Error de autenticación'
      }
    },
    
    async register(userData) {
      try {
        const response = await api.post('/api/auth/register', userData)
        return response.data
      } catch (error) {
        throw error.response?.data?.message || 'Error en el registro'
      }
    },
    
    async fetchUser() {
      if (!this.token) return
      
      try {
        const response = await api.get('/api/auth/me')
        this.user = response.data
        this.isAdmin = response.data?.is_admin || false
      } catch (error) {
        console.error('Error fetching user:', error)
        this.logout()
      }
    },
    
    logout() {
      this.token = null
      this.user = null
      this.isAdmin = false
      localStorage.removeItem('token')
    },
    
    async updateWallet(walletAddress) {
      try {
        const response = await api.put(`/api/users/${this.user.id}`, {
          usdt_wallet: walletAddress
        })
        this.user.usdt_wallet = walletAddress
        return response.data
      } catch (error) {
        throw error.response?.data?.message || 'Error al actualizar wallet'
      }
    }
  },
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
    currentTournament: (state) => state.user?.current_tournament || null
  }
})