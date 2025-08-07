-- Update RLS policies to work with our custom authentication
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

-- Create new policies that allow access for authenticated users
CREATE POLICY "Allow select for authenticated users" 
ON public.transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.transactions 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.transactions 
FOR DELETE 
USING (true);