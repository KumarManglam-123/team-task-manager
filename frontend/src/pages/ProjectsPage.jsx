import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

const PROJECT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#f59e0b', '#ef4444']

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

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/projects', data),
    onSuccess: () => {
      qc.invalidateQueries(['projects'])
      qc.invalidateQueries(['dashboard'])
      setShowCreate(false)
      setForm({ name: '', description: '', color: '#6366f1' })
      toast.success('Project created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create project')
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Project name is required')
    createMutation.mutate(form)
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">Manage and organize your team's work</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span>＋</span> New Project
        </button>
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data?.projects?.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">⬡</div>
          <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
          <p className="text-gray-400 mb-6">Create your first project to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.projects?.map(project => (
            <Link key={project._id} to={`/projects/${project._id}`} className="card-hover p-6 block group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  style={{ background: project.color }}>
                  {project.name[0].toUpperCase()}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${project.userRole === 'Admin' ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'badge-todo'}`}>
                  {project.userRole}
                </span>
              </div>

              <h3 className="font-bold text-white text-lg group-hover:text-brand-400 transition-colors">{project.name}</h3>
              {project.description && (
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{project.description}</p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {project.members?.slice(0, 4).map(m => (
                    <img key={m.user._id} src={m.user.avatar} alt={m.user.name}
                      className="w-7 h-7 rounded-full ring-2 ring-gray-900 -ml-1 first:ml-0" />
                  ))}
                  {project.members?.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-gray-700 text-xs text-gray-300 flex items-center justify-center ring-2 ring-gray-900 -ml-1">
                      +{project.members.length - 4}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{project.completedCount}/{project.taskCount}</div>
                  <div className="text-xs text-gray-500">tasks done</div>
                </div>
              </div>

              {/* Progress bar */}
              {project.taskCount > 0 && (
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(project.completedCount / project.taskCount) * 100}%`,
                      background: project.color
                    }}
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <h2 className="text-xl font-bold text-white mb-5">New Project</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input" placeholder="e.g. Marketing Campaign" required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="What's this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-xl transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
