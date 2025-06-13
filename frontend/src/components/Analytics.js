import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Mail, 
  Target,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { crmAPI } from '../api';

const Analytics = () => {
  const [dateRange, setDateRange] = useState('30');
  
  const { data: dashboardStats } = useQuery('dashboardStats', crmAPI.getDashboardStats);
  const { data: leadSources } = useQuery('leadSources', crmAPI.getLeadSourceStats);
  const { data: contactStatus } = useQuery('contactStatus', crmAPI.getContactStatusStats);

  const stats = dashboardStats?.data || {};
  const sources = leadSources?.data || [];
  const statuses = contactStatus?.data || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

  // Mock data for additional charts
  const campaignPerformance = [
    { name: 'Newsletter #1', sent: 1250, opened: 750, clicked: 125 },
    { name: 'Promo Campaign', sent: 890, opened: 445, clicked: 89 },
    { name: 'Welcome Series', sent: 650, opened: 520, clicked: 104 },
    { name: 'Follow-up #2', sent: 420, opened: 210, clicked: 42 },
  ];

  const engagementTrends = [
    { date: '2024-01-01', opens: 65, clicks: 12, unsubscribes: 2 },
    { date: '2024-01-02', opens: 78, clicks: 15, unsubscribes: 1 },
    { date: '2024-01-03', opens: 85, clicks: 18, unsubscribes: 3 },
    { date: '2024-01-04', opens: 72, clicks: 14, unsubscribes: 1 },
    { date: '2024-01-05', opens: 90, clicks: 22, unsubscribes: 2 },
    { date: '2024-01-06', opens: 68, clicks: 16, unsubscribes: 4 },
    { date: '2024-01-07', opens: 95, clicks: 25, unsubscribes: 1 },
  ];

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue" }) => {
    const colorClasses = {
      blue: "text-blue-600 bg-blue-100",
      green: "text-green-600 bg-green-100",
      yellow: "text-yellow-600 bg-yellow-100",
      red: "text-red-600 bg-red-100",
      purple: "text-purple-600 bg-purple-100"
    };

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            {change && (
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">{change}</span>
                <span className="text-sm text-gray-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your CRM and email marketing performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Contacts"
          value={stats.total_contacts || 0}
          change="+12%"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Qualified Leads"
          value={stats.qualified_leads || 0}
          change="+8%"
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Total Campaigns"
          value={stats.total_campaigns || 0}
          change="+3"
          icon={Mail}
          color="yellow"
        />
        <MetricCard
          title="Avg Open Rate"
          value={`${stats.avg_open_rate || 0}%`}
          change="+2.1%"
          icon={BarChart3}
          color="purple"
        />
        <MetricCard
          title="Avg Click Rate"
          value={`${stats.avg_click_rate || 0}%`}
          change="+0.8%"
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Sources */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
          {sources.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source, percentage }) => `${source}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {sources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No lead source data available
            </div>
          )}
        </div>

        {/* Contact Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Status</h3>
          {statuses.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statuses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No status data available
            </div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={campaignPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sent" fill="#e5e7eb" name="Sent" />
              <Bar dataKey="opened" fill="#3b82f6" name="Opened" />
              <Bar dataKey="clicked" fill="#10b981" name="Clicked" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trends */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Engagement Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={engagementTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="opens" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
              <Area type="monotone" dataKey="clicks" stackId="1" stroke="#10b981" fill="#10b981" />
              <Area type="monotone" dataKey="unsubscribes" stackId="1" stroke="#ef4444" fill="#ef4444" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Email Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Performance Breakdown</h3>
          <div className="space-y-6">
            {campaignPerformance.map((campaign, index) => {
              const openRate = ((campaign.opened / campaign.sent) * 100).toFixed(1);
              const clickRate = ((campaign.clicked / campaign.sent) * 100).toFixed(1);
              const clickToOpenRate = ((campaign.clicked / campaign.opened) * 100).toFixed(1);
              
              return (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                    <span className="text-sm text-gray-500">{campaign.sent} sent</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Open Rate</span>
                      <div className="font-semibold text-blue-600">{openRate}%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Click Rate</span>
                      <div className="font-semibold text-green-600">{clickRate}%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Click-to-Open</span>
                      <div className="font-semibold text-purple-600">{clickToOpenRate}%</div>
                    </div>
                  </div>
                  
                  {/* Progress bars */}
                  <div className="mt-2 space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full" 
                        style={{ width: `${openRate}%` }}
                      ></div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-green-600 h-1.5 rounded-full" 
                        style={{ width: `${clickRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Summary Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Performance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Click Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaignPerformance.map((campaign, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(campaign.sent * 0.98).toFixed(0)} {/* Mock delivered rate */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.opened.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.clicked.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {((campaign.opened / campaign.sent) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {((campaign.clicked / campaign.sent) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Insights & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🎯 Lead Quality</h4>
            <p className="text-sm text-blue-800">
              Your referral leads have the highest conversion rate. Consider implementing a referral program to increase this high-quality source.
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">📧 Email Performance</h4>
            <p className="text-sm text-green-800">
              Your welcome series has a 80% open rate! Consider using similar personalization techniques in other campaigns.
            </p>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">⏰ Optimal Send Times</h4>
            <p className="text-sm text-yellow-800">
              Emails sent on Tuesday-Thursday between 10-11 AM show 23% higher engagement rates.
            </p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">🚀 Growth Opportunity</h4>
            <p className="text-sm text-purple-800">
              You have 45% of contacts in "qualified" status. Create targeted campaigns to move them to "engaged" status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
