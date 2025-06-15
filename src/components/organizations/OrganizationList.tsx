
import React from 'react';
import { OrganizationCard } from './OrganizationCard';

interface OrganizationListProps {
  organizations: {id: string, name: string, role: string}[];
  onOrganizationSelect: (orgId: string) => void;
}

export function OrganizationList({ organizations, onOrganizationSelect }: OrganizationListProps) {
  return (
    <>
      {organizations.map(org =>
        <OrganizationCard
          key={org.id}
          id={org.id}
          name={org.name}
          role={org.role}
          onSelect={onOrganizationSelect}
        />
      )}
    </>
  );
}
