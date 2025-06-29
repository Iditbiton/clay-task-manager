import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function DatabaseDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      auth: {
        user: !!user,
        userProfile: !!userProfile,
        userId: user?.id,
        profileId: userProfile?.id,
      },
      tests: {}
    };

    try {
      // בדיקה 1: חיבור למסד נתונים
      console.log('🔍 Testing database connection...');
      try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        results.tests.dbConnection = { success: !error, error: error?.message, data };
      } catch (e: any) {
        results.tests.dbConnection = { success: false, error: e.message };
      }

      // בדיקה 2: בדיקת פרופיל משתמש
      if (user) {
        console.log('🔍 Testing user profile...');
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('supabase_uid', user.id);
          results.tests.userProfile = { success: !error, error: error?.message, data };
        } catch (e: any) {
          results.tests.userProfile = { success: false, error: e.message };
        }
      }

      // בדיקה 3: בדיקת טבלת organization_user
      if (userProfile) {
        console.log('🔍 Testing organization_user access...');
        try {
          const { data, error } = await supabase
            .from('organization_user')
            .select('*')
            .eq('user_id', userProfile.id);
          results.tests.organizationUser = { success: !error, error: error?.message, data };
        } catch (e: any) {
          results.tests.organizationUser = { success: false, error: e.message };
        }
      }

      // בדיקה 4: בדיקת טבלת organizations
      console.log('🔍 Testing organizations access...');
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .limit(5);
        results.tests.organizations = { success: !error, error: error?.message, data };
      } catch (e: any) {
        results.tests.organizations = { success: false, error: e.message };
      }

      // בדיקה 5: בדיקת RLS policies
      console.log('🔍 Testing RLS policies...');
      try {
        const { data, error } = await supabase.rpc('get_current_user_app_id');
        results.tests.rlsFunction = { success: !error, error: error?.message, data };
      } catch (e: any) {
        results.tests.rlsFunction = { success: false, error: e.message };
      }

    } catch (error: any) {
      results.error = error.message;
    }

    setDebugInfo(results);
    setLoading(false);
    console.log('🔍 Debug results:', results);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>מאבחן מסד נתונים</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDiagnostics} disabled={loading} className="mb-4">
          {loading ? 'בודק...' : 'הרץ אבחון'}
        </Button>
        
        {debugInfo && (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-bold mb-2">מידע אימות:</h3>
              <pre className="text-sm">{JSON.stringify(debugInfo.auth, null, 2)}</pre>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-bold mb-2">תוצאות בדיקות:</h3>
              <pre className="text-sm">{JSON.stringify(debugInfo.tests, null, 2)}</pre>
            </div>
            
            {debugInfo.error && (
              <div className="bg-red-100 p-4 rounded-lg">
                <h3 className="font-bold mb-2 text-red-800">שגיאה כללית:</h3>
                <pre className="text-sm text-red-700">{debugInfo.error}</pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}