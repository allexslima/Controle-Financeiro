import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  LogOut, 
  Edit3, 
  Check, 
  Copy, 
  Database,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';

const USER_ISOLATION_SQL = `-- Comando opcional para isolar os dados por perfil no Supabase:
ALTER TABLE banks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Atualizar políticas de segurança (RLS) para que cada usuário só veja seus próprios dados:
DROP POLICY IF EXISTS "Acesso total a banks" ON banks;
DROP POLICY IF EXISTS "Acesso total a categories" ON categories;
DROP POLICY IF EXISTS "Acesso total a transactions" ON transactions;

CREATE POLICY "Usuário vê apenas seus banks" ON banks 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário vê apenas suas categories" ON categories 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário vê apenas suas transactions" ON transactions 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

const ProfilePage = () => {
  const { user, profile, signOut, updateProfileName } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) {
      showError('O nome não pode estar em branco.');
      return;
    }
    setIsSaving(true);
    const { error } = await updateProfileName(name.trim());
    setIsSaving(false);
    if (!error) {
      setIsEditing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(USER_ISOLATION_SQL);
    setCopiedSql(true);
    showSuccess('SQL copiado para a área de transferência!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 pb-20 md:pb-6">
        <MobileNav />

        <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-xl h-10 w-10"
              >
                <ArrowLeft size={18} />
              </Button>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Perfil de Usuário
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gerencie sua conta e as preferências de segurança dos seus dados
                </p>
              </div>
            </div>

            {user && (
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="rounded-xl flex items-center gap-2"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair da Conta</span>
              </Button>
            )}
          </div>

          {!user ? (
            /* Banner para usuário não logado */
            <Card className="rounded-2xl border-dashed border-2">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                  <User size={28} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Você está navegando como convidado
                  </h3>
                  <p className="text-sm text-slate-500">
                    Crie um login próprio ou entre na sua conta para manter suas finanças salvas exclusivamente para você na nuvem com segurança.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/auth')}
                  className="rounded-xl px-6 py-5 font-semibold"
                >
                  Criar Novo Perfil / Fazer Login
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Dados do Perfil Autenticado */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card Resumo do Perfil */}
              <Card className="rounded-2xl md:col-span-1 shadow-sm border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-tr from-primary to-indigo-500 rounded-3xl flex items-center justify-center text-white text-2xl font-black mx-auto shadow-lg shadow-primary/25">
                    {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {profile?.name}
                    </h3>
                    <p className="text-xs text-slate-400 break-all">
                      {profile?.email}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span>Perfil Ativo no Supabase</span>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Detalhes e Edição */}
              <div className="md:col-span-2 space-y-6">
                <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield size={18} className="text-primary" />
                      Informações da Conta
                    </CardTitle>
                    <CardDescription>
                      Seus dados de autenticação cadastrados no Supabase
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nome do Perfil</Label>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="rounded-xl"
                            placeholder="Seu nome"
                          />
                          <Button
                            onClick={handleSaveName}
                            disabled={isSaving}
                            className="rounded-xl"
                          >
                            <Check size={16} className="mr-1" />
                            {isSaving ? "Salvando..." : "Salvar"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setName(profile?.name || '');
                              setIsEditing(false);
                            }}
                            className="rounded-xl"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            {profile?.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                            className="h-8 rounded-lg text-xs gap-1"
                          >
                            <Edit3 size={13} />
                            Editar Nome
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>E-mail de Login</Label>
                      <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Mail size={16} className="text-slate-400" />
                        <span>{profile?.email}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>ID do Usuário (UID)</Label>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-500 break-all">
                        {user.id}
                      </div>
                    </div>

                    {profile?.createdAt && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                        <Calendar size={14} />
                        <span>Perfil criado em: {new Date(profile.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card de Segurança Avançada (Isolamento por Perfil) */}
                <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database size={16} className="text-primary" />
                      Segurança e Isolamento por Perfil (RLS)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Para que cada novo perfil tenha uma visão 100% privada e isolada no banco Supabase, você pode rodar este script no SQL Editor:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-xs overflow-x-auto max-h-48 font-mono">
                        {USER_ISOLATION_SQL}
                      </pre>
                      <Button
                        size="sm"
                        onClick={handleCopySql}
                        className="absolute top-2 right-2 h-7 text-xs flex items-center gap-1"
                      >
                        {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                        {copiedSql ? "Copiado!" : "Copiar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
