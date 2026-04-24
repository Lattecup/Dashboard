import { useState } from 'react';
import styles from './Dashboard.module.css';
import FileUploader from '../FileUploader/FileUploader';
import ChainDetail from '../ChainDetail/ChainDetail';
import Instructions from '../Instructions/Instructions';
import type { Chain, ChainSummary } from '../../types/chain.types';
import { parseExcelFile } from '../utils/excelParser';

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  const [showProcessesProgress, setShowProcessesProgress] = useState(false);
  const [showAllProcesses, setShowAllProcesses] = useState(false);

  const handleFileLoad = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    
    try {
      const parsedChains = await parseExcelFile(file);
      setChains(parsedChains);
    } catch (error) {
      console.error('Ошибка при парсинге:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (): ChainSummary[] => {
    return chains.map(chain => {
      let totalProcesses = chain.processes.length;
      let totalProblems = chain.processes.reduce((acc, p) => acc + p.problems.length, 0);
      let totalCompletion = 0;
      let totalStages = 0;
      let overdueStages = 0;
      
      chain.processes.forEach(process => {
        process.iftStages.forEach(stage => {
          const hasData = stage.description || 
                          (stage.startDate && stage.startDate !== '') || 
                          (stage.endDate && stage.endDate !== '') ||
                          stage.totalSteps > 0;
          
          if (!hasData) return;
          
          const hasSteps = stage.totalSteps > 0;
          
          if (hasSteps) {
            const percentage = stage.percentage > 1 ? stage.percentage / 100 : stage.percentage;
            totalCompletion += percentage;
            totalStages++;
          }
          
          const endDate = new Date(stage.endDate);
          if (!isNaN(endDate.getTime()) && endDate < new Date() && stage.percentage < 100) {
            overdueStages++;
          }
        });
      });
      
      return {
        id: chain.id,
        name: chain.name,
        totalProcesses,
        totalProblems,
        avgCompletion: totalStages > 0 ? (totalCompletion / totalStages) * 100 : 0,
        overdueStages
      };
    });
  };

  const getAllProcesses = () => {
    const allProcesses: { name: string; chainName: string; percentage: number; problems: number; stages: number }[] = [];
    
    chains.forEach(chain => {
      chain.processes.forEach(process => {
        let totalCompletion = 0;
        let totalStages = 0;
        process.iftStages.forEach(stage => {
          const hasData = stage.description || 
                          (stage.startDate && stage.startDate !== '') || 
                          (stage.endDate && stage.endDate !== '') ||
                          stage.totalSteps > 0;
          
          if (!hasData) return;
          
          const hasSteps = stage.totalSteps > 0;
          if (hasSteps) {
            const percentage = stage.percentage > 1 ? stage.percentage / 100 : stage.percentage;
            totalCompletion += percentage;
            totalStages++;
          }
        });
        const avgCompletion = totalStages > 0 ? (totalCompletion / totalStages) * 100 : 0;
        
        allProcesses.push({
          name: process.name,
          chainName: chain.name,
          percentage: avgCompletion,
          problems: process.problems.length,
          stages: totalStages
        });
      });
    });
    
    return allProcesses.sort((a, b) => b.percentage - a.percentage);
  };

  const getPercentColor = (percentage: number) => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'blue';
    if (percentage >= 25) return 'yellow';
    return 'red';
  };

  const getOverallStats = () => {
    if (chains.length === 0) return null;
    
    let totalChains = chains.length;
    let totalProcesses = 0;
    let totalProblems = 0;
    let totalCompletion = 0;
    let totalStages = 0;
    let totalOverdue = 0;
    
    chains.forEach(chain => {
      totalProcesses += chain.processes.length;
      totalProblems += chain.processes.reduce((acc, p) => acc + p.problems.length, 0);
      
      chain.processes.forEach(process => {
        process.iftStages.forEach(stage => {
          const hasData = stage.description || 
                          (stage.startDate && stage.startDate !== '') || 
                          (stage.endDate && stage.endDate !== '') ||
                          stage.totalSteps > 0;
          
          if (!hasData) return;
          
          const hasSteps = stage.totalSteps > 0;
          if (hasSteps) {
            const percentage = stage.percentage > 1 ? stage.percentage / 100 : stage.percentage;
            totalCompletion += percentage;
            totalStages++;
          }
          
          const endDate = new Date(stage.endDate);
          if (!isNaN(endDate.getTime()) && endDate < new Date() && stage.percentage < 100) {
            totalOverdue++;
          }
        });
      });
    });
    
    return {
      totalChains,
      totalProcesses,
      totalProblems,
      avgCompletion: totalStages > 0 ? (totalCompletion / totalStages) * 100 : 0,
      totalOverdue
    };
  };

  const summaries = calculateSummary();
  const overall = getOverallStats();
  const allProcesses = getAllProcesses();
  const displayedProcesses = showAllProcesses ? allProcesses : allProcesses.slice(0, 4);
  const hasMoreProcesses = allProcesses.length > 4;

  const getProcessWord = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return 'процесс';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'процесса';
    return 'процессов';
  };

  if (selectedChainId) {
    const selectedChain = chains.find(c => c.id === selectedChainId);
    if (selectedChain) {
      return (
        <ChainDetail 
          chain={selectedChain} 
          onBack={() => setSelectedChainId(null)} 
        />
      );
    }
  }

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>📊 Статус ИФТ</h1>
      <p className={styles.subtitle}>Загрузите Excel файл с данными по сквозным цепочкам</p>

      <Instructions />

      <FileUploader 
        onFileLoad={handleFileLoad} 
        fileName={fileName} 
        loading={loading} 
      />

      {chains.length > 0 && (
        <>
          {overall && (
            <div className={styles.overallStats}>
              <h2 className={styles.sectionTitle}>📊 Общая сводка</h2>
              <div className={styles.overallGrid}>
                <div className={styles.overallCard}>
                  <div className={`${styles.overallValue} ${styles.primary}`}>{overall.totalChains}</div>
                  <div className={styles.overallLabel}>📌 Всего цепочек</div>
                </div>
                <div className={styles.overallCard}>
                  <div className={styles.overallValue}>{overall.totalProcesses}</div>
                  <div className={styles.overallLabel}>📋 Всего процессов</div>
                </div>
                <div className={styles.overallCard}>
                  <div className={`${styles.overallValue} ${styles.warning}`}>{overall.totalProblems}</div>
                  <div className={styles.overallLabel}>⚠️ Всего проблем</div>
                </div>
                <div className={styles.overallCard}>
                  <div className={`${styles.overallValue} ${styles.primary}`}>{Math.round(overall.avgCompletion)}%</div>
                  <div className={styles.overallLabel}>📈 Общая готовность</div>
                </div>
                <div className={styles.overallCard}>
                  <div className={`${styles.overallValue} ${styles.overdue}`}>{overall.totalOverdue}</div>
                  <div className={styles.overallLabel}>⏰ Просроченных этапов</div>
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.processesProgressSection}>
            <button 
              className={styles.accordionButton}
              onClick={() => setShowProcessesProgress(!showProcessesProgress)}
            >
              <span className={styles.accordionIcon}>{showProcessesProgress ? '▼' : '▶'}</span>
              📈 Прогресс по процессам
              <span className={styles.accordionCount}>
                {allProcesses.length} {getProcessWord(allProcesses.length)}
              </span>
            </button>
            
            {showProcessesProgress && (
              <div className={styles.accordionContent}>
                <div className={styles.processesProgressList}>
                  {displayedProcesses.map((process, idx) => {
                    const percentColor = getPercentColor(process.percentage);
                    return (
                      <div key={idx} className={styles.processProgressItem}>
                        <div className={styles.processProgressHeader}>
                          <div>
                            <span className={styles.processProgressName}>{process.name}</span>
                            <span className={styles.processProgressChain}>{process.chainName}</span>
                          </div>
                          <span className={`${styles.processProgressPercent} ${styles[percentColor]}`}>
                            {Math.round(process.percentage)}%
                          </span>
                        </div>
                        <div className={styles.processProgressBarWrapper}>
                          <div 
                            className={`${styles.processProgressBarFill} ${styles[percentColor]}`}
                            style={{ width: `${process.percentage}%` }}
                          />
                        </div>
                        <div className={styles.processProgressStats}>
                          <span>📋 {process.stages} этапов</span>
                          <span>⚠️ {process.problems} проблем</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {hasMoreProcesses && (
                  <button 
                    className={styles.showMoreButton}
                    onClick={() => setShowAllProcesses(!showAllProcesses)}
                  >
                    {showAllProcesses ? '▲ Показать меньше' : '▼ Показать ещё'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          <h2 className={styles.sectionTitle}>📋 Список цепочек</h2>
          <div className={styles.chainsGrid}>
            {summaries.map(summary => {
              const percentColor = getPercentColor(summary.avgCompletion);
              return (
                <div 
                  key={summary.id} 
                  className={styles.chainCard}
                  onClick={() => setSelectedChainId(summary.id)}
                >
                  <div className={styles.chainName}>{summary.name}</div>
                  <div className={styles.chainStats}>
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.processes}`}>{summary.totalProcesses}</span>
                      <span className={styles.statLabel}>Процессов</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.problems}`}>{summary.totalProblems}</span>
                      <span className={styles.statLabel}>Проблем</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.completion}`}>{Math.round(summary.avgCompletion)}%</span>
                      <span className={styles.statLabel}>Готовность</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.overdue}`}>{summary.overdueStages}</span>
                      <span className={styles.statLabel}>Просрочено</span>
                    </div>
                  </div>
                  <div className={styles.chainFooter}>
                    <div className={styles.chainProgressMini}>
                      <div className={styles.smallProgressBar}>
                        <div 
                          className={`${styles.smallProgressFill} ${styles[percentColor]}`}
                          style={{ width: `${summary.avgCompletion}%` }}
                        />
                      </div>
                    </div>
                    <span className={styles.detailLink}>Подробнее →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;