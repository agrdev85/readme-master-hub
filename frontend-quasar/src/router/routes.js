import HomePage from 'pages/HomePage.vue'
import LoginPage from 'pages/LoginPage.vue'
import RegisterPage from 'pages/RegisterPage.vue'
import DashboardPage from 'pages/DashboardPage.vue'
import TournamentDetail from 'pages/TournamentDetail.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage,
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/tournaments/:id',
    name: 'tournament-detail',
    component: TournamentDetail,
    props: true
  },
  {
    path: '/:catchAll(.*)*',
    redirect: '/'
  }
]

export default routes