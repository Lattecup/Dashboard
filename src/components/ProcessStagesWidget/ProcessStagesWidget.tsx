import { useRef, useEffect, useState } from 'react';
import styles from './ProcessStagesWidget.module.css';
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

const getStepColor = (stage: any): string => {
  const percentage = stage.percentage;
  const endDate = parseDate(stage.endDateRaw);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (percentage >= 99.9) return '#059669';
  if (endDate && endDate < today) return '#dc2626';
  return '#4b5563';
};

const ProcessStagesWidget = ({ processes, selectedProcess = 'all' }: GanttChartProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [lineLeft, setLineLeft] = useState(0);
  
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
        percentage: stage.percentage * 100,
        completedSteps: stage.completedSteps,
        totalSteps: stage.totalSteps,
        description: stage.description,
      });
    });
  });
  
  const filteredForDisplay = allStagesList.filter(stage => {
    if (selectedProcess !== 'all' && stage.processName !== selectedProcess) return false;
    const hasDates = (stage.startDateRaw && stage.startDateRaw !== '') || (stage.endDateRaw && stage.endDateRaw !== '');
    const hasSteps = stage.totalSteps > 0 || stage.completedSteps > 0;
    return hasDates || hasSteps;
  });
  
  const stagesByProcess = new Map<string, any[]>();
  filteredForDisplay.forEach(stage => {
    if (!stagesByProcess.has(stage.processName)) {
      stagesByProcess.set(stage.processName, []);
    }
    stagesByProcess.get(stage.processName)!.push(stage);
  });
  
  const stageOrder = ['ИФТ1', 'ИФТ2', 'ИФТ3', 'ИФТ4', 'ИФТ5'];
  for (const stages of stagesByProcess.values()) {
    stages.sort((a, b) => stageOrder.indexOf(a.stageName) - stageOrder.indexOf(b.stageName));
  }
  
  const processList = Array.from(stagesByProcess.entries()).map(([name, stages]) => ({
    name,
    stages
  }));
  
  const displayedProcesses = showAll ? processList : processList.slice(0, 4);
  const hasMoreProcesses = processList.length > 4;
  
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
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  
  let referenceDate = Math.max(maxDateTime, todayTime);
  
  const hasUnfinishedOrOverdueStages = allStagesList.some(stage => {
    const isUnfinished = stage.percentage < 99.9;
    const isOverdue = stage.endDate && stage.endDate.getTime() < todayTime;
    return isUnfinished || isOverdue;
  });
  
  if (hasUnfinishedOrOverdueStages) {
    const referenceDateObj = new Date(referenceDate);
    const oneWeekAfter = new Date(referenceDateObj);
    oneWeekAfter.setDate(referenceDateObj.getDate() + 7);
    maxDateTime = oneWeekAfter.getTime();
  } else {
    maxDateTime = referenceDate;
  }
  
  if (minDateTime === Infinity || maxDateTime === -Infinity) {
    const now = Date.now();
    minDateTime = now - 30 * 24 * 3600 * 1000;
    maxDateTime = now + 30 * 24 * 3600 * 1000;
  }
  
  const startDate = new Date(minDateTime);
  const endDate = new Date(maxDateTime);
  
  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
  
  const getPosition = (date: Date | null): number => {
    if (!date || typeof date.getTime !== 'function') return 0;
    const daysFromStart = (date.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    let position = (daysFromStart / totalDays) * 100;
    return Math.max(0, Math.min(100, position));
  };
  
  const todayPos = getPosition(today);
  
  const getMondays = (start: Date, end: Date): Date[] => {
    const mondays: Date[] = [];
    const current = new Date(start);
    while (current.getDay() !== 1) {
      current.setDate(current.getDate() + 1);
    }
    
    while (current <= end) {
      mondays.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return mondays;
  };
  
  const mondays = getMondays(startDate, endDate);
  
  const getDescriptionLines = (text: string): number => {
    if (!text) return 0;
    const charsPerLine = 35;
    return Math.ceil(text.length / charsPerLine);
  };
  
  useEffect(() => {
    if (scrollRef.current && todayPos > 0 && todayPos < 100) {
      const container = scrollRef.current;
      const timelineWidth = container.clientWidth - 160;
      const leftPos = 160 + (todayPos / 100) * timelineWidth;
      setLineLeft(leftPos);
    }
  }, [todayPos]);
  
  useEffect(() => {
    if (scrollRef.current && todayPos > 0 && todayPos < 100) {
      const container = scrollRef.current;
      const scrollWidth = container.scrollWidth;
      const scrollPosition = (todayPos / 100) * scrollWidth - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [todayPos]);
  
  if (displayedProcesses.length === 0) {
    return (
      <div className={styles.widget}>
        <h3 className={styles.title}>📅 Шкала прогресса</h3>
        <div className={styles.empty}>Нет данных для отображения</div>
      </div>
    );
  }
  
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>📅 Шкала прогресса</h3>
      
      <div className={styles.scrollContainer} ref={scrollRef}>
        <div className={styles.ganttContainer}>
          
          <div className={styles.weeksScale}>
            <div className={styles.timelineLine}>
              {mondays.map((monday, idx) => {
                const position = getPosition(monday);
                const isEven = idx % 2 === 0;
                
                return (
                  <div 
                    key={idx}
                    className={`${styles.weekMark} ${isEven ? styles.weekMarkTop : styles.weekMarkBottom}`}
                    style={{ left: `${position}%` }}
                  >
                    {monday.toLocaleString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                );
              })}
            </div>
          </div>
          
          {todayPos > 0 && todayPos < 100 && (
            <div className={styles.todayMarker} style={{ left: `${lineLeft}px` }}>
              <div className={styles.todayLabel}>Сегодня</div>
              <div className={styles.todayArrow}>▼</div>
            </div>
          )}
          
          <div className={styles.rows}>
            {displayedProcesses.map((process) => (
              <div key={process.name} className={styles.row}>
                <div className={styles.rowName}>
                  <div className={styles.processName}>{process.name}</div>
                </div>
                <div className={styles.rowTimeline}>
                  <div className={styles.rowWeekGrid}>
                    {mondays.map((monday, idx) => (
                      <div
                        key={idx}
                        className={styles.weekLine}
                        style={{ left: `${getPosition(monday)}%` }}
                      />
                    ))}
                  </div>
                  
                  {process.stages.map((stage, index, array) => {
                    const startPos = stage.startDate ? getPosition(stage.startDate) : 0;
                    const endPos = stage.endDate ? getPosition(stage.endDate) : 100;
                    const barWidth = Math.max(endPos - startPos, 2);
                    const displayPercent = Math.round(stage.percentage);
                    const stepColor = getStepColor(stage);
                    const isTBD = stage.totalSteps === 0 && stage.completedSteps > 0;
                    const displayTotal = isTBD ? 'TBD' : stage.totalSteps;
                    const isFull = displayPercent >= 100;
                    
                    // Смотрим на следующий этап
                    const nextStage = array[index + 1];
                    const isLastStage = index === array.length - 1;
                    
                    // Для последнего этапа отступ не нужен
                    let marginBottom = 0;
                    if (!isLastStage) {
                      const nextStageDescription = nextStage?.description || '';
                      const nextStageLines = getDescriptionLines(nextStageDescription);
                      marginBottom = nextStageLines === 0 ? 24 : 36 + nextStageLines * 12;
                    }
                    
                    return (
                      <div 
                        key={stage.id} 
                        className={styles.stageWrapper}
                        style={{ marginBottom: `${marginBottom}px` }}
                      >
                        {stage.description && (
                          <div 
                            className={styles.stageDescriptionAbove}
                            style={{ left: `${startPos}%` }}
                          >
                            {stage.description}
                          </div>
                        )}
                        <div 
                          className={styles.barTrack}
                          style={{ left: `${startPos}%`, width: `${barWidth}%` }}
                        >
                          <div 
                            className={`${styles.fill} ${isFull ? styles.fillFull : ''}`}
                            style={{ width: `${displayPercent}%` }}
                          />
                          <div className={styles.stageContent}>
                            <span className={styles.percentLabel}>{displayPercent}%</span>
                            <span className={styles.stepsLabel} style={{ color: stepColor }}>
                              {stage.completedSteps}/{displayTotal}
                            </span>
                          </div>
                        </div>
                        
                        <div 
                          className={styles.endDateDot}
                          style={{ left: `${endPos}%` }}
                        >
                          <div className={styles.endDateDotPoint} />
                          <div className={styles.endDateDotLabel}>
                            {stage.endDate ? formatDateShort(stage.endDate) : 'TBD'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
      
      {hasMoreProcesses && (
        <button className={styles.showMoreButton} onClick={() => setShowAll(!showAll)}>
          {showAll ? '▲ Показать меньше' : '▼ Показать ещё'}
        </button>
      )}
    </div>
  );
};

export default ProcessStagesWidget;