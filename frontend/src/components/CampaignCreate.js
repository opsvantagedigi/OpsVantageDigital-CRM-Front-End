import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Send, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { crmAPI } from '../api';

const CampaignCreate = () => {
  const navigate = useNavigate();
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const { data: templatesResponse } = useQuery('templates', crmAPI.getTemplates);
  const templates = templatesResponse?.data || [];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      subject: '',
      html_content: '',
      text_content: '',
      target_tags: [],
      target_status: [],
      exclude_tags: [],
      scheduled_at: ''
    }
  });

  const watchedValues = watch();

  const createCampaignMutation = useMutation(crmAPI.createCampaign, {
    onSuccess: () => {
      toast.success('Campaign created successfully!');
      navigate('/campaigns');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    }
  });

  const onSubmit = (data) => {
    // Parse arrays from comma-separated strings
    const formattedData = {
      ...data,
      target_tags: data.target_tags ? data.target_tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      exclude_tags: data.exclude_tags ? data.exclude_tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      target_status: data.target_status || [],
      scheduled_at: data.scheduled_at || null
    };

    createCampaignMutation.mutate(formattedData);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setValue('subject', template.subject);
    setValue('html_content', template.html_content);
    setValue('text_content', template.text_content || '');
  };

  const statusOptions = [
    { value: 'new', label: 'New Contacts' },
    { value: 'qualified', label: 'Qualified Leads' },
    { value: 'engaged', label: 'Engaged Contacts' },
    { value: 'customer', label: 'Customers' }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/campaigns')}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
            <p className="text-gray-600">Create a new email marketing campaign</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Selection Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Email Templates</h3>
            
            {templates.length === 0 ? (
              <p className="text-sm text-gray-500">No templates available</p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 mb-1">
                      {template.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {template.subject}
                    </div>
                    {template.is_default && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                        Default
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {previewMode ? (
            /* Preview Mode */
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Email Preview</h2>
                <p className="text-sm text-gray-600 mt-1">Preview how your email will look to recipients</p>
              </div>
              
              <div className="p-6">
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  {/* Email Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="text-sm text-gray-700">
                      <div><strong>From:</strong> OpsVantage Digital &lt;noreply@opsvantage.com&gt;</div>
                      <div><strong>Subject:</strong> {watchedValues.subject || 'Your email subject'}</div>
                    </div>
                  </div>
                  
                  {/* Email Content */}
                  <div className="bg-white">
                    {watchedValues.html_content ? (
                      <div 
                        className="prose max-w-none p-4"
                        dangerouslySetInnerHTML={{ __html: watchedValues.html_content }}
                      />
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>Start typing your email content to see the preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Campaign Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Campaign Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      {...register('name', { required: 'Campaign name is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Monthly Newsletter"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      {...register('scheduled_at')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    {...register('subject', { required: 'Email subject is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Welcome to OpsVantage Digital!"
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                  )}
                </div>
              </div>

              {/* Email Content */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Email Content</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HTML Content *
                    </label>
                    <textarea
                      {...register('html_content', { required: 'Email content is required' })}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Enter your HTML email content here..."
                    />
                    {errors.html_content && (
                      <p className="mt-1 text-sm text-red-600">{errors.html_content.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plain Text Content (Optional)
                    </label>
                    <textarea
                      {...register('text_content')}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Plain text version of your email..."
                    />
                  </div>
                </div>
              </div>

              {/* Audience Targeting */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Audience Targeting</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Contact Status
                    </label>
                    <select
                      multiple
                      {...register('target_status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      size={4}
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Tags
                    </label>
                    <input
                      type="text"
                      {...register('target_tags')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="tag1, tag2, tag3"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated tags</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exclude Tags
                  </label>
                  <input
                    type="text"
                    {...register('exclude_tags')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="unsubscribed, bounced"
                  />
                  <p className="text-xs text-gray-500 mt-1">Exclude contacts with these tags</p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/campaigns')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCampaignMutation.isLoading}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {createCampaignMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignCreate;
