import React, { useState, useEffect } from 'react';
import Participants from './components/Participants';
import BillUpload from './components/BillUpload';
import AssignItems from './components/AssignItems';
import Summary from './components/Summary';
import axios from 'axios';

function Home() {
    const [participants, setParticipants] = useState([]);
    const [items, setItems] = useState([]);
    const [reset, setReset] = useState(false); // Track reset state
    const [showSummary, setShowSummary] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode toggle
    const [tipPercentage, setTipPercentage] = useState(18); // Default 18%
    const [taxPercentage, setTaxPercentage] = useState(13); // Default 13% (typical HST)

    // Add a new participant
    const addParticipant = (name) => {
        setParticipants([...participants, name]);
    };

    // Remove an existing participant
    const removeParticipant = (index) => {
        const updatedParticipants = participants.filter((_, i) => i !== index);
        setParticipants(updatedParticipants);
    };

    // Add bill items
    const addBillItems = (newItems) => {
        setItems(newItems);
    };

    // Assign an item to a participant
    const assignItem = (itemIndex, participant) => {
        const updatedItems = [...items];
        updatedItems[itemIndex].assignedTo = participant;
        setItems(updatedItems);
    };

    // Validate assignments before proceeding to summary
    const validateBeforeSummary = () => {
        const unassignedItems = items.filter(
            (item) =>
                !item.assignedTo && // Not assigned to a specific person
                (!item.splitBetween || item.splitBetween.length === 0) // Not split between participants
        );

        if (unassignedItems.length > 0) {
            alert(`Please assign all items before proceeding to the summary.`);
        } else {
            setShowSummary(true);
        }
    };

    // Update item properties (e.g., name, price)
    const updateItem = (index, updatedItem) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], ...updatedItem };
        setItems(updatedItems);
    };

    // Reset all data
    const resetAll = () => {
        const confirmReset = window.confirm("Are you sure you want to reset all data?");
        if (confirmReset) {
            setParticipants([]);
            setItems([]);
            setReset((prev) => !prev); // Toggle reset state to trigger input clearing
            setShowSummary(false);
        }
    };

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Add this function to handle tip changes
    const handleTipChange = (event) => {
        const value = event.target.type === 'range' ? 
            parseInt(event.target.value, 10) : 
            parseFloat(event.target.value);
        
        if (!isNaN(value)) {
            setTipPercentage(Math.max(0, Math.min(100, value)));
        }
    };

    const handleTaxChange = (event) => {
        const value = event.target.type === 'range' ? 
            parseInt(event.target.value, 10) : 
            parseFloat(event.target.value);
        
        if (!isNaN(value)) {
            setTaxPercentage(Math.max(0, Math.min(100, value)));
        }
    };

    return (
        <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-light text-black'}`}>
            {/* Dark Mode Toggle */}
            <button
                onClick={toggleDarkMode}
                className={`px-4 py-2 rounded-lg ${
                    isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
            >
                {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
            </button>

            <h1 className={`text-7xl font-bold mt-8 ${isDarkMode ? 'text-white' : 'text-primary-dark'}`}>
                Bill Splitter App
            </h1>
            <p className={`text-base text-center mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Easily split your bills and track expenses.
            </p>

            {!showSummary ? (
                <>
                    {/* Participants Section */}
                    <Participants
                        participants={participants}
                        addParticipant={addParticipant}
                        removeParticipant={removeParticipant}
                        reset={reset} // Pass reset state
                    />

                    {/* Bill Upload Section */}
                    <BillUpload addBillItems={addBillItems} reset={reset} /> {/* Pass reset state */}

                    {/* Assign Items Section */}
                    <AssignItems
                        items={items}
                        participants={participants}
                        assignItem={assignItem}
                        updateItem={updateItem} // Pass the function here
                    />

                    {/* Display Items */}
                    <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-light'}`}>
                        <h2 className="text-lg font-bold mb-4">Current Items</h2>
                        {items.length > 0 ? (
                            <table className="table-auto w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>Item Name</th>
                                        <th className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>Price</th>
                                        <th className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>Assigned To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>{item.name}</td>
                                            <td className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>${item.price.toFixed(2)}</td>
                                            <td className={`px-4 py-2 border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                                                {item.assignedTo === 'Everyone'
                                                    ? 'Everyone'
                                                    : item.splitBetween?.length > 0
                                                    ? `Split Between: ${item.splitBetween.join(', ')}`
                                                    : 'Unassigned'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No items added yet.</p>
                        )}
                    </div>

                    {/* Tax and Tip Controls */}
                    <div className="text-center mt-6 space-y-4">
                        {/* Tax Percentage Control */}
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Tax Percentage: {taxPercentage}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="30"
                                value={taxPercentage}
                                onChange={handleTaxChange}
                                className={`w-64 h-2 rounded-lg appearance-none cursor-pointer ${
                                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                            />
                            <input
                                type="number"
                                value={taxPercentage}
                                onChange={handleTaxChange}
                                className={`ml-4 w-20 px-2 py-1 rounded-lg ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'border-gray-300 bg-white'
                                }`}
                                min="0"
                                step="0.5"
                            />
                        </div>

                        {/* Tip Percentage Control */}
                        <div>
                            <label className={`block text-sm font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Tip Percentage: {tipPercentage}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="30"
                                value={tipPercentage}
                                onChange={handleTipChange}
                                className={`w-64 h-2 rounded-lg appearance-none cursor-pointer ${
                                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                }`}
                            />
                            <input
                                type="number"
                                value={tipPercentage}
                                onChange={handleTipChange}
                                className={`ml-4 w-20 px-2 py-1 rounded-lg ${
                                    isDarkMode 
                                        ? 'bg-gray-700 border-gray-600 text-white' 
                                        : 'border-gray-300 bg-white'
                                }`}
                                min="0"
                                step="0.5"
                            />
                        </div>
                    </div>

                    {/* Proceed to Summary */}
                    <div className="text-center mt-6">
                        <button
                            onClick={validateBeforeSummary}
                            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                        >
                            Proceed to Summary
                        </button>
                    </div>
                </>
            ) : (
                <Summary 
                    items={items} 
                    participants={participants} 
                    tipPercentage={tipPercentage}
                    taxPercentage={taxPercentage}
                />
            )}

            {/* Reset All Button */}
            <div className="text-center mt-6">
                <button
                    onClick={resetAll}
                    className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary-dark"
                >
                    Reset All
                </button>
            </div>
        </div>
    );
}

export default Home;
