import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { 
  User, 
  Mail, 
  Calendar, 
  LogOut, 
  Edit3, 
  Check, 
  ArrowLeft,
  Camera,
  Lock,
  Sparkles,
  CreditCard,
  ArrowLeftRight,
  Target,
  Sun,
  Moon,
  Laptop,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTheme } from '@/components/theme-provider';
import { showSuccess, showError } from '@/utils/toast';

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces",
];

const ProfilePage = () => {
  const { user, profile, signOut, updateProfileDetails, updatePassword } = useAuth();
  const { banks, transactions } = useFinance();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Edição de informações básicas
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  // Alteração de senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatar data amigável
  const memberDate = profile?.createdAt ? new Date(profile.createdAt) : new Date();
  const formattedMemberDate = memberDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showError('O nome não pode estar em branco.');
      return;
    }
    setIsSaving(true);
    const { error } = await updateProfileDetails({
      name: name.trim(),
      bio: bio.trim(),
    });
    setIsSaving(false);
    if (!error) {
      setIsEditing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showError('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      await updateProfileDetails({ avatarUrl: base64Url });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = async (url: string) => {
    await updateProfileDetails({ avatarUrl: url });
  };

  const handleRemovePhoto = async () => {
    await updateProfileDetails({ avatarUrl: '' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('As senhas não coincidem.');
      return;
    }

    setIsChangingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsChangingPassword(false);

    if (!error) {
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordModalOpen(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto min-w-0 pb-20 md:pb-8">
        <MobileNav />

        <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
          
          {/* Header Superior */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-xl h-10 w-10 border-slate-200 dark:border-slate-800"
              >
                <ArrowLeft size={18} />
              </Button>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Meu Perfil
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Personalize suas informações e acompanhe sua trajetória financeira
                </p>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleLogout}
              className="rounded-xl flex items-center gap-2 shadow-sm text-xs sm:text-sm font-semibold"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sair da Conta</span>
            </Button>
          </div>

          {/* Banner do Perfil com Avatar Convidativo */}
          <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Capa com gradiente moderno */}
            <div className="h-32 sm:h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-primary relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md text-white text-xs font-medium">
                <Sparkles size={13} className="text-amber-300" />
                <span>Membro Finance.io</span>
              </div>
            </div>

            {/* Conteúdo do Perfil */}
            <div className="p-6 sm:p-8 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
                
                {/* Foto do Usuário com Botão de Upload */}
                <div className="relative group self-center sm:self-auto">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile?.name || "Foto de perfil"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white text-4xl font-black">
                        {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>

                  {/* Botão de Câmera para trocar foto */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Alterar foto de perfil"
                    className="absolute bottom-1 right-1 w-9 h-9 rounded-xl bg-primary text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                  >
                    <Camera size={16} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Botão de Editar Perfil */}
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="rounded-xl px-5 gap-1.5 font-semibold text-xs sm:text-sm"
                      >
                        <Check size={16} />
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setName(profile?.name || '');
                          setBio(profile?.bio || '');
                          setIsEditing(false);
                        }}
                        className="rounded-xl text-xs sm:text-sm"
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setName(profile?.name || '');
                        setBio(profile?.bio || '');
                        setIsEditing(true);
                      }}
                      className="rounded-xl gap-2 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800"
                    >
                      <Edit3 size={15} />
                      Editar Perfil
                    </Button>
                  )}
                </div>
              </div>

              {/* Informações Principais */}
              <div className="space-y-3">
                {isEditing ? (
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name">Nome de Exibição</Label>
                      <Input
                        id="edit-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo ou apelido"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-bio">Objetivo ou Frase de Inspiração</Label>
                      <Textarea
                        id="edit-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Ex: Focado em organizar minhas finanças e investir no futuro!"
                        className="rounded-xl resize-none h-20"
                      />
                    </div>

                    {/* Escolha rápida de fotos pré-definidas */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs text-slate-500">Ou escolha um avatar pré-definido:</Label>
                      <div className="flex items-center gap-2">
                        {AVATAR_PRESETS.map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPreset(presetUrl)}
                            className="w-10 h-10 rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all hover:scale-105"
                          >
                            <img src={presetUrl} alt="Avatar" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        {profile?.avatarUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePhoto}
                            className="text-xs text-rose-500 hover:text-rose-600 h-8 px-2"
                          >
                            Remover foto
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                      {profile?.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <Mail size={14} />
                      <span>{profile?.email}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={11} /> Verificado
                      </span>
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 italic max-w-xl">
                      "{profile?.bio || 'Construindo hábitos financeiros saudáveis todos os dias.'}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cards de Métricas e Engajamento do Usuário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Contas e Cartões */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <CreditCard size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {banks.length}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Contas & Cartões
                </p>
              </div>
            </Card>

            {/* Transações Registradas */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowLeftRight size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {transactions.length}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Lançamentos Feitos
                </p>
              </div>
            </Card>

            {/* Tempo de Uso / Membro */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {formattedMemberDate}
                </p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Membro Desde
                </p>
              </div>
            </Card>

          </div>

          {/* Configurações Pessoais & Segurança */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Preferências Visuais / Tema */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sun size={18} className="text-amber-500" />
                  Aparência do Aplicativo
                </CardTitle>
                <CardDescription className="text-xs">
                  Escolha como prefere visualizar suas telas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Sun size={20} className="mx-auto mb-1.5" />
                    <span className="text-xs">Claro</span>
                  </button>

                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Moon size={20} className="mx-auto mb-1.5" />
                    <span className="text-xs">Escuro</span>
                  </button>

                  <button
                    onClick={() => setTheme("system")}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      theme === "system"
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Laptop size={20} className="mx-auto mb-1.5" />
                    <span className="text-xs">Automático</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Segurança & Troca de Senha */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  Segurança da Conta
                </CardTitle>
                <CardDescription className="text-xs">
                  Mantenha seu acesso sempre seguro e protegido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-500">
                  Sua conta está protegida por criptografia de ponta a ponta. Você pode redefinir sua senha sempre que desejar.
                </p>

                <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800"
                    >
                      Alterar Senha de Acesso
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg">Alterar Minha Senha</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-pass">Nova Senha (mínimo 6 dígitos)</Label>
                        <Input
                          id="new-pass"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="rounded-xl"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-pass">Confirmar Nova Senha</Label>
                        <Input
                          id="confirm-pass"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="rounded-xl"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isChangingPassword}
                        className="w-full rounded-xl font-semibold"
                      >
                        {isChangingPassword ? "Alterando..." : "Confirmar Nova Senha"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

          </div>

        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
