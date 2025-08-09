-- Create patterns table for storing description and category patterns
CREATE TABLE public.patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('description', 'category')),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own patterns" 
ON public.patterns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patterns" 
ON public.patterns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns" 
ON public.patterns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns" 
ON public.patterns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_patterns_updated_at
BEFORE UPDATE ON public.patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();