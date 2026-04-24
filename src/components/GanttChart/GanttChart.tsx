import { useRef, useEffect, useState } from 'react';
import styles from './GanttChart.module.css';
import type { Process } from '../../types/chain.types';
import { parseDate } from '../utils/excelParser';

interface GanttChartProps {
  processes: Process[];
  selectedProcess?: string;
  chainName?: string;
}

const formatDateShort = (date: Date | null): string => {
  if (!date) return 'TBD';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
};

const isOverdue = (endDate: Date | null, percentage: number): boolean => {
  if (!endDate) return false;
  if (percentage >= 99.9) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate < today;
};

const isComplete = (percentage: number): boolean => {
  return percentage >= 99.9;
};

const hasValidDate = (date: any): boolean => {
  if (!date) return false;
  if (date instanceof Date && !isNaN(date.getTime())) return true;
  if (typeof date === 'string' && date.trim() !== '' && date !== 'TBD' && date !== '—') return true;
  return false;
};

const getStageColor = (stageName: string): string => {
  const colors: Record<string, string> = {
    'ИФТ1': '#3b82f6',
    'ИФТ2': '#10b981',
    'ИФТ3': '#f59e0b',
    'ИФТ4': '#8b5cf6',
    'ИФТ5': '#ef4444'
  };
  return colors[stageName] || '#6b7280';
};

