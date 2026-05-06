import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const Modal = ({ open, onClose, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md animate-pop" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [showAddMember, setShowAddMember] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('Member')

  const { data: projectData, isLoading: pLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data)
  })

  const { data: dashData } = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => api.get(`/dashboard/project/${id}`).then(r => r.data)
  })

  const addMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${id}/members`, data),
    onSuccess: () => {
      qc.invalidateQueries(['project', id])
      setShowAddMember(false)
      setAddEmail('')
      toast.success('Member added!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add member')
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => api.delete(`/projects/${id}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries(['project', id])
      toast.success('Member removed')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove member')
  })

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${id}`),
    onSuccess: () => {
      navigate('/projects')
      qc.invalidateQueries(['projects'])
      toast.success('Project deleted')
    }
  })

  if (pLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const project = projectData?.project
  const isAdmin = projectData?.project?.userRole === 'Admin'
  const stats = dashData?.stats
  const workload = dashData?.tasksPerUser

  if (!project) return <div className="card p-8 text-center text-gray-400">Project not found</div>

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0"
          style={{ background: project.color }}>
          {project.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${isAdmin ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'badge-todo'}`}>
              {project.userRole}
            </span>
          </div>
          {project.description && <p className="text-gray-400 mt-1">{project.description}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link to={`/projects/${id}/tasks`} className="btn-primary flex items-center gap-2">
            ◈ View Tasks
          </Link>
          {isAdmin && (
            <button onClick={() => { if (confirm('Delete this project and all its tasks?')) deleteProjectMutation.mutate() }}
              className="btn-danger">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-brand-400' },
            { label: 'To Do', value: stats.todo, color: 'text-gray-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
            { label: 'Done', value: stats.done, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500 font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Members */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Members ({project.members?.length})</h2>
            {isAdmin && (
              <button onClick={() => setShowAddMember(true)} className="text-brand-400 hover:text-brand-300 text-sm font-semibold">+ Add</button>
            )}
          </div>
          <div className="space-y-3">
            {project.members?.map(member => (
              <div key={member.user._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-800/50 transition-colors group">
                <img src={member.user.avatar} alt={member.user.name} className="w-9 h-9 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-200 truncate">{member.user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{member.user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${member.role === 'Admin' ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'badge-todo'}`}>
                    {member.role}
                  </span>
                  {isAdmin && member.user._id !== user._id && (
                    <button onClick={() => removeMemberMutation.mutate(member.user._id)}
                      className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workload */}
        <div className="lg:col-span-3 card p-6">
          <h2 className="font-bold text-white mb-4">Workload Distribution</h2>
          {workload?.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">No assigned tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={workload} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <XAxis dataKey="user.name" tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'Syne' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '12px', fontFamily: 'Syne' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" name="Total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="done" name="Done" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal open={showAddMember} onClose={() => setShowAddMember(false)}>
        <h2 className="text-xl font-bold text-white mb-5">Add Member</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="member@company.com"
              value={addEmail} onChange={e => setAddEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={addRole} onChange={e => setAddRole(e.target.value)}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowAddMember(false)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={addMemberMutation.isPending}
              onClick={() => addMemberMutation.mutate({ email: addEmail, role: addRole })}>
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
