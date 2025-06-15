
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, User, Building, Tag } from 'lucide-react';

interface TaskData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  due_datetime: string | null;
  notes: string | null;
  created_at: string;
  clients?: {
    name: string;
  } | null;
  categories?: {
    name: string;
  } | null;
  users?: {
    name: string | null;
    email: string;
  } | null;
}

interface TaskListProps {
  organizationId: string;
  onCreateTask: () => void;
}

export function TaskList({ organizationId, onCreateTask }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [organizationId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          description,
          status,
          due_datetime,
          notes,
          created_at,
          clients (name),
          categories (name),
          users (name, email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לטעון את המשימות",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'not_started': 'לא התחיל',
      'in_progress': 'בביצוע',
      'completed': 'הושלם',
      'paused': 'מושהה',
      'cancelled': 'בוטל'
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string) => {
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'not_started': 'outline',
      'in_progress': 'default',
      'completed': 'secondary',
      'paused': 'outline',
      'cancelled': 'destructive'
    };
    return variantMap[status] || 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">טוען משימות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">משימות</h2>
        <Button onClick={onCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          משימה חדשה
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">אין משימות עדיין</p>
            <Button onClick={onCreateTask}>צור משימה ראשונה</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    {task.description && (
                      <CardDescription className="mt-1">{task.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={getStatusVariant(task.status)}>
                    {getStatusText(task.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {task.due_datetime && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>תאריך יעד: {new Date(task.due_datetime).toLocaleDateString('he-IL')}</span>
                    </div>
                  )}
                  
                  {task.clients && (
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span>לקוח: {task.clients.name}</span>
                    </div>
                  )}
                  
                  {task.categories && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      <span>קטגוריה: {task.categories.name}</span>
                    </div>
                  )}
                  
                  {task.users && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>אחראי: {task.users.name || task.users.email}</span>
                    </div>
                  )}
                </div>
                
                {task.notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm">{task.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
