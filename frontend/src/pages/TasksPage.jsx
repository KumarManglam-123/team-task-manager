import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { format, parseISO, isAfter } from 'date-fns'

const STATUSES = ['To Do', 'In Progress', 'Done']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const statusStyle = {
  'To Do': 'badge-todo',
  'In Progress': 'badge-inprogress',
  'Done': 'badge-done'
}
const priorityStyle = {
  Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical'
}
const priorityIcon = { Critical: '🔴', High: '🟠', Medium: '🟡', Low: '⚪' }

const Modal = ({ open, onClose, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg animate-pop max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

const TaskCard = ({ task, isAdmin, onEdit, onDelete, onStatusChange, currentUserId }) => {
  const isOverdue = task.dueDate && isAfter(new Date(), parseISO(task.dueDate)) && task.status !== 'Done'
  const canEdit = isAdmin || task.assignedTo?._id === currentUserId

  return (
    <div className="card p-4 space-y-3 hover:border-gray-700 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-sm mt-0.5 flex-shrink-0">{priorityIcon[task.priority]}</span>
          <p className="font-semibold text-sm text-gray-200 leading-snug">{task.title}</p>
        </div>
        {canEdit && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(task)} className="text-gray-500 hover:text-brand-400 text-xs px-1.5 py-1 rounded transition-colors">✎</button>
            {isAdmin && <button onClick={() => onDelete(task._id)} className="text-gray-500 hover:text-red-400 text-xs px-1.5 py-1 rounded transition-colors">×</button>}
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${priorityStyle[task.priority]}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span className={`text-xs font-mono ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
            {isOverdue ? '⚠ ' : ''}Due {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        {task.assignedTo ? (
          <div className="flex items-center gap-2">
            <img src={task.assignedTo.avatar} alt={task.assignedTo.name} className="w-6 h-6 rounded-full" />
            <span className="text-xs text-gray-400 truncate max-w-[120px]">{task.assignedTo.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-600">Unassigned</span>
        )}

        {canEdit && (
          <select
            value={task.status}
            onChange={e => onStatusChange(task._id, e.target.value)}
            className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1 cursor-pointer"
            onClick={e => e.stopPropagation()}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {task.comments?.length > 0 && (
        <div className="text-xs text-gray-600">💬 {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}</div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { id: projectId } = useParams()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [view, setView] = useState('kanban')
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [filter, setFilter] = useState({ priority: '', assignedTo: '' })
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: '', tags: '' })

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data)
  })

  const { data: taskData, isLoading } = useQuery({
    queryKey: ['tasks', projectId, filter],
    queryFn: () => {
      const params = new URLSearchParams({ project: projectId })
      if (filter.priority) params.set('priority', filter.priority)
      if (filter.assignedTo) params.set('assignedTo', filter.assignedTo)
      return api.get(`/tasks?${params}`).then(r => r.data)
    }
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId])
      qc.invalidateQueries(['dashboard'])
      setShowCreate(false)
      resetForm()
      toast.success('Task created!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId])
      qc.invalidateQueries(['dashboard'])
      setEditTask(null)
      toast.success('Task updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update task')
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId])
      qc.invalidateQueries(['dashboard'])
      toast.success('Task deleted')
    }
  })

  const resetForm = () => setForm({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: '', tags: '' })

  const project = projectData?.project
  const isAdmin = project?.userRole === 'Admin'
  const tasks = taskData?.tasks || []

  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status)
    return acc
  }, {})

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      project: projectId,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      dueDate: form.dueDate || undefined,
      assignedTo: form.assignedTo || undefined
    }
    if (editTask) {
      updateMutation.mutate({ id: editTask._id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openEdit = (task) => {
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '',
      assignedTo: task.assignedTo?._id || '',
      tags: task.tags?.join(', ') || ''
    })
    setEditTask(task)
  }

  const statusColumnStyle = {
    'To Do': 'border-gray-700',
    'In Progress': 'border-blue-500/30',
    'Done': 'border-emerald-500/30'
  }
  const statusHeaderStyle = {
    'To Do': 'text-gray-400',
    'In Progress': 'text-blue-400',
    'Done': 'text-emerald-400'
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/projects/${projectId}`} className="text-gray-500 hover:text-gray-300 transition-colors">← Back</Link>
          <h1 className="text-2xl font-bold text-white">{project?.name} — Tasks</h1>
          {isAdmin && (
            <span className="text-xs bg-brand-500/15 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-lg font-semibold">Admin</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-xl p-1">
            {['kanban', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === v ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {v === 'kanban' ? '⊞ Kanban' : '≡ List'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => { resetForm(); setShowCreate(true) }} className="btn-primary flex items-center gap-2">
              ＋ New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input !w-auto text-sm py-2" value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input !w-auto text-sm py-2" value={filter.assignedTo} onChange={e => setFilter(f => ({ ...f, assignedTo: e.target.value }))}>
          <option value="">All Assignees</option>
          {project?.members?.map(m => (
            <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
          ))}
        </select>
        {(filter.priority || filter.assignedTo) && (
          <button onClick={() => setFilter({ priority: '', assignedTo: '' })} className="text-sm text-gray-500 hover:text-gray-300">Clear filters</button>
        )}
        <span className="text-sm text-gray-500 ml-auto">{tasks.length} tasks</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'kanban' ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATUSES.map(status => (
            <div key={status} className={`card border-t-2 ${statusColumnStyle[status]} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold ${statusHeaderStyle[status]}`}>{status}</h3>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-lg font-mono">
                  {tasksByStatus[status]?.length}
                </span>
              </div>
              <div className="space-y-3">
                {tasksByStatus[status]?.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-xl">
                    No tasks
                  </div>
                ) : (
                  tasksByStatus[status]?.map(task => (
                    <TaskCard key={task._id} task={task} isAdmin={isAdmin}
                      currentUserId={user?._id}
                      onEdit={openEdit}
                      onDelete={(id) => { if (confirm('Delete this task?')) deleteMutation.mutate(id) }}
                      onStatusChange={(id, status) => updateMutation.mutate({ id, data: { status } })}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Task', 'Status', 'Priority', 'Assignee', 'Due Date', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tasks.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">No tasks found</td></tr>
              ) : tasks.map(task => {
                const isOverdue = task.dueDate && isAfter(new Date(), parseISO(task.dueDate)) && task.status !== 'Done'
                return (
                  <tr key={task._id} className="hover:bg-gray-800/40 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-sm">{priorityIcon[task.priority]}</span>
                        <div>
                          <p className="font-semibold text-sm text-gray-200">{task.title}</p>
                          {task.description && <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${statusStyle[task.status]}`}>{task.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg border font-semibold ${priorityStyle[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <img src={task.assignedTo.avatar} className="w-6 h-6 rounded-full" />
                          <span className="text-xs text-gray-400">{task.assignedTo.name}</span>
                        </div>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span className={`text-xs font-mono ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                          {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(isAdmin || task.assignedTo?._id === user?._id) && (
                          <button onClick={() => openEdit(task)} className="text-gray-500 hover:text-brand-400 text-xs px-2 py-1 rounded transition-colors">Edit</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(task._id) }}
                            className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors">Del</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showCreate || !!editTask} onClose={() => { setShowCreate(false); setEditTask(null); resetForm() }}>
        <h2 className="text-xl font-bold text-white mb-5">{editTask ? 'Edit Task' : 'Create Task'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required placeholder="Task title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Task details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select className="input" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
              <option value="">Unassigned</option>
              {project?.members?.map(m => (
                <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input" placeholder="bug, frontend, urgent" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); setEditTask(null); resetForm() }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1">
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
