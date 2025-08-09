import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Pattern {
  id: string;
  type: 'entrada' | 'saida';
  pattern_type: 'description' | 'category';
  value: string;
}

export function PatternsManager() {
  const [selectedType, setSelectedType] = useState<'entrada' | 'saida'>('entrada');
  const [descriptionPattern, setDescriptionPattern] = useState('');
  const [categoryPattern, setCategoryPattern] = useState('');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [searchDescription, setSearchDescription] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadPatterns();
    }
  }, [user, selectedType]);

  const loadPatterns = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('patterns')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', selectedType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading patterns:', error);
      return;
    }

    setPatterns((data || []) as Pattern[]);
  };

  const saveDescriptionPattern = async () => {
    if (!user || !descriptionPattern.trim()) return;

    const { error } = await supabase
      .from('patterns')
      .insert({
        user_id: user.id,
        type: selectedType,
        pattern_type: 'description',
        value: descriptionPattern.trim()
      });

    if (error) {
      console.error('Error saving description pattern:', error);
      toast.error('Erro ao salvar padrão de descrição');
      return;
    }

    setDescriptionPattern('');
    loadPatterns();
    toast.success('Padrão de descrição salvo com sucesso');
  };

  const saveCategoryPattern = async () => {
    if (!user || !categoryPattern.trim()) return;

    const { error } = await supabase
      .from('patterns')
      .insert({
        user_id: user.id,
        type: selectedType,
        pattern_type: 'category',
        value: categoryPattern.trim()
      });

    if (error) {
      console.error('Error saving category pattern:', error);
      toast.error('Erro ao salvar padrão de categoria');
      return;
    }

    setCategoryPattern('');
    loadPatterns();
    toast.success('Padrão de categoria salvo com sucesso');
  };

  const deletePattern = async (patternId: string) => {
    const { error } = await supabase
      .from('patterns')
      .delete()
      .eq('id', patternId);

    if (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Erro ao excluir padrão');
      return;
    }

    loadPatterns();
    toast.success('Padrão excluído com sucesso');
  };

  const descriptionPatterns = patterns.filter(p => p.pattern_type === 'description');
  const categoryPatterns = patterns.filter(p => p.pattern_type === 'category');

  const filteredDescriptionPatterns = descriptionPatterns.filter(p =>
    p.value.toLowerCase().includes(searchDescription.toLowerCase())
  );

  const filteredCategoryPatterns = categoryPatterns.filter(p =>
    p.value.toLowerCase().includes(searchCategory.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Label htmlFor="type">Tipo de Padrão</Label>
        <Select value={selectedType} onValueChange={(value: 'entrada' | 'saida') => setSelectedType(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Descrições */}
        <Card>
          <CardHeader>
            <CardTitle>Padrões de Descrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description-pattern">Nova Descrição</Label>
              <Input
                id="description-pattern"
                value={descriptionPattern}
                onChange={(e) => setDescriptionPattern(e.target.value)}
                placeholder="Digite uma descrição padrão"
              />
              <Button onClick={saveDescriptionPattern} className="w-full">
                Salvar Padrão de Descrição
              </Button>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar descrições..."
                  value={searchDescription}
                  onChange={(e) => setSearchDescription(e.target.value)}
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                {filteredDescriptionPatterns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Não há padrões criados.
                  </p>
                ) : (
                  filteredDescriptionPatterns.map((pattern) => (
                    <div key={pattern.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{pattern.value}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePattern(pattern.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categorias */}
        <Card>
          <CardHeader>
            <CardTitle>Padrões de Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-pattern">Nova Categoria</Label>
              <Input
                id="category-pattern"
                value={categoryPattern}
                onChange={(e) => setCategoryPattern(e.target.value)}
                placeholder="Digite uma categoria padrão"
              />
              <Button onClick={saveCategoryPattern} className="w-full">
                Salvar Padrão de Categoria
              </Button>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar categorias..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                {filteredCategoryPatterns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Não há padrões criados.
                  </p>
                ) : (
                  filteredCategoryPatterns.map((pattern) => (
                    <div key={pattern.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{pattern.value}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deletePattern(pattern.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}