
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, cleanupAuthState } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.warn('Pre-login signOut failed, continuing...', err);
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          toast({
            title: "התחברת בהצלחה!",
            description: "ברוך הבא למערכת ניהול המשימות",
          });
          window.location.href = '/';
        }
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: name,
            }
          }
        });

        if (error) throw error;

        setSignupSuccess(true);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error.message || "אירעה שגיאה במהלך ההתחברות",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {signupSuccess ? 'ההרשמה כמעט הושלמה' : (isLogin ? 'התחברות' : 'הרשמה')}
          </CardTitle>
          <CardDescription>
            {signupSuccess 
              ? 'שלחנו לך מייל לאימות החשבון' 
              : (isLogin 
                  ? 'התחבר למערכת ניהול המשימות' 
                  : 'צור חשבון חדש במערכת ניהול המשימות'
                )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signupSuccess ? (
            <div className="text-center space-y-4 py-4">
              <h3 className="text-xl font-semibold">אנא בדוק את תיבת המייל שלך</h3>
              <p className="text-gray-600">
                שלחנו קישור אימות לכתובת <strong>{email}</strong>.
              </p>
              <p className="text-gray-600">
                יש ללחוץ על הקישור כדי להפעיל את חשבונך. לאחר האימות, תוכל להתחבר.
              </p>
              <Button 
                onClick={() => {
                  setSignupSuccess(false);
                  setIsLogin(true);
                }}
                className="w-full"
              >
                חזרה למסך ההתחברות
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">שם מלא</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      placeholder="הכנס את שמך המלא"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="הכנס את כתובת האימייל שלך"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">סיסמה</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="הכנס סיסמה"
                    minLength={6}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? 'התחבר' : 'הירשם'}
                </Button>
              </form>
              
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setSignupSuccess(false);
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {isLogin 
                    ? 'אין לך חשבון? הירשם כאן' 
                    : 'יש לך כבר חשבון? התחבר כאן'
                  }
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
