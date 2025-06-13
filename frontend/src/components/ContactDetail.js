import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Star,
  Calendar,
  MessageSquare,
  Plus,
  MoreVertical,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { crmAPI } from '../api';
import ContactForm from './ContactForm';

const ContactDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);

  const { data: contactResponse, isLoading: contactLoading } = useQuery(
    ['contact', id],
    () => crmAPI.getContact(id)
  );

  const { data: interactionsResponse, isLoading: interactionsLoading } = useQuery(
    ['contactInteractions', id],
    () => crmAPI.getContactInteractions(id, 50)
  );

  const contact = contactResponse?.data;
  const interactions = interactionsResponse?.data || [];

  const updateStatusMutation = useMutation(
    (status) => crmAPI.updateContact(id, { status }),
    {
      onSuccess: () => {
        toast.success('Status updated successfully!');
        queryClient.invalidateQueries(['contact', id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to update status');
      }
    }
  );

  const createInteractionMutation = useMutation(
    crmAPI.createInteraction,
    {
      onSuccess: () => {
        toast.success('Interaction added successfully!');
        queryClient.invalidateQueries(['contactInteractions', id]);
        setShowInteractionForm(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Failed to add interaction');
      }
    }
  );

  const getStatusBadge = (status) => {
    const statusClasses = {
      new: 'bg-blue-100 text-blue-800',
      qualified: 'bg-yellow-100 text-yellow-800',
      engaged: 'bg-green-100 text-green-800',
      customer: 'bg-purple-100 text-purple-800',
      inactive: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClasses[status] || statusClasses.new}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'New'}
      </span>
    );
  };

  const getLeadScoreBadge = (score) => {
    let colorClass = 'bg-gray-100 text-gray-800';
    if (score >= 80) colorClass = 'bg-green-100 text-green-800';
    else if (score >= 60) colorClass = 'bg-yellow-100 text-yellow-800';
    else if (score >= 40) colorClass = 'bg-orange-100 text-orange-800';
    else if (score >= 20) colorClass = 'bg-red-100 text-red-800';

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-lg ${colorClass}`}>
        <Star className="w-4 h-4 mr-1" />
        <span className="font-medium">{score || 0} points</span>
      </div>
    );
  };

  const getInteractionIcon = (type) => {
    const icons = {
      email_sent: Mail,
      email_opened: Mail,
      email_clicked: Mail,
      note_added: MessageSquare,
      meeting_scheduled: Calendar,
      phone_call: Phone,
    };
    return icons[type] || MessageSquare;
  };

  const statusOptions = [
    { value: 'new', label: 'New', color: 'blue' },
    { value: 'qualified', label: 'Qualified', color: 'yellow' },
    { value: 'engaged', label: 'Engaged', color: 'green' },
    { value: 'customer', label: 'Customer', color: 'purple' },
    { value: 'inactive', label: 'Inactive', color: 'gray' }
  ];

  if (contactLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-600">Contact not found</p>
          <Link to="/contacts" className="text-blue-600 hover:text-blue-800">
            ← Back to Contacts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/contacts"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.first_name} {contact.last_name}
            </h1>
            <p className="text-gray-600">{contact.email}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEditForm(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
              <div className="flex items-center space-x-3">
                {getStatusBadge(contact.status)}
                {getLeadScoreBadge(contact.lead_score)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-900">{contact.email}</p>
                  </div>
                </div>

                {contact.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Phone</p>
                      <p className="text-sm text-gray-900">{contact.phone}</p>
                    </div>
                  </div>
                )}

                {(contact.city || contact.state || contact.country) && (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-900">
                        {[contact.city, contact.state, contact.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {contact.company && (
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Company</p>
                      <p className="text-sm text-gray-900">{contact.company}</p>
                      {contact.position && (
                        <p className="text-xs text-gray-500">{contact.position}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center">
                  <Star className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Lead Source</p>
                    <p className="text-sm text-gray-900 capitalize">
                      {contact.lead_source?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Created</p>
                    <p className="text-sm text-gray-900">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {contact.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                <p className="text-sm text-gray-900">{contact.notes}</p>
              </div>
            )}
          </div>

          {/* Interactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Activity Timeline</h2>
              <button
                onClick={() => setShowInteractionForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </button>
            </div>

            {interactionsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No interactions yet</p>
              </div>
            ) : (
              <div className="flow-root">
                <ul className="-mb-8">
                  {interactions.map((interaction, index) => {
                    const IconComponent = getInteractionIcon(interaction.type);
                    return (
                      <li key={interaction.id}>
                        <div className="relative pb-8">
                          {index !== interactions.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                          )}
                          <div className="relative flex space-x-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <IconComponent className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5">
                              <div>
                                <p className="text-sm text-gray-900">{interaction.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(interaction.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </button>
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status Management</h3>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateStatusMutation.mutate(option.value)}
                  disabled={contact.status === option.value}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                    contact.status === option.value
                      ? 'bg-blue-100 text-blue-800 cursor-default'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                  {contact.status === option.value && (
                    <span className="ml-2 text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email Opens</span>
                <span className="text-sm font-medium text-gray-900">{contact.email_opens || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email Clicks</span>
                <span className="text-sm font-medium text-gray-900">{contact.email_clicks || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Website Visits</span>
                <span className="text-sm font-medium text-gray-900">{contact.website_visits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Interactions</span>
                <span className="text-sm font-medium text-gray-900">{contact.total_interactions || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      {showEditForm && (
        <ContactForm
          contact={contact}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries(['contact', id]);
          }}
        />
      )}

      {/* Add Interaction Modal */}
      {showInteractionForm && (
        <InteractionForm
          contactId={id}
          onClose={() => setShowInteractionForm(false)}
          onSubmit={(data) => createInteractionMutation.mutate(data)}
        />
      )}
    </div>
  );
};

// Simple interaction form component
const InteractionForm = ({ contactId, onClose, onSubmit }) => {
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmit({
        contact_id: contactId,
        type: 'note_added',
        description: description.trim()
      });
      setDescription('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add Note</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note about this contact..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactDetail;
