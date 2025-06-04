const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  try {
    const { noteId, questions } = JSON.parse(event.body);
    
    const { data, error } = await supabase
      .from('note_questions')
      .upsert({
        id: `${noteId}-questions`,
        note_id: noteId,
        questions
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