
import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TaskList } from '@/components/tasks/TaskList';
import { CreateTaskForm } from '@/components/tasks/CreateTaskForm';

interface DashboardProps {
  organizationId: string;
}

export function Dashboard({ organizationId }: DashboardProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTaskCreated = () => {
    setShowCreateForm(false);
    // TaskList will refresh automatically
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCreateForm ? (
          <CreateTaskForm
            organizationId={organizationId}
            onSuccess={handleTaskCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : (
          <TaskList
            organizationId={organizationId}
            onCreateTask={() => setShowCreateForm(true)}
          />
        )}
      </main>
    </div>
  );
}
