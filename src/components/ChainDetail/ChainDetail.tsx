import { useState } from 'react';
import styles from './ChainDetail.module.css';
import StatsWidget from '../StatsWidget/StatsWidget';
import IFTStagesWidget from '../IFTStagesWidget/IFTStagesWidget';
import GanttChart from '../GanttChart/GanttChart';
import ProblemsTable from '../ProblemsTable/ProblemsTable';
import type { Chain, ChainStats } from '../../types/chain.types';
import { parseDate } from '../utils/excelParser';

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

const ChainDetail = ({ chain, onBack }: ChainDetailProps) => {
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  
  const processes = chain.processes;
  const processNames = processes.map(p => p.name);
  
  const filteredProcesses = selectedProcess === 'all' 
    ? processes 
    : processes.filter(p => p.name === selectedProcess);
  
  const allProblems = filteredProcesses.flatMap(p => p.problems);
  const sberChatLink = processes[0]?.links?.sberChat;
  
  // Фильтруем и нормализуем этапы для IFTStagesWidget
  const normalizedStages = filteredProcesses
    .flatMap(p => p.iftStages)
    .filter(stage => {
      const hasData = stage.description || 
                      (stage.startDate && stage.startDate !== '') || 
                      (stage.endDate && stage.endDate !== '') ||
                      stage.totalSteps > 0;
      return hasData;
    })
    .map(s => ({
      ...s,
      percentage: s.percentage > 1 ? s.percentage / 100 : s.percentage
    }));
  
  const getNearestDeadline = (): string => {
    let nearestDate: Date | null = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        if (stage.endDate && stage.endDate !== '') {
          const date = parseDate(stage.endDate);
          if (date && date instanceof Date && !isNaN(date.getTime())) {
            if (date >= today) {
              if (!nearestDate || date < nearestDate) {
                nearestDate = date;
              }
            }
          }
        }
      });
    });
    
    return nearestDate ? formatDateStr(nearestDate) : 'Нет';
  };
  
  const calculateStats = (): ChainStats => {
    if (filteredProcesses.length === 0) {
      return {
        totalProcesses: 0,
        totalProblems: 0,
        avgCompletion: 0,
        overdueStages: 0
      };
    }
    
    let totalCompletion = 0;
    let overdueCount = 0;
    let totalStages = 0;
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        const hasSteps = stage.totalSteps > 0;
        const hasData = stage.description || 
                        (stage.startDate && stage.startDate !== '') || 
                        (stage.endDate && stage.endDate !== '') ||
                        hasSteps;
        
        if (!hasData) return;
        
        if (hasSteps) {
          const percentage = stage.percentage > 1 ? stage.percentage / 100 : stage.percentage;
          totalCompletion += percentage;
          totalStages++;
        }
        
        const endDate = new Date(stage.endDate);
        if (!isNaN(endDate.getTime()) && endDate < new Date() && stage.percentage < 100) {
          overdueCount++;
        }
      });
    });
    
    return {
      totalProcesses: filteredProcesses.length,
      totalProblems: allProblems.length,
      avgCompletion: totalStages > 0 ? (totalCompletion / totalStages) * 100 : 0,
      overdueStages: overdueCount
    };
  };
  
  const stats = calculateStats();
  const nearestDeadline = getNearestDeadline();
  
  // Фильтруем процессы для GanttChart
  const filteredProcessesForGantt = processes.filter(process => {
    if (selectedProcess !== 'all' && process.name !== selectedProcess) return false;
    const hasData = process.iftStages.some(stage => {
      return stage.description || 
             (stage.startDate && stage.startDate !== '') || 
             (stage.endDate && stage.endDate !== '') ||
             stage.totalSteps > 0;
    });
    return hasData;
  });
  
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
      
      <StatsWidget stats={stats} nearestDeadline={nearestDeadline} />
      
      <IFTStagesWidget stages={normalizedStages} />
      
      <GanttChart 
        processes={filteredProcessesForGantt} 
        selectedProcess={selectedProcess}
        chainName={chain.name}
      />
      
      <ProblemsTable 
        problems={allProblems} 
        sberChatLink={sberChatLink}
      />
    </div>
  );
};

export default ChainDetail;