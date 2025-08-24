'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, TrendingUp, Search, Filter, Download, Eye, Check, X } from 'lucide-react';

interface Registration {
  _id: string;
  userId: string;
  username: string;
  ingameName: string;
  mailId: string;
  functionId: string;
  functionName: string;
  invitedBy: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  deniedReason?: string;
  registeredAt: string;
  metadata?: {
    discordAvatar?: string;
    discordDiscriminator?: string;
    assignedRoles?: string[];
  };
}

interface Statistics {
  total: number;
  approved: number;
  pending: number;
  byFunction: { functionName: string; count: number }[];
  recentRegistrations: Registration[];
}

export default function RegistrationAnalytics() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      const userCookie = getCookie('discord_user');
      if (!userCookie) {
        console.error('Not authenticated');
        return;
      }

      // Fetch registrations
      const params = new URLSearchParams();
      if (filter === 'approved') params.append('approved', 'true');
      if (filter === 'pending') params.append('approved', 'false');

      const [regsResponse, statsResponse] = await Promise.all([
        fetch(`http://localhost:3050/api/registration/list?${params}`, {
          headers: { 'Authorization': `Bearer ${userCookie}` }
        }),
        fetch('http://localhost:3050/api/registration/stats', {
          headers: { 'Authorization': `Bearer ${userCookie}` }
        })
      ]);

      if (regsResponse.ok) {
        const regsData = await regsResponse.json();
        setRegistrations(regsData);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (userId: string) => {
    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      const userCookie = getCookie('discord_user');

      const response = await fetch(`http://localhost:3050/api/registration/approve/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userCookie}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Registration approved successfully!');
        fetchData();
      } else {
        alert('Failed to approve registration');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Error approving registration');
    }
  };

  const denyRegistration = async (userId: string) => {
    const reason = prompt('Please provide a reason for denial:');
    if (!reason) return;

    try {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      const userCookie = getCookie('discord_user');

      const response = await fetch(`http://localhost:3050/api/registration/deny/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userCookie}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('Registration denied');
        fetchData();
      } else {
        alert('Failed to deny registration');
      }
    } catch (error) {
      console.error('Error denying registration:', error);
      alert('Error denying registration');
    }
  };

  const exportData = () => {
    const csv = [
      ['Username', 'In-Game Name', 'Mail ID', 'Function', 'Invited By', 'Status', 'Registered At'],
      ...registrations.map(r => [
        r.username,
        r.ingameName,
        r.mailId,
        r.functionName,
        r.invitedBy,
        r.approved ? 'Approved' : 'Pending',
        new Date(r.registeredAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredRegistrations = registrations.filter(r => 
    r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.ingameName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.functionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invitedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading registrations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{statistics.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approval Rate</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {statistics.total > 0 ? Math.round((statistics.approved / statistics.total) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-500" />
            </div>
          </div>
        </div>
      )}

      {/* Function Distribution */}
      {statistics && statistics.byFunction.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrations by Function</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statistics.byFunction.map(({ functionName, count }) => (
              <div key={functionName} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-500">{functionName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registrations Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">All Registrations</h3>
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search registrations..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>

            {/* Export */}
            <button
              onClick={exportData}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In-Game Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mail ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Function</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invited By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistrations.map((reg) => (
                <tr key={reg._id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {reg.metadata?.discordAvatar && (
                        <img
                          src={`https://cdn.discordapp.com/avatars/${reg.userId}/${reg.metadata.discordAvatar}.png`}
                          alt={reg.username}
                          className="h-8 w-8 rounded-full mr-2"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{reg.username}</div>
                        <div className="text-xs text-gray-500">#{reg.metadata?.discordDiscriminator || '0000'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{reg.ingameName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{reg.mailId}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                      {reg.functionName}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{reg.invitedBy}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {reg.approved ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(reg.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRegistration(reg)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!reg.approved && (
                        <>
                          <button
                            onClick={() => approveRegistration(reg.userId)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => denyRegistration(reg.userId)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No registrations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Discord User</p>
                    <p className="font-medium">{selectedRegistration.username}#{selectedRegistration.metadata?.discordDiscriminator || '0000'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-medium font-mono text-sm">{selectedRegistration.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">In-Game Name</p>
                    <p className="font-medium">{selectedRegistration.ingameName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Mail ID</p>
                    <p className="font-medium">{selectedRegistration.mailId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Function/Role</p>
                    <p className="font-medium">{selectedRegistration.functionName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Invited By</p>
                    <p className="font-medium">{selectedRegistration.invitedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registration Date</p>
                    <p className="font-medium">{new Date(selectedRegistration.registeredAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-medium">{selectedRegistration.approved ? 'Approved' : 'Pending'}</p>
                  </div>
                  {selectedRegistration.approvedBy && (
                    <div>
                      <p className="text-sm text-gray-500">Approved By</p>
                      <p className="font-medium">{selectedRegistration.approvedBy}</p>
                    </div>
                  )}
                  {selectedRegistration.approvedAt && (
                    <div>
                      <p className="text-sm text-gray-500">Approved At</p>
                      <p className="font-medium">{new Date(selectedRegistration.approvedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedRegistration.deniedReason && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Denial Reason</p>
                      <p className="font-medium text-red-600">{selectedRegistration.deniedReason}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedRegistration(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}