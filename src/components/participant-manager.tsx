"use client"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { UserPlus, X, Users } from "lucide-react"
import type { Person } from "./lib/types"
import { v4 as uuidv4 } from "uuid"
import { ScrollArea } from "../components/ui/scroll-area"
import { Avatar, AvatarFallback } from "../components/ui/avatar"
import React from "react"

interface ParticipantManagerProps {
  participants: Person[]
  onConfirm: (participants: Person[]) => void
  onRemoveParticipant: (id: string) => void
}

export default function ParticipantManager({ participants, onConfirm, onRemoveParticipant }: ParticipantManagerProps) {
  const [newName, setNewName] = useState("")
  const [localParticipants, setLocalParticipants] = useState<Person[]>(participants)

  const handleAddParticipant = () => {
    if (newName.trim()) {
      const newParticipant: Person = {
        id: uuidv4(),
        name: newName.trim(),
      }
      setLocalParticipants([...localParticipants, newParticipant])
      setNewName("")
    }
  }

  const handleRemoveParticipant = (id: string) => {
    setLocalParticipants(localParticipants.filter((p) => p.id !== id))
  }

  const handleConfirm = () => {
    onConfirm(localParticipants)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Who's Splitting the Bill?</h2>
        <p className="text-muted-foreground mb-4">Add everyone who's sharing this bill</p>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor="participant-name">Add Person</Label>
          <Input
            id="participant-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddParticipant()
              }
            }}
          />
        </div>
        <Button onClick={handleAddParticipant} disabled={!newName.trim()}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {localParticipants.length > 0 ? (
        <ScrollArea className="h-[250px] border rounded-md p-4">
          <div className="space-y-3">
            {localParticipants.map((person) => (
              <div key={person.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{person.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveParticipant(person.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-12 border rounded-md">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No participants added yet</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleConfirm} disabled={localParticipants.length === 0} size="lg">
          Continue
        </Button>
      </div>
    </div>
  )
}

