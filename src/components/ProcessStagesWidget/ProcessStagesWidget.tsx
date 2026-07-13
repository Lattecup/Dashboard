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

const formatDateForScale = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(2);
  return `${day}.${month}.${year}`;
};

const getBarTrackColor = (stageName: string): string => {
  if (stageName && stageName.includes('ПСИ')) {
    return '#f3e8ff';
  }
  return '#f3f4f6';
};

const getFillColor = (stageName: string): string => {
  if (stageName && stageName.includes('ПСИ')) {
    return '#a855f7';
  }
  return '#34d399';
};

const getStepColor = (stage: any): string => {
  const percentage = stage.percentage;
  const endDate = parseDate(stage.endDateRaw);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (percentage >= 99.9) {
    return stage.stageName && stage.stageName.includes('ПСИ') ? '#a855f7' : '#059669';
  }
  
  if (endDate && endDate < today) {
    return '#dc2626';
  }
  
  return '#4b5563';
};

const getIntegrationIcon = (integrationType?: string): string | null => {
  if (!integrationType) return null;
  if (integrationType.includes('Внутри ERP') || 
      integrationType.includes('Внешники не требуются')) {
    return '/images/img1.png';
  }
  if (integrationType.includes('С внешниками')) {
    return '/images/img2.png';
  }
  if (integrationType.includes('В СП внешники не требуются')) {
    return '/images/img3.png';
  }
  return null;
};

const isValidDateOrTBD = (value: string | undefined): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (trimmed === 'TBD') return true;
  return /^\d{2}\.\d{2}(\.\d{4})?$/.test(trimmed);
};

