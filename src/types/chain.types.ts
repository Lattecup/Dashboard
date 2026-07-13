// Этап ИФТ/ПСИ
export interface IFTStage {
  id: string;
  name: string;              // ИФТ1, ПСИ1, ИФТ2, ПСИ2...
  description: string;       // Что делается
  status: string;
  startDate: string;
  endDate: string;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  integrationType?: string;  // только для ИФТ
  stageNumber?: number;      // для сортировки (1, 2, 3...)
}

export interface Problem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  processName: string;
  chainName: string;
}

export interface Hygiene {
  id: string;
  processName: string;
  chainName: string;
  missedDates: string[];
}

export interface Chain {
  id: string;
  name: string;
  processes: Process[];
}

export interface Process {
  id: string;
  name: string;
  shortName: string;
  sp: string;
  iftStages: IFTStage[];
  problems: Problem[];
  hygiene: Hygiene[];
  links: {
    confluence?: string;
    story?: string;
  };
  datePromInside?: Date | null;
  datePromOutside?: Date | null;
}

export interface GanttItem {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  percentage: number;
  completedSteps: number;
  totalSteps: number;
  status: string;
  processName: string;
  stageName: string;
  description?: string;
}

export interface ChainStats {
  totalProcesses: number;
  totalProblems: number;
  avgCompletion: number;
  overdueStages: number;
  avgIftCompletion: number;
  avgPsiCompletion: number;
  iftDeadline?: string;
  psiDeadline?: string;
}

export interface ChainSummary {
  id: string;
  name: string;
  totalProcesses: number;
  totalProblems: number;
  overdueStages: number;
  avgIftInsideCompletion: number;
  avgIftOutsideCompletion: number;
  avgPsiCompletion: number;
}