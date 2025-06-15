
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';

interface OrganizationCardProps {
  id: string;
  name: string;
  role: string;
  onSelect: (orgId: string) => void;
}

export function OrganizationCard({ id, name, role, onSelect }: OrganizationCardProps) {
  return (
    <Card key={id} className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          {name}
        </CardTitle>
        <CardDescription>
          תפקיד: {role === 'owner' ? 'בעלים' : 'חבר'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => onSelect(id)} className="w-full">
          בחר ארגון זה
        </Button>
      </CardContent>
    </Card>
  );
}
