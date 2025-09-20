import React, { useState } from 'react';
import type { AssignItemsProps, Item } from '../components/types'; // Ensure this path is correct
import { Button } from '../components/ui/button'; // Ensure this path is correct
import { Input } from '../components/ui/input'; // Ensure this path is correct

const AssignItems: React.FC<AssignItemsProps> = ({ items, participants, assignItem, updateItem, deleteItem }) => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPrice, setEditedPrice] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleEditStart = (index: number, item: Item) => {
    setEditingItemIndex(index);
    setEditedName(item.name);
    setEditedPrice(item.price.toString());
    setSelectedParticipants(item.splitBetween || []);
  };

  const handleEditSave = (index: number) => {
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

  const handleToggleParticipant = (participant: string) => {
    setSelectedParticipants((prevSelected) =>
      prevSelected.includes(participant)
        ? prevSelected.filter((p) => p !== participant)
        : [...prevSelected, participant]
    );
  };

  const handleSplitByEveryone = (index: number) => {
    const updatedItem = {
      ...items[index],
      splitBetween: participants,
      assignedTo: 'Everyone',
    };
    updateItem(index, updatedItem);
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-4">Assign Items to Participants</h2>
      <ul className="space-y-4">
        {items.map((item, index) => (
          <li key={index} className="p-4 border rounded-lg shadow-sm">
            {editingItemIndex === index ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Item name"
                  />
                  <Input
                    type="number"
                    value={editedPrice}
                    onChange={(e) => setEditedPrice(e.target.value)}
                    placeholder="Price"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant, i) => (
                    <Button
                      key={i}
                      variant={selectedParticipants.includes(participant) ? "default" : "outline"}
                      onClick={() => handleToggleParticipant(participant)}
                    >
                      {participant}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEditSave(index)}>Save</Button>
                  <Button variant="outline" onClick={() => setEditingItemIndex(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center">
                  <span className={isDarkMode ? 'text-white' : 'text-black'}>
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
                    <button
                      onClick={() => deleteItem(index)}
                      className="bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {item.assignedTo === 'Everyone'
                    ? 'Assigned to: Everyone'
                    : item.splitBetween?.length
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
};

export default AssignItems;
