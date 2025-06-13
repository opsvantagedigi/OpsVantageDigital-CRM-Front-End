import React from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  UserPlus, 
  Target, 
  DollarSign, 
  Mail, 
  Zap,
  TrendingUp,
  Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { crmAPI } from '../api';

const Dashboard = () => {
  const { data: dashboardStats, isLoading: statsLoading } = useQuery(
    'dashboardStats',
    crmAPI.getDashboardStats
  );

  const { data: leadSources, isLoading: sourcesLoading } = useQuery(
    'leadSources',
    crmAPI.getLeadSourceStats
  );

  const { data: contactStatus, isLoading: statusLoading } = useQuery(
    'contactStatus',
    crmAPI.getContactStatusStats
  );

  const { data: recentActivity, isLoading: activityLoading } = useQuery(
    'recentActivity',
    () => crmAPI.getRecentActivity(5)
  );

  const stats = dashboardStats?.data || {};
  const sources = leadSources?.data || [];
  const statuses = contactStatus?.data || [];
  const activities = recentActivity?.data || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const StatCard = ({ title, value, icon: Icon, change, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600 border-blue-200",
      green: "bg-green-50 text-green-600 border-green-200",
      yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200"
    };

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <p className="text-sm text-green-600 flex items-center mt-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                {change}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Contacts"
          value={stats.total_contacts || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="New This Month"
          value={stats.new_contacts_this_month || 0}
          icon={UserPlus}
          change="+12%"
          color="green"
        />
        <StatCard
          title="Qualified Leads"
          value={stats.qualified_leads || 0}
          icon={Target}
          color="yellow"
        />
        <StatCard
          title="Customers"
          value={stats.customers || 0}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Email Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Campaigns"
          value={stats.total_campaigns || 0}
          icon={Mail}
          color="blue"
        />
        <StatCard
          title="Active Automations"
          value={stats.active_automations || 0}
          icon={Zap}
          color="green"
        />
        <StatCard
          title="Avg Open Rate"
          value={`${stats.avg_open_rate || 0}%`}
          icon={TrendingUp}
          color="yellow"
        />
        <StatCard
          title="Avg Click Rate"
          value={`${stats.avg_click_rate || 0}%`}
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Sources Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
          {!sourcesLoading && sources.length > 0 ? (
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
              No data available
            </div>
          )}
        </div>

        {/* Contact Status Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Status</h3>
          {!statusLoading && statuses.length > 0 ? (
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
              No data available
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {!activityLoading && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.contact_name} • {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-5 w-5 mr-2" />
            Add Contact
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
            <Mail className="h-5 w-5 mr-2" />
            Create Campaign
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
            <Zap className="h-5 w-5 mr-2" />
            New Sequence
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
