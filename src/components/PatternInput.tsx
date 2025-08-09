import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Pattern {
  id: string;
  value: string;
}

interface PatternInputProps {
  type: 'entrada' | 'saida';
  patternType: 'description' | 'category';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function PatternInput({ type, patternType, value, onChange, placeholder, className }: PatternInputProps) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredPatterns, setFilteredPatterns] = useState<Pattern[]>([]);
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadPatterns();
    }
  }, [user, type, patternType]);

  useEffect(() => {
    const filtered = patterns.filter(pattern =>
      pattern.value.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredPatterns(filtered);
  }, [value, patterns]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadPatterns = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('patterns')
      .select('id, value')
      .eq('user_id', user.id)
      .eq('type', type)
      .eq('pattern_type', patternType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading patterns:', error);
      return;
    }

    setPatterns(data || []);
  };

  const selectPattern = (pattern: Pattern) => {
    onChange(pattern.value);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
      />
      
      {showSuggestions && filteredPatterns.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredPatterns.map((pattern) => (
            <div
              key={pattern.id}
              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border last:border-b-0"
              onClick={() => selectPattern(pattern)}
            >
              {pattern.value}
            </div>
          ))}
        </div>
      )}

      {showSuggestions && filteredPatterns.length === 0 && patterns.length === 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg"
        >
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Não há padrões criados.
          </div>
        </div>
      )}
    </div>
  );
}