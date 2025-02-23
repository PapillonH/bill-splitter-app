import React from 'react';
import { textract } from '../awsConfig';


function Summary({ items, participants, tipPercentage, taxPercentage }) {
    // Calculate totals for each participant
    const totals = participants.reduce((acc, participant) => {
        acc[participant] = 0; // Initialize total for each participant
        return acc;
    }, {});

    items.forEach((item) => {
        if (item.assignedTo === 'Everyone') {
            // Split the price equally among all participants
            const splitAmount = item.price / participants.length;
            participants.forEach((participant) => {
                totals[participant] += splitAmount;
            });
        } else if (item.splitBetween?.length > 0) {
            // Split the price equally among the selected participants
            const splitAmount = item.price / item.splitBetween.length;
            item.splitBetween.forEach((participant) => {
                totals[participant] += splitAmount;
            });
        } else if (item.assignedTo && totals[item.assignedTo] !== undefined) {
            // Add the full price to the assigned participant
            totals[item.assignedTo] += item.price || 0;
        }
    });

    return (
        <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Summary</h2>

            {/* Display totals for each participant */}
            {participants.length === 0 ? (
                <p className="text-gray-700">No participants to display.</p>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Participant Totals</h3>
                    <ul className="list-disc pl-6">
                        {participants.map((participant, index) => {
                            const baseAmount = totals[participant];
                            const withTax = baseAmount * (1 + taxPercentage/100);
                            const withTaxAndTip = withTax * (1 + tipPercentage/100);
                            
                            return (
                                <li key={index} className="flex justify-between mb-2">
                                    <span>{participant}</span>
                                    <div className="flex gap-4">
                                        <span className="text-gray-600">
                                            Base: ${baseAmount.toFixed(2)}
                                        </span>
                                        <span className="text-gray-600">
                                            With Tax: ${withTax.toFixed(2)}
                                        </span>
                                        <span className="text-primary font-semibold">
                                            Final: ${withTaxAndTip.toFixed(2)}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Display items grouped by participant */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800">Items by Participant</h3>
                {participants.map((participant, index) => (
                    <div key={index} className="mb-4">
                        <h4 className="text-md font-medium text-gray-700">{participant}</h4>
                        <ul className="list-disc pl-6">
                            {items
                                .filter(
                                    (item) =>
                                        item.assignedTo === participant ||
                                        (item.splitBetween && item.splitBetween.includes(participant))
                                )
                                .map((item, i) => (
                                    <li key={i}>
                                        {item.name} - ${item.price.toFixed(2)}{' '}
                                        {item.assignedTo === 'Everyone'
                                            ? '(Split by Everyone)'
                                            : item.splitBetween?.length > 0
                                            ? `(Split with: ${item.splitBetween.join(', ')})`
                                            : ''}
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Display unassigned items */}
            <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800">Unassigned Items</h3>
                <ul className="list-disc pl-6">
                    {items
                        .filter((item) => !item.assignedTo && (!item.splitBetween || item.splitBetween.length === 0))
                        .map((item, index) => (
                            <li key={index}>
                                {item.name} - ${item.price.toFixed(2)}
                            </li>
                        ))}
                </ul>
            </div>
        </div>
    );
}

export default Summary;
