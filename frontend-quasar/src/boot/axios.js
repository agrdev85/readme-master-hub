import { boot } from 'quasar/wrappers'
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:8000',
  withCredentials: false, // Temporalmente deshabilitado para CORS
  timeout: 20000 // Aumentado a 20 segundos
})

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout excedido:', error.config.url)
      return Promise.reject({ ...error, userMessage: 'El servidor está tardando demasiado en responder' })
    }
    if (error.code === 'ERR_NETWORK') {
      console.error('Error de red:', error)
      return Promise.reject({ ...error, userMessage: 'Problema de conexión con el servidor' })
    }
    return Promise.reject(error)
  }
)

export default boot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }