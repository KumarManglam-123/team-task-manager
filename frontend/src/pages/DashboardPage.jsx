import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { format, isAfter, parseISO } from 'date-fns'

const StatCard = ({ label, value, icon, color, sub }) => (
  <div className="card p-6 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
    <div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm font-semibold text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  </div>
)

const PriorityColors = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#6b7280'
}

const StatusColors = {
  'To Do': '#6366f1',
  'In Progress': '#3b82f6',
  'Done': '#10b981'
}

const priorityIcon = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '⚪' }

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data)
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { stats, priorityStats, tasksPerUser, recentTasks, myTasks } = data

  const statusData = [
    { name: 'To Do', value: stats.todoTasks, color: StatusColors['To Do'] },
    { name: 'In Progress', value: stats.inProgressTasks, color: StatusColors['In Progress'] },
    { name: 'Done', value: stats.doneTasks, color: StatusColors['Done'] }
  ]

  const priorityData = priorityStats.map(p => ({
    name: p._id,
    count: p.count,
    fill: PriorityColors[p._id] || '#6366f1'
  }))

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1">Here's what's happening across your projects</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.totalProjects} icon="⬡" color="bg-brand-500/10 text-brand-400" />
        <StatCard label="Total Tasks" value={stats.totalTasks} icon="◈" color="bg-blue-500/10 text-blue-400" />
        <StatCard label="In Progress" value={stats.inProgressTasks} icon="◷" color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Overdue" value={stats.overdueTasks} icon="⚠" color="bg-red-500/10 text-red-400" sub={stats.overdueTasks > 0 ? 'Needs attention' : 'All on track!'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">Task Status Distribution</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={65} innerRadius={40} paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '12px', fontFamily: 'Syne' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm text-gray-400">{s.name}</span>
                  </div>
                  <span className="font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority breakdown */}
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">Tasks by Priority</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={priorityData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12, fontFamily: 'Syne' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '12px', fontFamily: 'Syne' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks */}
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">My Upcoming Tasks</h2>
          {myTasks?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">✓</div>
              <p>All caught up! No pending tasks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks?.map(task => (
                <div key={task._id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <span className="text-sm mt-0.5">{priorityIcon[task.priority]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-200 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{task.project?.name}</span>
                      {task.dueDate && (
                        <span className={`text-xs font-mono ${isAfter(new Date(), parseISO(task.dueDate)) ? 'text-red-400' : 'text-gray-500'}`}>
                          Due {format(parseISO(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg border font-semibold ${task.status === 'In Progress' ? 'badge-inprogress' : 'badge-todo'}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks per user */}
        <div className="card p-6">
          <h2 className="font-bold text-white mb-4">Team Workload</h2>
          {tasksPerUser?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No assigned tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksPerUser?.map(item => (
                <div key={item._id} className="flex items-center gap-3">
                  <img src={item.user?.avatar} alt={item.user?.name} className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-gray-300">{item.user?.name}</span>
                      <span className="text-gray-500 font-mono">{item.count} tasks</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (item.count / (tasksPerUser[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
