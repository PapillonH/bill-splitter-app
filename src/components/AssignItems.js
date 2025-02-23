import React, { useState } from 'react';
import { textract } from '../awsConfig';


function AssignItems({ items, participants, assignItem, updateItem }) {
    const [editingItemIndex, setEditingItemIndex] = useState(null);
    const [editedName, setEditedName] = useState('');
    const [editedPrice, setEditedPrice] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState([]);

    const handleEditStart = (index, item) => {
        setEditingItemIndex(index);
        setEditedName(item.name);
        setEditedPrice(item.price);
        setSelectedParticipants(item.splitBetween || []);
    };

    const handleEditSave = (index) => {
        const updatedItem = {
            name: editedName,
            price: parseFloat(editedPrice),
            splitBetween: selectedParticipants,
            assignedTo:
                selectedParticipants.length === participants.length
                    ? 'Everyone'
                    : selectedParticipants.length === 1
                    ? selectedParticipants[0]
                    : null,
        };
        updateItem(index, updatedItem);
        setEditingItemIndex(null);
        setSelectedParticipants([]);
    };

    const handleToggleParticipant = (participant) => {
        setSelectedParticipants((prev) =>
            prev.includes(participant)
                ? prev.filter((p) => p !== participant) // Remove participant
                : [...prev, participant] // Add participant
        );
    };

    const handleSplitByEveryone = (index) => {
        updateItem(index, {
            ...items[index],
            assignedTo: 'Everyone',
            splitBetween: participants,
        });
    };

    return (
        <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Assign Items to Participants</h2>
            <ul className="list-disc pl-6">
                {items.map((item, index) => (
                    <li
                        key={index}
                        className={`flex flex-col gap-2 mb-4 px-4 py-2 border rounded-lg ${
                            item.assignedTo === 'Everyone'
                                ? 'bg-blue-50'
                                : item.assignedTo || item.splitBetween?.length
                                ? 'bg-green-50'
                                : 'bg-red-50'
                        }`}
                    >
                        {editingItemIndex === index ? (
                            <div>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-2 py-1 flex-grow"
                                    />
                                    <input
                                        type="number"
                                        value={editedPrice}
                                        onChange={(e) => setEditedPrice(e.target.value)}
                                        className="border border-gray-300 rounded-lg px-2 py-1 w-28"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap mb-2">
                                    {participants.map((participant, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleToggleParticipant(participant)}
                                            className={`px-4 py-1 rounded-lg border ${
                                                selectedParticipants.includes(participant)
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {participant}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditSave(index)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingItemIndex(null)}
                                        className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center">
                                    <span>
                                        {item.name} - ${item.price.toFixed(2)}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSplitByEveryone(index)}
                                            className="bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600"
                                        >
                                            Split by Everyone
                                        </button>
                                        <button
                                            onClick={() => handleEditStart(index, item)}
                                            className="bg-yellow-500 text-white px-2 py-1 rounded-lg hover:bg-yellow-600"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-700 mt-1">
                                    {item.assignedTo === 'Everyone'
                                        ? 'Assigned to: Everyone'
                                        : item.splitBetween?.length > 0
                                        ? `Split Between: ${item.splitBetween.join(', ')}`
                                        : 'Unassigned'}
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default AssignItems;
