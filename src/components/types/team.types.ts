export interface IFTStage {
  id: string;
  name: string;
  dueDate: string;
  totalSteps: number;
  completedSteps: number;
}

export interface Process {
  id: string;
  name: string;
  team: string;
  iftStages: IFTStage[];
}

export interface Problem {
  id: string;
  description: string;
  processName: string;
  team: string;
  assignee: string;
  dueDate: string;
  type: string;
}

export interface Team {
  id: string;
  name: string;
  processes: Process[];
  problems: Problem[];
}