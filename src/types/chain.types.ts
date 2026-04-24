// Этап ИФТ
export interface IFTStage {
  id: string;
  name: string;              // ИФТ1, ИФТ2...
  description: string;       // Что делается
  status: string;            // Статус (в работе, завершен и т.д.)
  startDate: string;         // Старт
  endDate: string;           // Финиш
  totalSteps: number;        // Сколько шагов ИФТ
  completedSteps: number;    // Сколько прошли успешно шагов
  percentage: number;        // % прохождения
}

// Проблема
export interface Problem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  processName: string;
  chainName: string;
}

// Гигиена (пропуски отчетов) - оставляем для совместимости с парсером
export interface Hygiene {
  id: string;
  processName: string;
  chainName: string;
  missedDates: string[];
}

// Сквозная цепочка
export interface Chain {
  id: string;
  name: string;
  processes: Process[];
}

// Сквозной процесс
export interface Process {
  id: string;
  name: string;
  shortName: string;
  iftStages: IFTStage[];
  problems: Problem[];
  hygiene: Hygiene[];
  links: {
    confluence?: string;
    story?: string;
    sberChat?: string;
  };
}

// Данные для Ганта
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

// Статистика по цепочке
export interface ChainStats {
  totalProcesses: number;
  totalProblems: number;
  avgCompletion: number;
  overdueStages: number;
}

// Сводка по цепочке для главной страницы
export interface ChainSummary {
  id: string;
  name: string;
  totalProcesses: number;
  totalProblems: number;
  avgCompletion: number;
  overdueStages: number;
}