const ProcessStagesWidget = ({ processes, selectedProcess = 'all' }: GanttChartProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [lineLeft, setLineLeft] = useState(0);

  const allStagesList: any[] = [];
  const processPromDates = new Map<string, { inside: Date | null | string; outside: Date | null | string }>();

  processes.forEach(process => {
    processPromDates.set(process.name, {
      inside: process.datePromInside || null,
      outside: process.datePromOutside || null,
    });

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
        integrationType: stage.integrationType,
        stageNumber: stage.stageNumber || parseInt(stage.name.replace(/\D/g, '')) || 1,
        isPsi: stage.name && stage.name.includes('ПСИ'),
        datePromInside: process.datePromInside,
        datePromOutside: process.datePromOutside,
      });
    });
  });

  const filteredForDisplay = allStagesList.filter(stage => {
    if (selectedProcess !== 'all' && stage.processName !== selectedProcess) return false;
    
    if (stage.isPsi) {
      const hasValidStart = isValidDateOrTBD(stage.startDateRaw);
      const hasValidEnd = isValidDateOrTBD(stage.endDateRaw);
      if (!hasValidStart && !hasValidEnd) {
        return false;
      }
    }
    
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

  processes.forEach(process => {
    if (selectedProcess !== 'all' && process.name !== selectedProcess) return;
    if (!stagesByProcess.has(process.name)) {
      stagesByProcess.set(process.name, []);
    }
  });

  for (const stages of stagesByProcess.values()) {
    stages.sort((a, b) => {
      if (a.stageNumber !== b.stageNumber) return a.stageNumber - b.stageNumber;
      if (!a.isPsi && b.isPsi) return -1;
      if (a.isPsi && !b.isPsi) return 1;
      return 0;
    });
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

  processPromDates.forEach((dates) => {
    if (dates.inside instanceof Date) {
      const time = dates.inside.getTime();
      if (time < minDateTime) minDateTime = time;
      if (time > maxDateTime) maxDateTime = time;
    }
    if (dates.outside instanceof Date) {
      const time = dates.outside.getTime();
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

  const shouldShowDate = (index: number, total: number): boolean => {
    if (total <= 10) return true;
    if (total <= 20) return index % 2 === 0;
    return index % 3 === 0;
  };

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
                const showDate = shouldShowDate(idx, mondays.length);
                return (
                  <div 
                    key={idx}
                    className={`${styles.weekMark} ${isEven ? styles.weekMarkTop : styles.weekMarkBottom}`}
                    style={{ left: `${position}%` }}
                  >
                    {showDate ? formatDateForScale(monday) : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {todayPos > 0 && todayPos < 100 && (
            <>
              <div className={styles.todayMarker} style={{ left: `${lineLeft}px` }}>
                <div className={styles.todayLabel}>Сегодня</div>
                <div className={styles.todayArrow}>▼</div>
              </div>
              <div className={styles.todayVerticalLine} style={{ left: `${lineLeft}px` }} />
            </>
          )}

          <div className={styles.rows}>
            {displayedProcesses.map((process) => {
              if (process.stages.length === 0) {
                return (
                  <div key={process.name} className={styles.row}>
                    <div className={styles.rowName}>
                      <div className={styles.processName}>{process.name}</div>
                    </div>
                    <div className={styles.rowTimelineEmpty}>
                      <div className={styles.emptyProcessMessage}>Нет запланированных этапов</div>
                    </div>
                  </div>
                );
              }

              const promDates = processPromDates.get(process.name) || { inside: null, outside: null };
              const promItems = [];
              
              if (promDates.inside instanceof Date) {
                promItems.push({ type: 'inside', date: promDates.inside, label: 'ПРОМ внутри', pos: getPosition(promDates.inside) });
              } else if (typeof promDates.inside === 'string' && promDates.inside !== null) {
                promItems.push({ type: 'inside', date: null, label: 'ПРОМ внутри', pos: 50 });
              }
              if (promDates.outside instanceof Date) {
                promItems.push({ type: 'outside', date: promDates.outside, label: 'ПРОМ внеш', pos: getPosition(promDates.outside) });
              } else if (typeof promDates.outside === 'string' && promDates.outside !== null) {
                promItems.push({ type: 'outside', date: null, label: 'ПРОМ внеш', pos: 50 });
              }

              return (
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
                      const barTrackColor = getBarTrackColor(stage.stageName);
                      const fillColor = getFillColor(stage.stageName);

                      const nextStage = array[index + 1];
                      const isLastStage = index === array.length - 1;

                      let marginBottom = 0;
                      if (!isLastStage) {
                        const nextStageDescription = nextStage?.description || '';
                        const nextStageLines = getDescriptionLines(nextStageDescription);
                        marginBottom = nextStageLines === 0 ? 24 : 36 + nextStageLines * 12;
                      }

                      const iconSrc = getIntegrationIcon(stage.integrationType);
                      const hasIntegrationIcon = !!iconSrc;
                      const isPsi = stage.isPsi;

                      let finalMarginBottom = marginBottom;
                      if (hasIntegrationIcon) {
                        finalMarginBottom = Math.max(finalMarginBottom, 60);
                      }
                      if (isPsi && !hasIntegrationIcon) {
                        finalMarginBottom = Math.max(finalMarginBottom, 24);
                      }

                      return (
                        <div 
                          key={stage.id} 
                          className={styles.stageWrapper}
                          style={{ marginBottom: `${finalMarginBottom}px` }}
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
                            style={{ 
                              left: `${startPos}%`, 
                              width: `${barWidth}%`,
                              backgroundColor: barTrackColor,
                            }}
                          >
                            <div 
                              className={`${styles.fill} ${isFull ? styles.fillFull : ''}`}
                              style={{ 
                                width: `${displayPercent}%`, 
                                backgroundColor: fillColor
                              }}
                            />
                            <div className={styles.stageContent}>
                              {iconSrc && (
                                <img 
                                  src={iconSrc} 
                                  className={styles.integrationIconInline}
                                  alt="integration"
                                />
                              )}
                              <span className={styles.percentLabel}>{displayPercent}%</span>
                              <span className={styles.stepsLabel} style={{ color: stepColor }}>
                                {stage.completedSteps}/{displayTotal}
                              </span>
                            </div>
                          </div>

                          <div 
                            className={styles.endDateDot}
                            style={{ 
                              left: `${endPos}%`,
                              top: '28px'
                            }}
                          >
                            <div className={styles.endDateDotPoint} />
                            <div className={styles.endDateDotLabel}>
                              {stage.endDate ? formatDateShort(stage.endDate) : 'TBD'}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* ⭐ ПРОМ — на разных уровнях с большим отступом */}
                    {promItems.length > 0 && (
                      <div className={styles.promWrapper}>
                        {promItems.map((item, idx) => (
                          <div 
                            key={idx}
                            className={`${styles.promItem} ${item.type === 'inside' ? styles.promItemInside : styles.promItemOutside}`}
                            style={{ 
                              position: 'absolute',
                              left: `${item.pos}%`,
                              transform: 'translateX(-50%)',
                              bottom: item.type === 'inside' ? '-44px' : '-76px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              zIndex: 15,
                            }}
                          >
                            <div className={styles.promDotPoint} />
                            <div className={styles.promLabel}>{item.label}</div>
                            <div className={styles.promDate}>
                              {item.date ? formatDateShort(item.date) : 'TBD'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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