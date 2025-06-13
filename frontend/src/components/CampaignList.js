import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  Pause,
  BarChart3,
  Eye,
  Play
} from 'lucide-react';
import { crmAPI } from '../api';

const CampaignList = () => {
  const { data: campaignsResponse, isLoading, refetch } = useQuery(
    'campaigns',
    crmAPI.getCampaigns
  );

  const campaigns = campaignsResponse?.data || [];

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      sent: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      paused: { color: 'bg-yellow-100 text-yellow-800', icon: Pause },
      completed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
      </span>
    );
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num?.toString() || '0';
  };

  const calculateOpenRate = (campaign) => {
    if (!campaign.emails_sent || campaign.emails_sent === 0) return 0;
    return ((campaign.emails_opened / campaign.emails_sent) * 100).toFixed(1);
  };

  const calculateClickRate = (campaign) => {
    if (!campaign.emails_sent || campaign.emails_sent === 0) return 0;
    return ((campaign.emails_clicked / campaign.emails_sent) * 100).toFixed(1);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-gray-600">Create and manage your email marketing campaigns</p>
        </div>
        <Link
          to="/campaigns/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Link>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Send className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first email campaign</p>
          <Link
            to="/campaigns/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      <strong>Subject:</strong> {campaign.subject}
                    </p>

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Recipients:</span> {formatNumber(campaign.total_recipients)}
                      </div>
                      <div>
                        <span className="font-medium">Sent:</span> {formatNumber(campaign.emails_sent)}
                      </div>
                      <div>
                        <span className="font-medium">Opens:</span> {formatNumber(campaign.emails_opened)} ({calculateOpenRate(campaign)}%)
                      </div>
                      <div>
                        <span className="font-medium">Clicks:</span> {formatNumber(campaign.emails_clicked)} ({calculateClickRate(campaign)}%)
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {new Date(campaign.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {campaign.scheduled_at && (
                      <div className="mt-2 text-sm text-blue-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Scheduled for {new Date(campaign.scheduled_at).toLocaleString()}
                      </div>
                    )}

                    {campaign.sent_at && (
                      <div className="mt-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Sent on {new Date(campaign.sent_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Eye className="h-5 w-5" />
                    </button>
                    
                    {campaign.status === 'draft' && (
                      <SendCampaignButton 
                        campaignId={campaign.id} 
                        onSuccess={refetch}
                      />
                    )}

                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <BarChart3 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar for Sent Campaigns */}
                {campaign.status === 'sent' && campaign.emails_sent > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Campaign Performance</span>
                      <span>{calculateOpenRate(campaign)}% open rate</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${calculateOpenRate(campaign)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Send Campaign Button Component
const SendCampaignButton = ({ campaignId, onSuccess }) => {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (window.confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
      setIsSending(true);
      try {
        await crmAPI.sendCampaign(campaignId);
        onSuccess();
      } catch (error) {
        console.error('Failed to send campaign:', error);
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={isSending}
      className="p-2 text-green-600 hover:text-green-800 disabled:opacity-50"
      title="Send Campaign"
    >
      {isSending ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
      ) : (
        <Play className="h-5 w-5" />
      )}
    </button>
  );
};

export default CampaignList;