const GanttChart = ({ processes, selectedProcess = 'all', chainName }: GanttChartProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [containerHeight, setContainerHeight] = useState(60);
  
  const allStagesList: any[] = [];
  
  processes.forEach(process => {
    process.iftStages.forEach(stage => {
      const startDate = parseDate(stage.startDate);
      const endDate = parseDate(stage.endDate);
      
      allStagesList.push({
        id: `${process.name}_${stage.name}`,
        processName: process.name,
        stageName: stage.name,
        startDate: startDate,
        endDate: endDate,
        startDateRaw: stage.startDate,
        endDateRaw: stage.endDate,
        percentage: stage.percentage,
        completedSteps: stage.completedSteps,
        totalSteps: stage.totalSteps,
        description: stage.description,
        chainName: chainName
      });
    });
  });
  
  const filteredForDisplay = allStagesList.filter(stage => {
    if (selectedProcess !== 'all' && stage.processName !== selectedProcess) return false;
    
    const hasDescription = stage.description && stage.description !== '';
    const hasDates = (stage.startDateRaw && stage.startDateRaw !== '') || (stage.endDateRaw && stage.endDateRaw !== '');
    const hasSteps = stage.totalSteps > 0 || stage.completedSteps > 0;
    return hasDescription || hasDates || hasSteps;
  });
  
  const stageOrder = ['ИФТ1', 'ИФТ2', 'ИФТ3', 'ИФТ4', 'ИФТ5'];
  filteredForDisplay.sort((a, b) => {
    return stageOrder.indexOf(a.stageName) - stageOrder.indexOf(b.stageName);
  });
  
  const displayedStages = showAll ? filteredForDisplay : filteredForDisplay.slice(0, 4);
  const hasMoreStages = filteredForDisplay.length > 4;
  
  let minDateTime: number = Infinity;
  let maxDateTime: number = -Infinity;
  
  allStagesList.forEach(stage => {
    if (stage.startDate && typeof stage.startDate.getTime === 'function') {
      const time = stage.startDate.getTime();
      if (time < minDateTime) minDateTime = time;
      if (time > maxDateTime) maxDateTime = time;
    }
    if (stage.endDate && typeof stage.endDate.getTime === 'function') {
      const time = stage.endDate.getTime();
      if (time < minDateTime) minDateTime = time;
      if (time > maxDateTime) maxDateTime = time;
    }
  });
  
  // Проверяем, есть ли незавершённые этапы (процент < 99.9% = не 100%)
  const hasUnfinishedStages = displayedStages.some(stage => stage.percentage < 0.999);
  
  // Расширяем до конца текущего месяца, только если есть незавершённые этапы
  if (hasUnfinishedStages) {
    const currentDate = new Date();
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    if (endOfCurrentMonth.getTime() > maxDateTime) {
      maxDateTime = endOfCurrentMonth.getTime();
    }
  }
  
  if (minDateTime === Infinity || maxDateTime === -Infinity) {
    const now = Date.now();
    minDateTime = now - 30 * 24 * 3600 * 1000;
    maxDateTime = now + 30 * 24 * 3600 * 1000;
  }
  
  const startDate = new Date(minDateTime);
  const endDate = new Date(maxDateTime);
  
  // Отступы: если есть незавершённые этапы, отступ 2 дня, иначе 0
  const padding = hasUnfinishedStages ? 2 : 0;
  startDate.setDate(startDate.getDate() - padding);
  endDate.setDate(endDate.getDate() + padding);
  
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
  
  const getPosition = (date: Date | null): number => {
    if (!date || typeof date.getTime !== 'function') return 0;
    const daysFromStart = (date.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    let position = (daysFromStart / totalDays) * 100;
    if (date.getTime() === maxDateTime) position = 100;
    return Math.max(0, Math.min(100, position));
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayPos = getPosition(today);
  
  // Микро-коррекция позиции (подберите значение на глаз: 0.1 - 0.5)
  const positionCorrection = 2; // Сдвиг влево на 0.2%
  const adjustedTodayPos = Math.max(0, Math.min(100, todayPos - positionCorrection));
  
  // Показываем маркер только если есть незавершённые этапы и today в пределах шкалы
  const showTodayMarker = hasUnfinishedStages && todayPos > 0 && todayPos < 100 && today <= endDate;
  
  const generateTimeMarks = () => {
    const marks = [];
    const current = new Date(startDate);
    current.setDate(1);
    
    while (current <= endDate) {
      marks.push({
        position: getPosition(current),
        label: current.toLocaleString('ru-RU', { month: 'short', year: 'numeric' })
      });
      current.setMonth(current.getMonth() + 1);
    }
    return marks;
  };
  
  const timeMarks = generateTimeMarks();
  
  const stageDatesMap = new Map<string, { 
    stageName: string; 
    dateStr: string; 
    color: string; 
    position: number;
    count: number;
  }>();
  
  filteredForDisplay.forEach(stage => {
    if (stage.endDate) {
      const dateStr = formatDateShort(stage.endDate);
      const key = `${stage.stageName}_${dateStr}`;
      const position = getPosition(stage.endDate);
      
      if (stageDatesMap.has(key)) {
        const existing = stageDatesMap.get(key)!;
        existing.count++;
      } else {
        stageDatesMap.set(key, {
          stageName: stage.stageName,
          dateStr: dateStr,
          color: getStageColor(stage.stageName),
          position: position,
          count: 1
        });
      }
    }
  });
  
  const stageDates = Array.from(stageDatesMap.values())
    .sort((a, b) => a.position - b.position);
  
  const levels: any[][] = [];
  stageDates.forEach(date => {
    let levelIndex = 0;
    while (true) {
      if (!levels[levelIndex]) levels[levelIndex] = [];
      const conflict = levels[levelIndex].some(existing => 
        Math.abs(existing.position - date.position) < 8
      );
      if (!conflict) {
        levels[levelIndex].push(date);
        break;
      }
      levelIndex++;
    }
  });
  
  const levelCount = levels.length;
  const calculatedHeight = Math.max(40, levelCount * 28);
  
  useEffect(() => {
    setContainerHeight(calculatedHeight);
  }, [calculatedHeight]);
  
  useEffect(() => {
    if (scrollRef.current && todayPos > 0 && todayPos < 100 && showTodayMarker) {
      const container = scrollRef.current;
      const scrollWidth = container.scrollWidth;
      const scrollPosition = (todayPos / 100) * scrollWidth - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayPos, showTodayMarker]);
  
  if (displayedStages.length === 0 || minDateTime === Infinity || maxDateTime === -Infinity) {
    return (
      <div className={styles.widget}>
        <h3 className={styles.title}>📅 Диаграмма Ганта</h3>
        <div className={styles.empty}>Нет данных для отображения</div>
      </div>
    );
  }
  
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>📅 Диаграмма Ганта</h3>
      
      <div className={styles.scrollContainer} ref={scrollRef}>
        <div className={styles.ganttContainer}>
          
          <div className={styles.monthsScale}>
            <div className={styles.timelineLine}>
              {timeMarks.map((mark, idx) => (
                <div 
                  key={idx}
                  className={styles.monthMark}
                  style={{ left: `${mark.position}%` }}
                >
                  {mark.label}
                </div>
              ))}
              
              {/* МАРКЕР "СЕГОДНЯ" НА ШКАЛЕ МЕСЯЦЕВ */}
              {showTodayMarker && (
                <div 
                  className={styles.todayMarker}
                  style={{ left: `${adjustedTodayPos}%` }}
                >
                  <div className={styles.todayLabel}>Сегодня</div>
                  <div className={styles.todayArrow}>▼</div>
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.datesContainer} style={{ height: `${containerHeight}px` }}>
            {levels.map((level, levelIdx) => (
              <div key={levelIdx} className={styles.datesRow} style={{ top: `${levelIdx * 28}px` }}>
                {level.map((date, dateIdx) => (
                  <div 
                    key={`date_${date.stageName}_${dateIdx}`}
                    className={styles.dateMarker}
                    style={{ left: `${date.position}%` }}
                  >
                    <div className={styles.dateDot} style={{ background: date.color }} />
                    <div className={styles.dateLabel} style={{ color: date.color }}>
                      {date.count > 1 ? `${date.stageName} (${date.count}) — ${date.dateStr}` : `${date.stageName} — ${date.dateStr}`}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className={styles.rows}>
            {displayedStages.map((stage) => {
              const startPos = stage.startDate ? getPosition(stage.startDate) : 0;
              const endPos = stage.endDate ? getPosition(stage.endDate) : 100;
              const barWidth = Math.max(endPos - startPos, 2);
              
              const hasStartDate = hasValidDate(stage.startDateRaw);
              const hasEndDate = hasValidDate(stage.endDateRaw);
              const completed = isComplete(stage.percentage);
              const stageColor = getStageColor(stage.stageName);
              const isTBD = stage.totalSteps === 0 && stage.completedSteps === 0;
              const displayTotal = stage.totalSteps === 0 && stage.completedSteps > 0 ? 'TBD' : stage.totalSteps;
              const overdue = isOverdue(stage.endDate, stage.percentage * 100);
              
              let trackClass = '';
              if (!hasStartDate && !hasEndDate) {
                trackClass = styles.noDates;
              } else if (!hasStartDate && hasEndDate) {
                trackClass = styles.noStartDate;
              } else if (hasStartDate && !hasEndDate && !completed) {
                trackClass = styles.noEndDate;
              } else if (!hasStartDate && !hasEndDate && stage.completedSteps > 0) {
                trackClass = styles.tbdProgress;
              } else {
                trackClass = styles.normalDates;
              }
              
              const displayPercent = Math.round(stage.percentage * 100);
              const fillPercent = Math.min(100, Math.max(0, stage.percentage * 100));
              const showPercent = true;
              
              let dateWarning = '';
              if (!hasStartDate && !hasEndDate) {
                dateWarning = '⚠️ Дата начала и окончания не определены';
              } else if (!hasStartDate && hasEndDate) {
                dateWarning = '⚠️ Дата начала не определена';
              } else if (hasStartDate && !hasEndDate && !completed) {
                dateWarning = '⚠️ Дата окончания не определена';
              }
              
              return (
                <div key={stage.id} className={styles.row}>
                  <div className={styles.rowName}>
                    <div className={styles.processName}>{stage.processName}</div>
                    <div className={styles.stageStats}>
                      {stage.completedSteps}/{isTBD ? '—' : displayTotal} шагов
                    </div>
                  </div>
                  <div className={styles.rowTimeline}>
                    <div className={`${styles.barTrack} ${trackClass}`} style={{ left: `${startPos}%`, width: `${barWidth}%` }}>
                      {stage.percentage > 0 && (
                        <div 
                          className={styles.fill} 
                          style={{ width: `${fillPercent}%` }}
                        />
                      )}
                      {showPercent && (
                        <span className={styles.percentLabel}>
                          {`${displayPercent}%`}
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.stageInfo}>
                      <span className={styles.stageBadgeSmall} style={{ background: stageColor, color: 'white' }}>
                        {stage.stageName}
                      </span>
                      {stage.description && (
                        <span className={styles.stageDescriptionSmall}>{stage.description}</span>
                      )}
                    </div>
                    
                    <div className={styles.warnings}>
                      {dateWarning && !completed && <div className={styles.warningDate}>{dateWarning}</div>}
                      {!completed && hasEndDate && overdue && !dateWarning && (
                        <div className={styles.warningOverdue}>
                          ⚠️ Просрочен до {formatDateShort(stage.endDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
        </div>
      </div>
      
      {hasMoreStages && (
        <button 
          className={styles.showMoreButton}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? '▲ Показать меньше' : '▼ Показать ещё'}
        </button>
      )}
    </div>
  );
};

export default GanttChart;