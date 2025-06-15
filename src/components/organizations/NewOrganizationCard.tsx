
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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
  return (
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
                onClick={onCreate}
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
  )
}
