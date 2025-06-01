// api/update-note.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("--- /api/update-note invoked ---");
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('SERVERLESS: Supabase URL or Service Key not set for update-note.');
      return res.status(500).json({ error: 'Server configuration error for database' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      id, 
      title,
      content,
      tags,
      embedding, 
      updatedAt, 
      createdAt 
    } = req.body;

    if (!id || !title || !content) { 
      return res.status(400).json({ error: 'Missing required note data (id, title, content)' });
    }

    const noteDataToUpsert: any = {
      id,
      title,
      content,
      tags,
      embedding, 
      updated_at: updatedAt || new Date().toISOString(),
    };

    console.log(`SERVERLESS: Upserting note with ID: ${id}`);
    const { data, error } = await supabase
      .from('notes') // Your table name
      .upsert(noteDataToUpsert, {
        onConflict: 'id', 
      })
      .select();

    if (error) {
      console.error('SERVERLESS: Supabase error upserting note:', error);
      throw error; 
    }

    console.log('SERVERLESS: Note upserted successfully:', data);
    return res.status(200).json({ message: 'Note saved successfully', data: data ? data[0] : null });

  } catch (error: any) {
    console.error('SERVERLESS: Error in update-note handler:', error);
    return res.status(500).json({ error: error.message || 'Failed to save note' });
  }
}