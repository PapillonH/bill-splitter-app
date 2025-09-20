export type Item = {
  name: string;
  price: number;
  splitBetween?: string[];
  assignedTo?: string | null;
};

export type Participant = string;

export type AssignItemsProps = {
  items: Item[];
  participants: Participant[];
  assignItem: (index: number, participant: string) => void;
  updateItem: (index: number, item: Item) => void;
  deleteItem: (index: number) => void;
};
