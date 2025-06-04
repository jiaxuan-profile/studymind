const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  try {
    const { noteId, gaps } = JSON.parse(event.body);
    
    const { data, error } = await supabase
      .from('note_gaps')
      .upsert({
        id: `${noteId}-gaps`,
        note_id: noteId,
        gaps
      });
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};