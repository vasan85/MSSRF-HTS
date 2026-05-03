import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

// Attach JWT token
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('mis_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mis_token')
      localStorage.removeItem('mis_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
