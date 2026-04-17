import { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from './Dashboard.module.css';
import StatsWidget from '../StatsWidget/StatsWidget';
import TopResponsibleWidget from '../TopResponsibleWidget/TopResponsibleWidget';
import DeadlinesWidget from '../DeadlinesWidget/DeadlinesWidget';
import ProblemsTable from '../ProblemsTable/ProblemsTable';
import StagesTimeline from '../StagesTimeline/StagesTimeline';
import FileUploader from '../FileUploader/FileUploader';

interface IFTStage {
  id: string;
  name: string;
  dueDate: string;
  totalSteps: number;
  completedSteps: number;
}

interface Process {
  id: string;
  name: string;
  team: string;
  iftStages: IFTStage[];
}

interface Problem {
  id: string;
  description: string;
  processName: string;
  team: string;
  assignee: string;
  dueDate: string;
  type: string;
}

const parseExcelDate = (value: string | number | null | undefined): Date | null => {
  if (!value || value === '') return null;
  
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  
  if (typeof value === 'string') {
    if (value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const parts = value.split('.');
      const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(date.getTime())) return date;
    }
    if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
};

const formatDate = (value: string | number | null | undefined): string => {
  if (!value || value === '') return '';
  const date = parseExcelDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString('ru-RU');
};

const getDateNumber = (value: string | number | null | undefined): number | null => {
  if (!value || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return parseInt(value);
  const date = parseExcelDate(value);
  if (date) return Math.floor(date.getTime() / (86400 * 1000)) + 25569;
  return null;
};

const getIftStagesWithoutDate = (processes: Process[]) => {
  let count = 0;
  processes.forEach(process => {
    process.iftStages.forEach(stage => {
      if (!stage.dueDate || stage.dueDate === '' || String(stage.dueDate).toLowerCase() === 'tbd') {
        count++;
      }
    });
  });
  return count;
};

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [allTeamsData, setAllTeamsData] = useState<Map<string, { processes: Process[], problems: Problem[] }>>(new Map());
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('');
  
  const processes = selectedTeam && allTeamsData.get(selectedTeam)?.processes || [];
  const problems = selectedTeam && allTeamsData.get(selectedTeam)?.problems || [];

  const handleFileLoad = async (file: File) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length === 0) return;
      const headers = rawData[0];
      
      const getColIndex = (possibleNames: string[]) => {
        for (let i = 0; i < headers.length; i++) {
          const header = String(headers[i]).trim();
          if (possibleNames.some(name => header === name)) return i;
        }
        return -1;
      };
      
      const teamIdx = getColIndex(['Команда']);
      const processIdx = getColIndex(['Сквозной процесс']);
      const stageIdx = getColIndex(['Этап ИФТ']);
      const stageDueIdx = getColIndex(['Срок этапа', 'Срок']);
      const totalStepsIdx = getColIndex(['Шагов всего']);
      const completedStepsIdx = getColIndex(['Шагов выполнено']);
      const problemIdx = getColIndex(['Проблема']);
      const assigneeIdx = getColIndex(['Исполнитель']);
      const problemDueIdx = getColIndex(['Срок проблемы', 'Срок']);
      const problemTypeIdx = getColIndex(['Тип проблемы']);
      
      const teamsMap = new Map<string, { processes: Process[], problems: Problem[] }>();
      
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const team = teamIdx !== -1 ? String(row[teamIdx] || '') : 'Без команды';
        const processName = processIdx !== -1 ? String(row[processIdx] || '') : '';
        const stageName = stageIdx !== -1 ? String(row[stageIdx] || '') : '';
        const stageDueValue = stageDueIdx !== -1 ? row[stageDueIdx] : '';
        const totalSteps = totalStepsIdx !== -1 ? Number(row[totalStepsIdx]) || 0 : 0;
        const completedSteps = completedStepsIdx !== -1 ? Number(row[completedStepsIdx]) || 0 : 0;
        const problemDesc = problemIdx !== -1 ? String(row[problemIdx] || '') : '';
        const assignee = assigneeIdx !== -1 ? String(row[assigneeIdx] || '') : '';
        const problemDueValue = problemDueIdx !== -1 ? row[problemDueIdx] : '';
        const problemType = problemTypeIdx !== -1 ? String(row[problemTypeIdx] || '') : '';
        
        if (!team || team === '' || team === 'undefined') continue;
        if (!processName || processName === '') continue;
        
        if (!teamsMap.has(team)) teamsMap.set(team, { processes: [], problems: [] });
        const teamData = teamsMap.get(team)!;
        
        const existingProcess = teamData.processes.find(p => p.name === processName);
        if (existingProcess) {
          existingProcess.iftStages.push({
            id: `${team}_${processName}_${stageName}_${i}`,
            name: stageName,
            dueDate: formatDate(stageDueValue),
            totalSteps: totalSteps,
            completedSteps: completedSteps
          });
        } else {
          teamData.processes.push({
            id: `${team}_${processName}`,
            name: processName,
            team: team,
            iftStages: [{
              id: `${team}_${processName}_${stageName}_${i}`,
              name: stageName,
              dueDate: formatDate(stageDueValue),
              totalSteps: totalSteps,
              completedSteps: completedSteps
            }]
          });
        }
        
        if (problemDesc && problemDesc !== '' && problemDesc !== '-' && problemDesc !== '—') {
          teamData.problems.push({
            id: `problem_${i}`,
            description: problemDesc,
            processName: processName,
            team: team,
            assignee: assignee || 'Не указан',
            dueDate: getDateNumber(problemDueValue)?.toString() || '',
            type: problemType ? problemType.toLowerCase() : 'обычный'
          });
        }
      }
      
      setAllTeamsData(teamsMap);
      const firstTeam = Array.from(teamsMap.keys())[0];
      setSelectedTeam(firstTeam);
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const totalProblems = problems.length;
  const blockersAndCritical = problems.filter(p => {
    const type = p.type.toLowerCase();
    return type === 'блокер' || type === 'критичный';
  }).length;
  const iftStagesWithoutDate = getIftStagesWithoutDate(processes);
  const teams = Array.from(allTeamsData.keys());

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Cтатистика ИФТ СП3</h1>
      <p className={styles.subtitle}>Загрузите Excel файл</p>

      <FileUploader onFileLoad={handleFileLoad} fileName={fileName} loading={loading} />

      {teams.length > 0 && (
        <>
          <div className={styles.teamSelector}>
            <label className={styles.teamLabel}>Команда:</label>
            <select className={styles.teamSelect} value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
              {teams.map(team => <option key={team} value={team}>{team}</option>)}
            </select>
          </div>

          <h2 className={styles.teamTitle}>👥 {selectedTeam}</h2>

          <StatsWidget totalProblems={totalProblems} blockersAndCritical={blockersAndCritical} iftStagesWithoutDate={iftStagesWithoutDate} />

          <StagesTimeline processes={processes} />

          <DeadlinesWidget problems={problems} onFilterChange={setDeadlineFilter} activeFilter={deadlineFilter} />

          <ProblemsTable problems={problems} processes={processes.map(p => ({ id: p.id, name: p.name }))} deadlineFilter={deadlineFilter} onClearDeadlineFilter={() => setDeadlineFilter('')} />

          <TopResponsibleWidget problems={problems} limit={5} />
        </>
      )}
    </div>
  );
};

export default Dashboard;