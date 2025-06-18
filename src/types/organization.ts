
import type { Tables } from '@/integrations/supabase/types';

export type Organization = Tables<'organizations'>;

export interface OrganizationWithRole extends Organization {
  role: string;
}
