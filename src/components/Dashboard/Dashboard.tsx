import { useState } from 'react';
import styles from './Dashboard.module.css';
import FileUploader from '../FileUploader/FileUploader';
import ChainDetail from '../ChainDetail/ChainDetail';
import Instructions from '../Instructions/Instructions';
import IntegrationForecastTable from '../IntegrationForecastTable/IntegrationForecastTable';
import type { Chain, ChainSummary } from '../../types/chain.types';
import { parseExcelFile, parseDate } from '../utils/excelParser';

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
      console.log('📊 Загруженные цепочки:', parsedChains);
      setChains(parsedChains);
    } catch (error) {
      console.error('Ошибка при парсинге:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentColor = (percentage: number) => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'blue';
    if (percentage >= 25) return 'yellow';
    return 'red';
  };

  const getPercentDisplay = (value: number): string => {
    if (value === -1) return 'NA';
    return `${Math.round(value)}%`;
  };

  const getPercentColorClass = (value: number): string => {
    if (value === -1) return 'na';
    return getPercentColor(value);
  };

  const calculateSummary = (): ChainSummary[] => {
    return chains.map(chain => {
      let totalProcesses = chain.processes.length;
      let totalProblems = chain.processes.reduce((acc, p) => acc + p.problems.length, 0);
      let overdueStages = 0;
      
      let totalIftInsideCompletion = 0;
      let totalIftInsideStages = 0;
      let totalIftOutsideCompletion = 0;
      let totalIftOutsideStages = 0;
      let totalPsiCompletion = 0;
      let totalPsiStages = 0;
      
      chain.processes.forEach(process => {
        process.iftStages.forEach(stage => {
          const hasData = stage.description || 
                          (stage.startDate && stage.startDate !== '') || 
                          (stage.endDate && stage.endDate !== '') ||
                          stage.totalSteps > 0;
          
          if (!hasData) return;
          
          const hasSteps = stage.totalSteps > 0;
          
          if (hasSteps) {
            let percentage = stage.percentage;
            if (percentage <= 1 && percentage > 0) percentage = percentage * 100;
            
            if (stage.name.includes('ПСИ')) {
              totalPsiCompletion += percentage;
              totalPsiStages++;
            } else {
              const integrationType = stage.integrationType || '';
              const isInside = integrationType.includes('Внутри ERP') || 
                               integrationType.includes('Внешники не требуются') || 
                               integrationType.includes('В СП внешники не требуются');
              const isOutside = integrationType.includes('С внешниками');
              
              if (isInside) {
                totalIftInsideCompletion += percentage;
                totalIftInsideStages++;
              }
              if (isOutside) {
                totalIftOutsideCompletion += percentage;
                totalIftOutsideStages++;
              }
            }
          }
          
          const endDate = parseDate(stage.endDate);
          let percentForCheck = stage.percentage;
          if (percentForCheck <= 1 && percentForCheck > 0) percentForCheck = percentForCheck * 100;
          const isNotComplete = percentForCheck < 99.9;
          if (endDate && endDate < new Date() && isNotComplete) {
            overdueStages++;
          }
        });
      });
      
      return {
        id: chain.id,
        name: chain.name,
        totalProcesses,
        totalProblems,
        overdueStages,
        avgIftInsideCompletion: totalIftInsideStages > 0 ? (totalIftInsideCompletion / totalIftInsideStages) : -1,
        avgIftOutsideCompletion: totalIftOutsideStages > 0 ? (totalIftOutsideCompletion / totalIftOutsideStages) : -1,
        avgPsiCompletion: totalPsiStages > 0 ? (totalPsiCompletion / totalPsiStages) : 0
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
            let percentage = stage.percentage;
            if (percentage <= 1 && percentage > 0) percentage = percentage * 100;
            totalCompletion += percentage;
            totalStages++;
          }
        });
        const avgCompletion = totalStages > 0 ? (totalCompletion / totalStages) : 0;
        
        allProcesses.push({
          name: process.shortName || process.name,
          chainName: chain.name,
          percentage: avgCompletion,
          problems: process.problems.length,
          stages: totalStages
        });
      });
    });
    
    return allProcesses.sort((a, b) => b.percentage - a.percentage);
  };

  const getOverallStats = () => {
    if (chains.length === 0) return null;
    
    let totalChains = chains.length;
    let totalProcesses = 0;
    let totalProblems = 0;
    let totalOverdue = 0;
    
    let totalIftCompletion = 0;
    let totalIftStages = 0;
    let totalPsiCompletion = 0;
    let totalPsiStages = 0;
    
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
            let percentage = stage.percentage;
            if (percentage <= 1 && percentage > 0) percentage = percentage * 100;
            
            if (stage.name.includes('ПСИ')) {
              totalPsiCompletion += percentage;
              totalPsiStages++;
            } else {
              totalIftCompletion += percentage;
              totalIftStages++;
            }
          }
          
          const endDate = parseDate(stage.endDate);
          let percentForCheck = stage.percentage;
          if (percentForCheck <= 1 && percentForCheck > 0) percentForCheck = percentForCheck * 100;
          const isNotComplete = percentForCheck < 99.9;
          if (endDate && endDate < new Date() && isNotComplete) {
            totalOverdue++;
          }
        });
      });
    });
    
    return {
      totalChains,
      totalProcesses,
      totalProblems,
      totalOverdue,
      avgIftCompletion: totalIftStages > 0 ? (totalIftCompletion / totalIftStages) : 0,
      avgPsiCompletion: totalPsiStages > 0 ? (totalPsiCompletion / totalPsiStages) : 0
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
      <h1 className={styles.title}>Статус СП</h1>
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
                  <div className={`${styles.overallValue} ${styles.green}`}>{Math.round(overall.avgIftCompletion)}%</div>
                  <div className={styles.overallLabel}>🔷 Готовность ИФТ</div>
                </div>
                <div className={styles.overallCard}>
                  <div className={`${styles.overallValue} ${styles.purple}`}>{Math.round(overall.avgPsiCompletion)}%</div>
                  <div className={styles.overallLabel}>🟣 Готовность ПСИ</div>
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
                    const processData = chains.find(chain => 
                      chain.processes.some(p => (p.shortName || p.name) === process.name)
                    )?.processes.find(p => (p.shortName || p.name) === process.name);
                    
                    let iftProgress = 0;
                    let psiProgress = 0;
                    
                    if (processData) {
                      let totalIftSteps = 0;
                      let completedIftSteps = 0;
                      let totalPsiSteps = 0;
                      let completedPsiSteps = 0;
                      
                      processData.iftStages.forEach(stage => {
                        if (stage.name.includes('ПСИ')) {
                          totalPsiSteps += stage.totalSteps;
                          completedPsiSteps += stage.completedSteps;
                        } else {
                          totalIftSteps += stage.totalSteps;
                          completedIftSteps += stage.completedSteps;
                        }
                      });
                      
                      iftProgress = totalIftSteps > 0 ? Math.round((completedIftSteps / totalIftSteps) * 100) : 0;
                      psiProgress = totalPsiSteps > 0 ? Math.round((completedPsiSteps / totalPsiSteps) * 100) : 0;
                    }
                    
                    const iftColor = getPercentColor(iftProgress);
                    const psiColor = getPercentColor(psiProgress);
                    
                    return (
                      <div key={idx} className={styles.processProgressItem}>
                        <div className={styles.processProgressHeader}>
                          <div>
                            <span className={styles.processProgressName}>{process.name}</span>
                            <span className={styles.processProgressChain}>{process.chainName}</span>
                          </div>
                          <div className={styles.processProgressOverall}>
                            <span className={`${styles.processProgressPercent} ${styles[getPercentColor(process.percentage)]}`}>
                              {Math.round(process.percentage)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className={styles.processProgressDetailed}>
                          <div className={styles.processProgressRow}>
                            <span className={styles.processProgressLabel}>🔷 ИФТ</span>
                            <div className={styles.processProgressBarWrapper}>
                              <div 
                                className={`${styles.processProgressBarFill} ${styles[iftColor]}`}
                                style={{ width: `${iftProgress}%` }}
                              />
                            </div>
                            <span className={`${styles.processProgressPercent} ${styles[iftColor]}`}>
                              {iftProgress}%
                            </span>
                          </div>
                          <div className={styles.processProgressRow}>
                            <span className={styles.processProgressLabel}>🟣 ПСИ</span>
                            <div className={styles.processProgressBarWrapper}>
                              <div 
                                className={`${styles.processProgressBarFill} ${styles[psiColor]}`}
                                style={{ width: `${psiProgress}%` }}
                              />
                            </div>
                            <span className={`${styles.processProgressPercent} ${styles[psiColor]}`}>
                              {psiProgress}%
                            </span>
                          </div>
                        </div>
                        
                        <div className={styles.processProgressStats}>
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
              const insideColor = getPercentColor(summary.avgIftInsideCompletion);
              const outsideColor = getPercentColor(summary.avgIftOutsideCompletion);
              const psiColor = getPercentColor(summary.avgPsiCompletion);
              return (
                <div 
                  key={summary.id} 
                  className={styles.chainCard}
                  onClick={() => setSelectedChainId(summary.id)}
                >
                  <div className={styles.chainName}>{summary.name}</div>
                  
                  <div className={styles.chainStatsRow}>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{summary.totalProcesses}</span>
                      <span className={styles.statLabel}>процессов</span>
                    </div>
                    
                    <div className={styles.divider}></div>
                    
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.problems}`}>{summary.totalProblems}</span>
                      <span className={styles.statLabel}>проблем</span>
                    </div>
                    
                    <div className={styles.divider}></div>
                    
                    <div className={styles.statItem}>
                      <span className={`${styles.statValue} ${styles.overdue}`}>{summary.overdueStages}</span>
                      <span className={styles.statLabel}>просрочено</span>
                    </div>
                  </div>
                  
                  <div className={styles.chainProgressRow}>
                    <div className={styles.progressItem}>
                      <span className={styles.progressLabel}>🔷 ИФТ (внутри)</span>
                      <span className={`${styles.progressValue} ${styles[getPercentColorClass(summary.avgIftInsideCompletion)]}`}>
                        {getPercentDisplay(summary.avgIftInsideCompletion)}
                      </span>
                    </div>
                    
                    <div className={styles.divider}></div>
                    
                    <div className={styles.progressItem}>
                      <span className={styles.progressLabel}>🌐 ИФТ (внеш)</span>
                      <span className={`${styles.progressValue} ${styles[getPercentColorClass(summary.avgIftOutsideCompletion)]}`}>
                        {getPercentDisplay(summary.avgIftOutsideCompletion)}
                      </span>
                    </div>
                    
                    <div className={styles.divider}></div>
                    
                    <div className={styles.progressItem}>
                      <span className={styles.progressLabel}>🟣 ПСИ</span>
                      <span className={`${styles.progressValue} ${styles[getPercentColorClass(summary.avgPsiCompletion)]}`}>
                        {getPercentDisplay(summary.avgPsiCompletion)}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.chainFooter}>
                    <span className={styles.detailLink}>Подробнее →</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <IntegrationForecastTable chains={chains} />
        </>
      )}
    </div>
  );
};

export default Dashboard;