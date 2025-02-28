import React, { useState } from 'react';

function BillUpload({ addBillItems, items = [], updateItem }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const handleAddItem = () => {
        const currentItems = Array.isArray(items) ? items : [];
        const newItems = [
            ...currentItems,
            { name: "New Item", price: 0, assignedTo: null }
        ];
        addBillItems(newItems);
    };

    const handleDeleteItem = (index) => {
        if (!Array.isArray(items)) return;
        const newItems = items.filter((_, i) => i !== index);
        addBillItems(newItems);
    };

    const sendToOpenAI = async (base64Image) => {
        console.log("Starting API request to OpenAI...");
        
        try {
            console.log("Sending image to OpenAI Vision API...");
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Extract items and prices from this receipt. Follow these rules:\n" +
                                          "1. Remove any order numbers or prefixes (like [BI], 1/14, etc)\n" +
                                          "2. Keep only the main item name\n" +
                                          "3. Return a clean JavaScript array with this exact format:\n" +
                                          "[{name: 'Clean Item Name', price: 10.99}, {name: 'Another Item', price: 15.50}]\n" +
                                          "4. Price should be a number\n" +
                                          "5. Make item names concise but clear"
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 4096
                })
            });

            console.log("Received response from OpenAI");
            const data = await response.json();
            
            if (data.error) {
                console.error("API Error:", data.error);
                throw new Error(data.error.message);
            }

            console.log("Processing OpenAI response...");
            const responseText = data.choices[0].message.content;
            console.log("Raw response:", responseText);

            const arrayMatch = responseText.match(/\[.*\]/s);
            if (!arrayMatch) {
                throw new Error('Could not parse items from response');
            }

            const items = eval(arrayMatch[0]);
            console.log("Parsed items:", items);
            return items;

        } catch (err) {
            console.error("Full error:", err);
            throw new Error(`OpenAI API Error: ${err.message}`);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        try {
            setLoading(true);
            setError('');
            console.log("Processing file upload...");

            const previewUrl = URL.createObjectURL(file);
            setPreview(previewUrl);
            setShowPreview(true); // Show preview when new file is uploaded

            console.log("Converting image to base64...");
            const base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            console.log("Image converted to base64, sending to OpenAI...");
            const parsedItems = await sendToOpenAI(base64Image);
            
            console.log("Adding items to app state:", parsedItems);
            const currentItems = Array.isArray(items) ? items : [];
            addBillItems([...currentItems, ...parsedItems]);

        } catch (err) {
            setError(err.message);
            console.error('Error processing file:', err);
        } finally {
            setLoading(false);
            console.log("File processing completed");
        }
    };

    return (
        <div className="mb-6">
            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Upload Bill Photo
            </h2>
            <div className="flex flex-col gap-4">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className={`block w-full text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-500'
                    }
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-white
                        hover:file:bg-primary-dark`}
                />
                {loading && (
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                        Processing image... This may take a few seconds.
                    </p>
                )}
                {error && <p className="text-red-500">{error}</p>}
                
                {/* Preview Toggle Button */}
                {preview && (
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 w-fit"
                    >
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                )}
                
                {/* Image Preview */}
                {preview && showPreview && (
                    <div className="mt-4">
                        <h3 className={`text-lg font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-black'
                        }`}>
                            Preview:
                        </h3>
                        <img 
                            src={preview} 
                            alt="Bill preview" 
                            className="max-w-md rounded-lg shadow-lg"
                        />
                    </div>
                )}

                {/* Add this section to display items with delete buttons */}
                <div className="mt-4">
                    {Array.isArray(items) && items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                            <span>{item.name} - ${item.price}</span>
                            <button
                                onClick={() => handleDeleteItem(index)}
                                className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>

                {/* Manual Item Entry */}
                <div className="mt-4">
                    <button
                        onClick={handleAddItem}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                    >
                        Add New Item
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BillUpload; 