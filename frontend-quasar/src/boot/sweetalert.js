import { boot } from 'quasar/wrappers'
import Swal from 'sweetalert2'

export default boot(({ app }) => {
  app.config.globalProperties.$swal = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  })
  
  app.config.globalProperties.$showError = (message) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: message,
      confirmButtonText: 'OK'
    })
  }
  
  app.config.globalProperties.$showSuccess = (message) => {
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: message,
      confirmButtonText: 'OK'
    })
  }
})