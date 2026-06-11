import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';

export default function TechnicianManagement() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    department: 'Auto Electric',
    status: 'Idle',
    currentTask: 'Ready for assignment'
  });

  const departments = ['Auto Electric'];
  const statuses = ['Active', 'On Break', 'Idle', 'Unavailable'];

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const res = await api.get('/technicians/all');
      setTechnicians(res.data.technicians || []);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load technicians');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter technician name');
      return;
    }

    try {
      if (editingId) {
        // Update
        await api.put(`/technicians/${editingId}`, form);
        toast.success('Technician updated successfully');
      } else {
        // Create
        await api.post('/technicians', form);
        toast.success('Technician added successfully');
      }
      resetForm();
      fetchTechnicians();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save technician');
    }
  };

  const handleEdit = (tech) => {
    setForm({
      name: tech.name,
      department: tech.department,
      status: tech.status,
      currentTask: tech.currentTask
    });
    setEditingId(tech._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this technician?')) return;
    
    try {
      await api.delete(`/technicians/${id}`);
      toast.success('Technician deleted successfully');
      fetchTechnicians();
    } catch (err) {
      toast.error('Failed to delete technician');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      department: 'Auto Electric',
      status: 'Idle',
      currentTask: 'Ready for assignment'
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading technicians...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Technician Management</h1>
          <p className="text-gray-600 mt-2">Manage workshop team members and their assignments</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <FiPlus size={20} />
          {showForm ? 'Cancel' : 'Add Technician'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-l-4 border-blue-600">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {editingId ? 'Edit Technician' : 'Add New Technician'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Kumar Singh"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Current Task */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Current Task</label>
              <input
                type="text"
                value={form.currentTask}
                onChange={(e) => setForm({ ...form, currentTask: e.target.value })}
                placeholder="e.g., IR Test EH5000-WM022"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Buttons */}
            <div className="col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                {editingId ? 'Update Technician' : 'Add Technician'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {technicians.length > 0 ? (
          technicians.map(tech => (
            <div
              key={tech._id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden border border-gray-200"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{tech.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{tech.department}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                      tech.status === 'Active' ? 'bg-green-100 text-green-800' :
                      tech.status === 'On Break' ? 'bg-amber-100 text-amber-800' :
                      tech.status === 'Idle' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {tech.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3">
                <div className="mb-4">
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">Current Task</p>
                  <p className="text-sm text-gray-900 font-medium">{tech.currentTask}</p>
                </div>
                
                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Added: {new Date(tech.createdAt).toLocaleDateString()}</p>
                  <p>Last Updated: {new Date(tech.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  onClick={() => handleEdit(tech)}
                  className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded transition-all text-sm font-medium"
                >
                  <FiEdit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(tech._id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded transition-all text-sm font-medium"
                >
                  <FiTrash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600 text-lg font-medium">No technicians added yet</p>
            <p className="text-gray-500 text-sm mt-1">Click "Add Technician" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
