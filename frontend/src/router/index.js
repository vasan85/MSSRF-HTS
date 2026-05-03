import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Lazy-loaded views
const Login          = () => import('../views/LoginView.vue')
const Layout         = () => import('../views/LayoutView.vue')
const Dashboard      = () => import('../views/DashboardView.vue')
const VillageDash    = () => import('../views/VillageDashView.vue')
const ProjectDash    = () => import('../views/ProjectDashView.vue')
const Households     = () => import('../views/HouseholdsView.vue')
const HHForm         = () => import('../views/HHFormView.vue')
const Projects       = () => import('../views/ProjectsView.vue')
const Linking        = () => import('../views/LinkingView.vue')
const GISMap         = () => import('../views/GISMapView.vue')
const GISHousehold   = () => import('../views/GISHouseholdView.vue')
const Masters        = () => import('../views/MastersView.vue')
const Reports        = () => import('../views/ReportsView.vue')
const Settings       = () => import('../views/SettingsView.vue')
const AuditLog       = () => import('../views/AuditView.vue')
const ReviewQueue    = () => import('../views/ReviewQueueView.vue')
const MySubmissions     = () => import('../views/MySubmissionsView.vue')
const EnumeratorStats   = () => import('../views/EnumeratorStatsView.vue')

// Role access map
const ACCESS = {
  dashboard:        ['admin','me','mis_head','mis_reviewer'],
  'village-dash':   ['admin','me','mis_head'],
  'project-dash':   ['admin','me','mis_head'],
  households:       ['admin','enumerator','mis_reviewer','mis_head'],
  projects:         ['admin'],
  linking:          ['admin','enumerator'],
  gis:              ['admin','me','mis_head'],
  'gis-hh':         ['admin','me','mis_head'],
  masters:          ['admin'],
  reports:          ['admin','me','mis_head'],
  settings:         ['admin','mis_head'],
  audit:            ['admin','me','mis_head'],
  'review-queue':   ['mis_reviewer','admin'],
  'my-submissions':     ['enumerator'],
  'enumerator-stats':   ['admin', 'mis_reviewer', 'mis_head'],
}

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  {
    path: '/', component: Layout,
    children: [
      { path: '',           redirect: '/dashboard' },
      { path: 'dashboard',  name: 'dashboard',    component: Dashboard,   meta: { key: 'dashboard' } },
      { path: 'village-dash',name:'village-dash',  component: VillageDash, meta: { key: 'village-dash' } },
      { path: 'project-dash',name:'project-dash',  component: ProjectDash, meta: { key: 'project-dash' } },
      { path: 'households', name: 'households',   component: Households,  meta: { key: 'households' } },
      { path: 'households/new', name: 'hh-new',   component: HHForm,      meta: { key: 'households' } },
      { path: 'households/:id/edit', name:'hh-edit', component: HHForm,   meta: { key: 'households' } },
      { path: 'projects',   name: 'projects',     component: Projects,    meta: { key: 'projects' } },
      { path: 'linking',    name: 'linking',      component: Linking,     meta: { key: 'linking' } },
      { path: 'gis',        name: 'gis',          component: GISMap,      meta: { key: 'gis' } },
      { path: 'gis-hh',     name: 'gis-hh',       component: GISHousehold,meta: { key: 'gis-hh' } },
      { path: 'masters',    name: 'masters',      component: Masters,     meta: { key: 'masters' } },
      { path: 'reports',    name: 'reports',      component: Reports,     meta: { key: 'reports' } },
      { path: 'settings',        name: 'settings',        component: Settings,       meta: { key: 'settings' } },
      { path: 'audit',           name: 'audit',           component: AuditLog,       meta: { key: 'audit' } },
      { path: 'review-queue',    name: 'review-queue',    component: ReviewQueue,    meta: { key: 'review-queue' } },
      { path: 'my-submissions',   name: 'my-submissions',   component: MySubmissions,  meta: { key: 'my-submissions' } },
      { path: 'enumerator-stats', name: 'enumerator-stats', component: EnumeratorStats, meta: { key: 'enumerator-stats' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.public) return next()
  if (!auth.isLoggedIn) return next('/login')

  const key = to.meta.key
  if (key && ACCESS[key] && !ACCESS[key].includes(auth.role)) {
    const first = {
      admin:'dashboard', me:'dashboard',
      enumerator:'households', mis_reviewer:'review-queue', mis_head:'dashboard',
    }
    return next('/' + (first[auth.role] || 'dashboard'))
  }
  next()
})

export default router
