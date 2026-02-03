
import React from 'react';

export type AppView = 'menu' | '2048' | 'stack' | 'id' | 'run' | 'anthem' | 'apm' | 'sigil' | 'aura' | 'cipher' | 'echo' | 'oracle' | 'fate';

export interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  mergedFrom?: Tile[];
}

export interface ChallengeData {
  user: string;
  score: number;
  mode: 'challenge';
}
