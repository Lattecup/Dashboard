import { useState } from 'react';
import styles from './ChainDetail.module.css';
import StatsWidget from '../StatsWidget/StatsWidget';
import ProblemsTable from '../ProblemsTable/ProblemsTable';
import type { Chain, ChainStats } from '../../types/chain.types';
import { parseDate } from '../utils/excelParser';
import ProcessStagesWidget from '../ProcessStagesWidget/ProcessStagesWidget';

interface ChainDetailProps {
  chain: Chain;
  onBack: () => void;
}

const formatDateStr = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const normalizePercent = (value: number): number => {
  if (value <= 1 && value > 0) return value * 100;
  return value;
};

const ChainDetail = ({ chain, onBack }: ChainDetailProps) => {
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  
  const processes = chain.processes;
  const processNames = processes.map(p => p.name);
  
  const filteredProcesses = selectedProcess === 'all' 
    ? processes 
    : processes.filter(p => p.name === selectedProcess);
  
  const allProblems = filteredProcesses.flatMap(p => p.problems);
  const sberChatLink = processes[0]?.links?.sberChat;
  
  // 🆕 Дедлайн ИФТ (последняя дата среди незавершённых)
  const getIftDeadline = (): string => {
    let latestDate: Date | null = null;
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        if (stage.name !== 'ПСИ') {
          const percentForCheck = normalizePercent(stage.percentage);
          const isNotComplete = percentForCheck < 99.9;
          if (stage.endDate && stage.endDate !== '' && isNotComplete) {
            const date = parseDate(stage.endDate);
            if (date && date instanceof Date && !isNaN(date.getTime())) {
              if (!latestDate || date > latestDate) {
                latestDate = date;
              }
            }
          }
        }
      });
    });
    
    return latestDate ? formatDateStr(latestDate) : 'Нет';
  };
  
  // 🆕 Дедлайн ПСИ (последняя дата среди незавершённых)
  const getPsiDeadline = (): string => {
    let latestDate: Date | null = null;
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        if (stage.name === 'ПСИ') {
          const percentForCheck = normalizePercent(stage.percentage);
          const isNotComplete = percentForCheck < 99.9;
          if (stage.endDate && stage.endDate !== '' && isNotComplete) {
            const date = parseDate(stage.endDate);
            if (date && date instanceof Date && !isNaN(date.getTime())) {
              if (!latestDate || date > latestDate) {
                latestDate = date;
              }
            }
          }
        }
      });
    });
    
    return latestDate ? formatDateStr(latestDate) : 'Нет';
  };
  
  const calculateStats = (): ChainStats => {
    if (filteredProcesses.length === 0) {
      return {
        totalProcesses: 0,
        totalProblems: 0,
        avgCompletion: 0,
        overdueStages: 0,
        avgIftCompletion: 0,
        avgPsiCompletion: 0,
        iftDeadline: 'Нет',
        psiDeadline: 'Нет'
      };
    }
    
    let totalCompletion = 0;
    let overdueCount = 0;
    let totalStages = 0;
    
    // Для раздельного подсчёта
    let totalIftCompletion = 0;
    let totalIftStages = 0;
    let totalPsiCompletion = 0;
    let totalPsiStages = 0;
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        const hasSteps = stage.totalSteps > 0;
        const hasData = stage.description || 
                        (stage.startDate && stage.startDate !== '') || 
                        (stage.endDate && stage.endDate !== '') ||
                        hasSteps;
        
        if (!hasData) return;
        
        if (hasSteps) {
          const percentage = normalizePercent(stage.percentage);
          totalCompletion += percentage;
          totalStages++;
          
          // Разделяем по типу этапа
          if (stage.name === 'ПСИ') {
            totalPsiCompletion += percentage;
            totalPsiStages++;
          } else {
            totalIftCompletion += percentage;
            totalIftStages++;
          }
        }
        
        const endDate = parseDate(stage.endDate);
        const percentForCheck = normalizePercent(stage.percentage);
        const isNotComplete = percentForCheck < 99.9;
        if (endDate && endDate < new Date() && isNotComplete) {
          overdueCount++;
        }
      });
    });
    
    return {
      totalProcesses: filteredProcesses.length,
      totalProblems: allProblems.length,
      avgCompletion: totalStages > 0 ? (totalCompletion / totalStages) : 0,
      overdueStages: overdueCount,
      avgIftCompletion: totalIftStages > 0 ? (totalIftCompletion / totalIftStages) : 0,
      avgPsiCompletion: totalPsiStages > 0 ? (totalPsiCompletion / totalPsiStages) : 0,
      iftDeadline: getIftDeadline(),
      psiDeadline: getPsiDeadline()
    };
  };
  
  const stats = calculateStats();
  
  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={onBack}>
        ← Назад к списку цепочек
      </button>
      
      <h1 className={styles.title}>📊 {chain.name}</h1>
      
      <div className={styles.filtersRow}>
        {processNames.length > 0 && (
          <div className={styles.processFilter}>
            <label className={styles.processLabel}>📋 Процесс:</label>
            <select 
              className={styles.processSelect}
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
            >
              <option value="all">Все процессы</option>
              {processNames.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <StatsWidget stats={stats} />

      <ProcessStagesWidget 
        processes={filteredProcesses} 
        selectedProcess={selectedProcess}
      />      
      
      <ProblemsTable 
        problems={allProblems} 
        sberChatLink={sberChatLink}
      />
    </div>
  );
};

export default ChainDetail;