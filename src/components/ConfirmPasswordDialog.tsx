import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock, Loader2 } from 'lucide-react';

interface ConfirmPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => Promise<void>;
  title?: string;
  description?: string;
}

export const ConfirmPasswordDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar Senha",
  description = "Digite sua senha atual para continuar"
}: ConfirmPasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    try {
      setLoading(true);
      await onConfirm(password);
      setPassword('');
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Senha Atual</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha atual"
              required
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !password.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};