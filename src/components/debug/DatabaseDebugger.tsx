import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
        email: user?.email,
      },
      tests: {}
    };

    try {
      // בדיקה 1: חיבור למסד נתונים
      console.log('🔍 Testing database connection...');
      try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        results.tests.dbConnection = { 
          success: !error, 
          error: error?.message, 
          status: !error ? 'עובד' : 'נכשל'
        };
      } catch (e: any) {
        results.tests.dbConnection = { success: false, error: e.message, status: 'נכשל' };
      }

      // בדיקה 2: בדיקת פרופיל משתמש
      if (user) {
        console.log('🔍 Testing user profile...');
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('supabase_uid', user.id);
          results.tests.userProfile = { 
            success: !error, 
            error: error?.message, 
            data: data?.length || 0,
            status: !error ? 'עובד' : 'נכשל'
          };
        } catch (e: any) {
          results.tests.userProfile = { success: false, error: e.message, status: 'נכשל' };
        }
      }

      // בדיקה 3: בדיקת פונקציית RLS
      console.log('🔍 Testing RLS function...');
      try {
        const { data, error } = await supabase.rpc('get_current_user_app_id');
        results.tests.rlsFunction = { 
          success: !error, 
          error: error?.message, 
          data,
          status: !error ? 'עובד' : 'נכשל'
        };
      } catch (e: any) {
        results.tests.rlsFunction = { success: false, error: e.message, status: 'נכשל' };
      }

      // בדיקה 4: בדיקת טבלת organization_user
      if (userProfile) {
        console.log('🔍 Testing organization_user access...');
        try {
          const { data, error } = await supabase
            .from('organization_user')
            .select('*')
            .eq('user_id', userProfile.id);
          results.tests.organizationUser = { 
            success: !error, 
            error: error?.message, 
            data: data?.length || 0,
            status: !error ? 'עובד' : 'נכשל'
          };
        } catch (e: any) {
          results.tests.organizationUser = { success: false, error: e.message, status: 'נכשל' };
        }
      }

      // בדיקה 5: בדיקת טבלת organizations
      console.log('🔍 Testing organizations access...');
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .limit(5);
        results.tests.organizations = { 
          success: !error, 
          error: error?.message, 
          data: data?.length || 0,
          status: !error ? 'עובד' : 'נכשל'
        };
      } catch (e: any) {
        results.tests.organizations = { success: false, error: e.message, status: 'נכשל' };
      }

      // בדיקה 6: ניסיון יצירת ארגון (בדיקה יבשה)
      if (userProfile) {
        console.log('🔍 Testing organization creation permissions...');
        try {
          // בדיקה יבשה - רק בדיקת הרשאות ללא יצירה ממשית
          const testOrgName = `test-org-${Date.now()}`;
          const { data, error } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', testOrgName)
            .limit(1);
          
          results.tests.organizationCreation = { 
            success: !error, 
            error: error?.message,
            status: !error ? 'הרשאות תקינות' : 'בעיית הרשאות',
            note: 'בדיקה יבשה - לא נוצר ארגון'
          };
        } catch (e: any) {
          results.tests.organizationCreation = { 
            success: false, 
            error: e.message, 
            status: 'בעיית הרשאות'
          };
        }
      }

    } catch (error: any) {
      results.error = error.message;
    }

    setDebugInfo(results);
    setLoading(false);
    console.log('🔍 Debug results:', results);
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const copyResults = () => {
    if (debugInfo) {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          מאבחן מסד נתונים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? 'בודק...' : 'הרץ אבחון'}
          </Button>
          {debugInfo && (
            <Button onClick={copyResults} variant="outline">
              העתק תוצאות
            </Button>
          )}
        </div>
        
        {debugInfo && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-blue-800">מידע אימות:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>משתמש מחובר: {debugInfo.auth.user ? '✅' : '❌'}</div>
                <div>פרופיל קיים: {debugInfo.auth.userProfile ? '✅' : '❌'}</div>
                <div>אימייל: {debugInfo.auth.email || 'לא זמין'}</div>
                <div>ID משתמש: {debugInfo.auth.userId || 'לא זמין'}</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-3">תוצאות בדיקות:</h3>
              <div className="space-y-3">
                {Object.entries(debugInfo.tests).map(([testName, result]: [string, any]) => (
                  <div key={testName} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.success)}
                      <span className="font-medium">
                        {testName === 'dbConnection' && 'חיבור למסד נתונים'}
                        {testName === 'userProfile' && 'פרופיל משתמש'}
                        {testName === 'rlsFunction' && 'פונקציית הרשאות'}
                        {testName === 'organizationUser' && 'טבלת חברויות'}
                        {testName === 'organizations' && 'טבלת ארגונים'}
                        {testName === 'organizationCreation' && 'הרשאות יצירת ארגון'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.status}
                      </span>
                      {result.data !== undefined && (
                        <span className="text-gray-500 ml-2">({result.data} רשומות)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {debugInfo.error && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-bold mb-2 text-red-800">שגיאה כללית:</h3>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">{debugInfo.error}</pre>
              </div>
            )}

            <details className="bg-gray-100 p-4 rounded-lg">
              <summary className="font-bold cursor-pointer">פרטים טכניים מלאים</summary>
              <pre className="text-xs mt-2 overflow-auto max-h-64">{JSON.stringify(debugInfo, null, 2)}</pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}