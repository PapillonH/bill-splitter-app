import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Extract base64 data from the Data URL
    const base64Data = image.split(',')[1] || image;

    // Use the exact prompt specified by the user
    const userPrompt = "You are a receipt parser. Extract items and their prices from this receipt image. " +
                       "Return ONLY a valid JSON array with no additional text, following this exact format: " +
                       '[{"name":"Item Name","price":10.99}]' +
                       "Rules:\n" +
                       "1. Price must be a number (not a string)\n" +
                       "2. Remove any item numbers or prefixes\n" +
                       "3. Keep item names simple and clear\n" +
                       "4. Do not include any text outside the JSON array";

    // Call OpenAI's API with the specified model
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'OpenAI API error', 
        code: response.status
      });
    }

    const data = await response.json();
    
    try {
      // Parse the response content
      let parsedItems = [];
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        
        // Try to extract JSON from the content (it might be wrapped in code blocks)
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          content.match(/```\s*([\s\S]*?)\s*```/) ||
                          [null, content];
                          
        const jsonStr = jsonMatch[1] || content;
        
        try {
          parsedItems = JSON.parse(jsonStr.trim());
        } catch (e) {
          console.error('Error parsing JSON from OpenAI response:', e);
          console.log('Response content:', content);
          throw new Error('Failed to parse receipt data');
        }
      } else {
        throw new Error('Unexpected response format from OpenAI');
      }
      
      // Transform the simple array to our app's format
      const receiptData = {
        items: parsedItems.map(item => ({
          description: item.name,
          price: item.price,
          confidence: 0.9 // Default confidence since not provided in simple format
        })),
        metadata: {
          merchant: null,
          date: null,
          subtotal: parsedItems.reduce((sum, item) => sum + item.price, 0),
          tax: null,
          tip: null,
          total: null,
          processedAt: new Date().toISOString(),
          originalFilename: filename
        }
      };
      
      return res.status(200).json(receiptData);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(500).json({ error: 'Failed to parse receipt data', details: parseError.message });
    }
  } catch (error) {
    console.error('Receipt processing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process receipt' });
  }
} 