import { defineStore } from 'pinia'
import api from '../api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user:  JSON.parse(localStorage.getItem('mis_user') || 'null'),
    token: localStorage.getItem('mis_token') || null,
  }),
  getters: {
    isLoggedIn:    s => !!s.token,
    role:          s => s.user?.role || null,
    isAdmin:       s => s.user?.role === 'admin',
    isEnumerator:  s => s.user?.role === 'enumerator',
    isME:          s => s.user?.role === 'me',
    isMISReviewer: s => s.user?.role === 'mis_reviewer',
    isMISHead:     s => s.user?.role === 'mis_head',
    can: s => (...roles) => roles.includes(s.user?.role),
  },
  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.token = data.token
      this.user  = data.user
      localStorage.setItem('mis_token', data.token)
      localStorage.setItem('mis_user',  JSON.stringify(data.user))
    },
    logout() {
      this.token = null
      this.user  = null
      localStorage.removeItem('mis_token')
      localStorage.removeItem('mis_user')
    },
  },
})
