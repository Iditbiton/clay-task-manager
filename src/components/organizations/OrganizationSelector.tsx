
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;
type OrganizationUser = Tables<'organization_user'>;

interface OrganizationWithRole extends Organization {
  organization_user: OrganizationUser[];
}

interface OrganizationSelectorProps {
  onOrganizationSelect: (orgId: string) => void;
}

export function OrganizationSelector({ onOrganizationSelect }: OrganizationSelectorProps) {
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile) {
      fetchOrganizations();
    }
  }, [userProfile]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_user!inner (
            role,
            user_id
          )
        `)
        .eq('organization_user.user_id', userProfile?.id);

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן לטעון את הארגונים",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim() || !userProfile) return;
    
    setCreating(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: newOrgName.trim(),
          owner_id: userProfile.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as owner
      const { error: userOrgError } = await supabase
        .from('organization_user')
        .insert({
          organization_id: org.id,
          user_id: userProfile.id,
          role: 'owner'
        });

      if (userOrgError) throw userOrgError;

      toast({
        title: "ארגון נוצר בהצלחה!",
        description: `הארגון "${newOrgName}" נוצר והוספת כבעלים`,
      });

      setNewOrgName('');
      setShowCreateForm(false);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error.message || "לא ניתן ליצור את הארגון",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">טוען ארגונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">בחר ארגון</h1>
          <p className="text-gray-600">בחר ארגון קיים או צור ארגון חדש</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {org.name}
                </CardTitle>
                <CardDescription>
                  תפקיד: {org.organization_user[0]?.role === 'owner' ? 'בעלים' : 'חבר'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => onOrganizationSelect(org.id)}
                  className="w-full"
                >
                  בחר ארגון זה
                </Button>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed border-2 border-gray-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-600">
                <Plus className="h-5 w-5" />
                ארגון חדש
              </CardTitle>
              <CardDescription>צור ארגון חדש</CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateForm ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(true)}
                  className="w-full"
                >
                  צור ארגון חדש
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="orgName">שם הארגון</Label>
                    <Input
                      id="orgName"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="הכנס שם ארגון"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createOrganization} 
                      disabled={creating || !newOrgName.trim()}
                      size="sm"
                    >
                      צור
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewOrgName('');
                      }}
                      size="sm"
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
