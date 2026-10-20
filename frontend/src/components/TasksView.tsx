import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  FileText
} from 'lucide-react';
import { TaskItem } from '../types';
import { api } from '../services/api';

interface TasksViewProps {
  tasks: TaskItem[];
  onRefreshTasks: () => void;
  onRefreshStats: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onRefreshTasks,
  onRefreshStats,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed' | 'high' | 'overdue'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formPriority, setFormPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const todayStr = new Date().toISOString().split('T')[0];

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormDate(todayStr);
    setFormTime('');
    setFormPriority('Medium');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description);
    setFormDate(task.due_date || '');
    setFormTime(task.due_time || '');
    setFormPriority(task.priority);
    setIsModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, {
          title: formTitle.trim(),
          description: formDesc.trim(),
          due_date: formDate || undefined,
          due_time: formTime || undefined,
          priority: formPriority,
        });
      } else {
        await api.createTask({
          title: formTitle.trim(),
          description: formDesc.trim(),
          due_date: formDate || undefined,
          due_time: formTime || undefined,
          priority: formPriority,
        });
      }
      setIsModalOpen(false);
      onRefreshTasks();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Completion
  const handleToggleComplete = async (task: TaskItem) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      onRefreshTasks();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      onRefreshTasks();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    // Search
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filter tab
    if (filterTab === 'pending') return !task.completed;
    if (filterTab === 'completed') return task.completed;
    if (filterTab === 'high') return task.priority === 'High' && !task.completed;
    if (filterTab === 'overdue') {
      return !task.completed && task.due_date && task.due_date < todayStr;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-warm-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-sloth-500"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-sloth-700 hover:bg-sloth-800 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'all', label: 'All Tasks' },
          { id: 'high', label: 'High Priority' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
              filterTab === tab.id
                ? 'bg-sloth-100 dark:bg-sloth-900 text-sloth-900 dark:text-sloth-200 border border-sloth-200 dark:border-sloth-800 font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 bg-white dark:bg-warm-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <CheckSquare className="w-10 h-10 mx-auto mb-2 stroke-1" />
            <p className="text-sm font-medium">No tasks found</p>
            <p className="text-xs mt-1">Add a new task manually or extract them from documents.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.completed && task.due_date && task.due_date < todayStr;
            const isToday = !task.completed && task.due_date === todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 bg-white dark:bg-warm-900 ${
                  task.completed
                    ? 'border-neutral-200/60 dark:border-neutral-800/60 opacity-60'
                    : 'border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:border-sloth-300 dark:hover:border-sloth-700'
                }`}
              >
                {/* Left check & info */}
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 text-neutral-400 hover:text-sloth-600 dark:hover:text-sloth-400 transition-colors"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-5 h-5 text-sloth-600 dark:text-sloth-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <h4
                      className={`text-sm font-semibold text-neutral-900 dark:text-white leading-snug ${
                        task.completed ? 'line-through text-neutral-400 dark:text-neutral-500' : ''
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      {/* Priority Tag */}
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        task.priority === 'High'
                          ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
                          : task.priority === 'Medium'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}>
                        {task.priority}
                      </span>

                      {/* Due Date Tag */}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 font-mono px-2 py-0.5 rounded border ${
                          isOverdue
                            ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900 font-bold'
                            : isToday
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900 font-bold'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          <span>{task.due_date} {task.due_time ? `@ ${task.due_time}` : ''}</span>
                          {isOverdue && ' (Overdue)'}
                          {isToday && ' (Due Today)'}
                        </span>
                      )}

                      {/* Source Document Reference */}
                      {task.source_document_title && (
                        <span className="flex items-center gap-1 text-neutral-400 font-mono">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-xs">{task.source_document_title}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(task)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Edit task"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-warm-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-4">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h3>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Remit invoice #INV-881 to AcmeCorp"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sloth-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional details or context extracted from document..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sloth-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sloth-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sloth-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-sloth-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-sloth-700 hover:bg-sloth-800 text-white shadow-xs"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
