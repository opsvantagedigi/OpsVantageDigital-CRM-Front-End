import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Play, Pause, StopCircle, Edit, Trash2, Eye, Zap, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { crmAPI } from '../api';

const EmailSequences = () => {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);

  const { data: sequencesResponse, isLoading } = useQuery('sequences', crmAPI.getSequences);
  const sequences = sequencesResponse?.data || [];

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: Play },
      paused: { color: 'bg-yellow-100 text-yellow-800', icon: Pause },
      stopped: { color: 'bg-red-100 text-red-800', icon: StopCircle }
    };

    const config = statusConfig[status] || statusConfig.active;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Active'}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Sequences</h1>
          <p className="text-gray-600">Create and manage automated email sequences</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Sequence
        </button>
      </div>

      {/* Sequences List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sequences...</p>
        </div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sequences yet</h3>
          <p className="text-gray-600 mb-6">Create your first automated email sequence</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {sequences.map((sequence) => (
            <div key={sequence.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{sequence.name}</h3>
                      {getStatusBadge(sequence.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">{sequence.description}</p>

                    <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 mr-1" />
                        <span>{sequence.emails?.length || 0} emails</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>Active enrollments: 0</span>
                      </div>
                      <div>
                        <span>Created: {new Date(sequence.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Triggers */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Triggers:</h4>
                      <div className="flex flex-wrap gap-2">
                        {sequence.trigger_tags?.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            Tag: {tag}
                          </span>
                        ))}
                        {sequence.trigger_status?.map((status, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                            Status: {status}
                          </span>
                        ))}
                        {(!sequence.trigger_tags?.length && !sequence.trigger_status?.length) && (
                          <span className="text-xs text-gray-500">No automatic triggers</span>
                        )}
                      </div>
                    </div>

                    {/* Email Steps Preview */}
                    {sequence.emails && sequence.emails.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Email Steps:</h4>
                        <div className="space-y-2">
                          {sequence.emails.slice(0, 3).map((email, index) => (
                            <div key={index} className="flex items-center text-sm">
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mr-3">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <span className="text-gray-900">{email.subject}</span>
                                <span className="text-gray-500 ml-2">
                                  ({email.delay_hours || 0}h delay)
                                </span>
                              </div>
                            </div>
                          ))}
                          {sequence.emails.length > 3 && (
                            <div className="text-xs text-gray-500 ml-9">
                              +{sequence.emails.length - 3} more emails
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedSequence(sequence)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600" title="Edit">
                      <Edit className="h-5 w-5" />
                    </button>
                    
                    <button className="p-2 text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sequence Modal */}
      {showCreateForm && (
        <SequenceForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries('sequences');
          }}
        />
      )}

      {/* Sequence Detail Modal */}
      {selectedSequence && (
        <SequenceDetail
          sequence={selectedSequence}
          onClose={() => setSelectedSequence(null)}
        />
      )}
    </div>
  );
};

// Sequence Form Component
const SequenceForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_tags: '',
    trigger_status: [],
    emails: [
      {
        subject: '',
        html_content: '',
        text_content: '',
        delay_hours: 0
      }
    ]
  });

  const createMutation = useMutation(crmAPI.createSequence, {
    onSuccess: () => {
      toast.success('Sequence created successfully!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create sequence');
    }
  });

  const addEmailStep = () => {
    setFormData({
      ...formData,
      emails: [
        ...formData.emails,
        {
          subject: '',
          html_content: '',
          text_content: '',
          delay_hours: 24
        }
      ]
    });
  };

  const removeEmailStep = (index) => {
    if (formData.emails.length > 1) {
      setFormData({
        ...formData,
        emails: formData.emails.filter((_, i) => i !== index)
      });
    }
  };

  const updateEmail = (index, field, value) => {
    const updatedEmails = [...formData.emails];
    updatedEmails[index] = { ...updatedEmails[index], [field]: value };
    setFormData({ ...formData, emails: updatedEmails });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sequenceData = {
      ...formData,
      trigger_tags: formData.trigger_tags ? formData.trigger_tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
    };
    createMutation.mutate(sequenceData);
  };

  const statusOptions = [
    { value: 'new', label: 'New Contacts' },
    { value: 'qualified', label: 'Qualified Leads' },
    { value: 'engaged', label: 'Engaged Contacts' },
    { value: 'customer', label: 'Customers' }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Create Email Sequence</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Tags
              </label>
              <input
                type="text"
                value={formData.trigger_tags}
                onChange={(e) => setFormData({...formData, trigger_tags: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated tags that trigger this sequence</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger Status
            </label>
            <select
              multiple
              value={formData.trigger_status}
              onChange={(e) => setFormData({
                ...formData, 
                trigger_status: Array.from(e.target.selectedOptions, option => option.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              size={4}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple statuses</p>
          </div>

          {/* Email Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Email Steps</h4>
              <button
                type="button"
                onClick={addEmailStep}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Email
              </button>
            </div>

            <div className="space-y-6">
              {formData.emails.map((email, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-700">Email {index + 1}</h5>
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailStep(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={email.subject}
                        onChange={(e) => updateEmail(index, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delay (hours)
                      </label>
                      <input
                        type="number"
                        value={email.delay_hours}
                        onChange={(e) => updateEmail(index, 'delay_hours', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HTML Content
                    </label>
                    <textarea
                      value={email.html_content}
                      onChange={(e) => updateEmail(index, 'html_content', e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plain Text Content (Optional)
                    </label>
                    <textarea
                      value={email.text_content}
                      onChange={(e) => updateEmail(index, 'text_content', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Creating...' : 'Create Sequence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sequence Detail Component
const SequenceDetail = ({ sequence, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{sequence.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">{sequence.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700">Status</div>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sequence.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sequence.status}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700">Email Steps</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">
                  {sequence.emails?.length || 0}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700">Active Enrollments</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">0</div>
              </div>
            </div>
          </div>

          {/* Email Steps */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Email Steps</h4>
            <div className="space-y-4">
              {sequence.emails?.map((email, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{email.subject}</h5>
                      <p className="text-sm text-gray-600 mb-2">
                        Delay: {email.delay_hours || 0} hours
                        {index === 0 ? ' (sent immediately)' : ''}
                      </p>
                      <div className="bg-gray-50 rounded-md p-3">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: email.html_content?.substring(0, 200) + (email.html_content?.length > 200 ? '...' : '') 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Triggers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {sequence.trigger_tags?.length > 0 ? (
                    sequence.trigger_tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No tag triggers</span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Status Changes</div>
                <div className="flex flex-wrap gap-2">
                  {sequence.trigger_status?.length > 0 ? (
                    sequence.trigger_status.map((status, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        {status}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No status triggers</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSequences;
