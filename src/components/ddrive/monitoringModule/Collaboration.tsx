import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Users, MessageSquare, Calendar, CheckSquare } from 'lucide-react';

const Collaboration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('team');

  const team = [
    { id: 1, name: 'Maria Santos', role: 'Risk Officer', status: 'online', tasks: 12 },
    { id: 2, name: 'Juan dela Cruz', role: 'Compliance Manager', status: 'online', tasks: 8 },
    { id: 3, name: 'Ana Reyes', role: 'DRRM Coordinator', status: 'away', tasks: 15 },
    { id: 4, name: 'Pedro Garcia', role: 'Business Continuity Lead', status: 'offline', tasks: 6 },
  ];

  const tasks = [
    { id: 1, title: 'Update DRRM Plan Section 3', assignee: 'Maria Santos', dueDate: '2025-02-10', priority: 'High' },
    { id: 2, title: 'Review ISO 31000 Compliance', assignee: 'Juan dela Cruz', dueDate: '2025-02-15', priority: 'Medium' },
    { id: 3, title: 'Conduct Risk Assessment Workshop', assignee: 'Ana Reyes', dueDate: '2025-02-08', priority: 'High' },
    { id: 4, title: 'Test Recovery Procedures', assignee: 'Pedro Garcia', dueDate: '2025-02-20', priority: 'Low' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header title="Team Collaboration" />
        <main className="p-6">
          <div className="flex gap-4 mb-6">
            {['team', 'tasks', 'messages'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'team' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map(member => (
                <div key={member.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{member.name}</h4>
                      <p className="text-xs text-gray-600">{member.role}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      member.status === 'online' ? 'bg-green-500' :
                      member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active Tasks</span>
                    <span className="font-semibold text-gray-900">{member.tasks}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Task Management</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  + New Task
                </button>
              </div>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <CheckSquare className="text-gray-400" size={20} />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600">Assigned to {task.assignee}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-sm text-gray-600">{task.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Team Messages</h3>
              <div className="space-y-4">
                <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">MS</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-900">Maria Santos</span>
                      <span className="text-xs text-gray-500">10:30 AM</span>
                    </div>
                    <p className="text-sm text-gray-700">Updated the DRRM plan with latest hazard data from GeomapperPH</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Collaboration;
