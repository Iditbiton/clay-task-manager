
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;
type Category = Tables<'categories'>;
type User = Tables<'users'>;

interface CreateTaskFormProps {
  organizationId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateTaskForm({ organizationId, onSuccess, onCancel }: CreateTaskFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'not_started',
    due_datetime: '',
    client_id: '',
    category_id: '',
    assigned_to_user_id: '',
    notes: '',
    color_hex: '#3B82F6',
    is_ongoing: false
  });
  
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId);

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organizationId);

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch organization users
      const { data: usersData, error: usersError } = await supabase
        .from('organization_user')
        .select(`
          users (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId);

      if (usersError) throw usersError;
      const orgUsers = usersData?.map(item => item.users).filter(Boolean) || [];
      setUsers(orgUsers as User[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לטעון נתונים",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    try {
      const taskData = {
        ...formData,
        organization_id: organizationId,
        client_id: formData.client_id || null,
        category_id: formData.category_id || null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        due_datetime: formData.due_datetime || null,
      };

      const { error } = await supabase
        .from('tasks')
        .insert(taskData);

      if (error) throw error;

      toast({
        title: "משימה נוצרה בהצלחה!",
        description: `המשימה "${formData.name}" נוספה למערכת`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error.message || "לא ניתן ליצור את המשימה",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>משימה חדשה</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם המשימה *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="הכנס שם משימה"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="תיאור המשימה"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">לא התחיל</SelectItem>
                  <SelectItem value="in_progress">בביצוע</SelectItem>
                  <SelectItem value="completed">הושלם</SelectItem>
                  <SelectItem value="paused">מושהה</SelectItem>
                  <SelectItem value="cancelled">בוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_datetime">תאריך יעד</Label>
              <Input
                id="due_datetime"
                type="datetime-local"
                value={formData.due_datetime}
                onChange={(e) => setFormData({ ...formData, due_datetime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">לקוח</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר לקוח" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">קטגוריה</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to_user_id">אחראי</Label>
            <Select value={formData.assigned_to_user_id} onValueChange={(value) => setFormData({ ...formData, assigned_to_user_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="בחר אחראי" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות נוספות"
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'יוצר...' : 'צור משימה'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
