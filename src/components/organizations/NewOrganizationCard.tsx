import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface NewOrganizationCardProps {
  creating: boolean;
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
  newOrgName: string;
  setNewOrgName: (n: string) => void;
  onCreate: () => void;
}

export function NewOrganizationCard({
  creating,
  showCreateForm,
  setShowCreateForm,
  newOrgName,
  setNewOrgName,
  onCreate
}: NewOrganizationCardProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrgName.trim() && !creating) {
      onCreate();
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setNewOrgName('');
  };

  return (
    <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-600">
          <Plus className="h-5 w-5" />
          ארגון חדש
        </CardTitle>
        <CardDescription>צור ארגון חדש לניהול משימות</CardDescription>
      </CardHeader>
      <CardContent>
        {!showCreateForm ? (
          <Button 
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="w-full"
            disabled={creating}
          >
            צור ארגון חדש
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="orgName">שם הארגון</Label>
              <Input
                id="orgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="הכנס שם ארגון"
                disabled={creating}
                required
                minLength={2}
                maxLength={100}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit"
                disabled={creating || !newOrgName.trim()}
                size="sm"
                className="flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? 'יוצר...' : 'צור'}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={handleCancel}
                size="sm"
                disabled={creating}
              >
                ביטול
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}