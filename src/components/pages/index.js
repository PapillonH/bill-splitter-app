import React from 'react';
import AssignItems from '../AssignItems';

export default function Home() {
  // Example data - replace with your actual state management
  const items = [];
  const participants = [];

  return (
    <main className="container mx-auto px-4 py-8">
      <AssignItems 
        items={items}
        participants={participants}
        assignItem={(index, participant) => {}}
        updateItem={(index, item) => {}}
        deleteItem={(index) => {}}
      />
    </main>
  );
}
