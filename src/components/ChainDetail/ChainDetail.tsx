import { useState, useMemo } from 'react';
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

interface FilterState {
  sp: string[];
  process: string[];
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
  const [filters, setFilters] = useState<FilterState>({
    sp: [],
    process: [],
  });
  const [isSpDropdownOpen, setIsSpDropdownOpen] = useState(false);
  const [isProcessDropdownOpen, setIsProcessDropdownOpen] = useState(false);

  const processes = chain.processes;

  // ⭐ Получаем уникальные СП
  const uniqueSps = useMemo(() => {
    const spSet = new Set<string>();
    processes.forEach(process => {
      if (process.sp) spSet.add(process.sp);
    });
    return Array.from(spSet).sort();
  }, [processes]);

  // ⭐ Получаем процессы, отфильтрованные по выбранным СП
  const filteredProcessesBySp = useMemo(() => {
    if (filters.sp.length === 0) {
      return processes;
    }
    return processes.filter(process => filters.sp.includes(process.sp));
  }, [processes, filters.sp]);

  // ⭐ Получаем уникальные процессы для второго фильтра (только те, что относятся к выбранным СП)
  const uniqueProcessesForFilter = useMemo(() => {
    const processSet = new Set<string>();
    filteredProcessesBySp.forEach(process => {
      processSet.add(process.shortName || process.name);
    });
    return Array.from(processSet).sort();
  }, [filteredProcessesBySp]);

  // ⭐ Финальная фильтрация процессов (по СП и по Процессу)
  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      const spMatch = filters.sp.length === 0 || filters.sp.includes(process.sp);
      const processMatch = filters.process.length === 0 || 
        filters.process.includes(process.shortName || process.name);
      return spMatch && processMatch;
    });
  }, [processes, filters]);

  const allProblems = filteredProcesses.flatMap(p => p.problems);

  // ⭐ Очищаем фильтр процессов, если меняется фильтр СП
  const toggleSpFilter = (sp: string) => {
    setFilters(prev => {
      const newSp = prev.sp.includes(sp) 
        ? prev.sp.filter(s => s !== sp) 
        : [...prev.sp, sp];
      
      // Если СП снимаем, проверяем, нужно ли очистить процессы
      const shouldClearProcesses = newSp.length === 0;
      
      return {
        sp: newSp,
        process: shouldClearProcesses ? [] : prev.process,
      };
    });
  };

  const toggleProcessFilter = (process: string) => {
    setFilters(prev => ({
      ...prev,
      process: prev.process.includes(process) 
        ? prev.process.filter(p => p !== process) 
        : [...prev.process, process]
    }));
  };

  const clearFilters = () => {
    setFilters({ sp: [], process: [] });
  };

  const getIftDeadline = (): string => {
    let latestDate: Date | null = null;
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        if (!stage.name.includes('ПСИ')) {
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

  const getPsiDeadline = (): string => {
    let latestDate: Date | null = null;
    
    filteredProcesses.forEach(process => {
      process.iftStages.forEach(stage => {
        if (stage.name.includes('ПСИ')) {
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
          
          if (stage.name.includes('ПСИ')) {
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
  const selectedProcessForWidget = filters.process.length === 1 ? filters.process[0] : 'all';

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={onBack}>
        ← Назад к списку цепочек
      </button>
      
      <h1 className={styles.title}>📊 {chain.name}</h1>
      
      <div className={styles.filtersSection}>
        <div className={styles.filtersGroup}>
          {/* ⭐ Фильтр по СП */}
          <div className={styles.filterDropdown}>
            <button 
              className={`${styles.filterDropdownButton} ${filters.sp.length > 0 ? styles.active : ''}`}
              onClick={() => {
                setIsSpDropdownOpen(!isSpDropdownOpen);
                setIsProcessDropdownOpen(false);
              }}
            >
              СП {filters.sp.length > 0 && `(${filters.sp.length})`}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            {isSpDropdownOpen && (
              <div className={styles.filterDropdownMenu}>
                {uniqueSps.map(sp => (
                  <label key={sp} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={filters.sp.includes(sp)}
                      onChange={() => toggleSpFilter(sp)}
                    />
                    {sp}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ⭐ Фильтр по Процессу (обновляется в зависимости от выбранных СП) */}
          <div className={styles.filterDropdown}>
            <button 
              className={`${styles.filterDropdownButton} ${filters.process.length > 0 ? styles.active : ''}`}
              onClick={() => {
                setIsProcessDropdownOpen(!isProcessDropdownOpen);
                setIsSpDropdownOpen(false);
              }}
            >
              Процесс {filters.process.length > 0 && `(${filters.process.length})`}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            {isProcessDropdownOpen && (
              <div className={styles.filterDropdownMenu}>
                {uniqueProcessesForFilter.length === 0 && filters.sp.length > 0 && (
                  <div className={styles.filterEmptyMessage}>
                    Нет процессов для выбранных СП
                  </div>
                )}
                {uniqueProcessesForFilter.map(process => (
                  <label key={process} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={filters.process.includes(process)}
                      onChange={() => toggleProcessFilter(process)}
                    />
                    {process}
                  </label>
                ))}
              </div>
            )}
          </div>

          {(filters.sp.length > 0 || filters.process.length > 0) && (
            <button className={styles.clearFiltersButton} onClick={clearFilters}>
              ✕ Сбросить
            </button>
          )}
        </div>
        
        <div className={styles.filterInfo}>
          {filteredProcesses.length === 0 ? (
            <span className={styles.filterInfoEmpty}>Нет процессов, соответствующих фильтрам</span>
          ) : (
            <span className={styles.filterInfoCount}>
              Показано {filteredProcesses.length} из {processes.length} процессов
            </span>
          )}
        </div>
      </div>
      
      <StatsWidget stats={stats} />

      <ProcessStagesWidget 
        processes={filteredProcesses} 
        selectedProcess={selectedProcessForWidget}
        chainName={chain.name}
      />      
      
      <ProblemsTable 
        problems={allProblems} 
      />
    </div>
  );
};

export default ChainDetail;