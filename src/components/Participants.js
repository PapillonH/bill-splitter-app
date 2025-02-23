import React, { useState, useEffect } from 'react';
import { textract } from '../awsConfig';


function Participants({ participants, addParticipant, removeParticipant, reset }) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        if (name.trim()) {
            if (participants.includes(name)) {
                setError(`Participant "${name}" already exists!`);
                setTimeout(() => setError(''), 3000);
            } else {
                addParticipant(name);
                setName('');
                setError('');
            }
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleAdd();
        }
    };

    // Clear the input box when reset is triggered
    useEffect(() => {
        if (reset) {
            setName('');
        }
    }, [reset]);

    return (
        <div className="mb-6">
            {error && (
                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4">
                    {error}
                </div>
            )}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Enter participant name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                    onClick={handleAdd}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                    Add
                </button>
            </div>
            <ul className="list-disc pl-6">
                {participants.map((participant, index) => (
                    <li key={index} className="flex justify-between items-center mb-2">
                        <span>{participant}</span>
                        <button
                            onClick={() => removeParticipant(index)}
                            className="text-red-500 hover:underline"
                        >
                            Remove
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Participants;
