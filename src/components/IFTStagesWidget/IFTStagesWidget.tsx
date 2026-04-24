import { useState, useEffect } from 'react';
import styles from './IFTStagesWidget.module.css';
import type { IFTStage } from '../../types/chain.types';

interface IFTStagesWidgetProps {
  stages: IFTStage[];
}

const IFTStagesWidget = ({ stages }: IFTStagesWidgetProps) => {
  const [showAll, setShowAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  
  // Фильтруем пустые этапы (нет описания, нет дат, нет шагов)
  const filteredStages = stages.filter(stage => {
    const hasDescription = stage.description && stage.description !== '';
    const hasDates = (stage.startDate && stage.startDate !== '') || (stage.endDate && stage.endDate !== '');
    const hasSteps = stage.totalSteps > 0 || stage.completedSteps > 0;
    return hasDescription || hasDates || hasSteps;
  });
  
  // Сортируем этапы по порядку (ИФТ1, ИФТ2...)
  const sortedStages = [...filteredStages].sort((a, b) => {
    const numA = parseInt(a.name.replace('ИФТ', '')) || 0;
    const numB = parseInt(b.name.replace('ИФТ', '')) || 0;
    return numA - numB;
  });
  
  // Адаптивное количество карточек
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width >= 1200) setVisibleCount(4);
      else if (width >= 768) setVisibleCount(3);
      else if (width >= 480) setVisibleCount(2);
      else setVisibleCount(1);
    };
    
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);
  
  const displayedStages = showAll ? sortedStages : sortedStages.slice(0, visibleCount);
  const hasMoreStages = sortedStages.length > visibleCount;
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'blue';
    if (percentage >= 25) return 'yellow';
    return 'red';
  };
  
  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('завершен') || statusLower.includes('готов')) return '✅';
    if (statusLower.includes('в работе') || statusLower.includes('в процессе')) return '🔄';
    if (statusLower.includes('план') || statusLower.includes('запланирован')) return '📅';
    if (statusLower.includes('просрочен')) return '⚠️';
    return '📌';
  };
  
  if (sortedStages.length === 0) {
    return null;
  }
  
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>📋 Этапы ИФТ</h3>
      <div className={styles.grid}>
        {displayedStages.map((stage) => {
          // stage.percentage уже в долях (0-1)
          const isTBD = stage.totalSteps === 0 && stage.completedSteps > 0;
          const displayTotal = isTBD ? 'TBD' : stage.totalSteps;
          const displayPercentage = stage.percentage * 100;
          const isPercentageTBD = stage.percentage === 0 && stage.completedSteps > 0 && stage.totalSteps === 0;
          const progressColor = getProgressColor(displayPercentage);
          
          return (
            <div key={stage.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.stageName}>{stage.name}</span>
                <span className={styles.statusIcon}>{getStatusIcon(stage.status)}</span>
              </div>
              <div className={styles.description}>
                {stage.description || '—'}
              </div>
              <div className={styles.dates}>
                <span>📅 {stage.startDate || '—'}</span>
                <span>→</span>
                <span>{stage.endDate || '—'}</span>
              </div>
              <div className={styles.stats}>
                <span className={styles.steps}>
                  📊 Шаги: {stage.completedSteps}/{displayTotal}
                </span>
                <span className={styles.status}>
                  {stage.status || '—'}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={`${styles.progressFill} ${styles[progressColor]}`}
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>
              <div className={styles.percentage}>
                {isPercentageTBD ? 'TBD' : `${Math.round(displayPercentage)}%`}
              </div>
            </div>
          );
        })}
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

export default IFTStagesWidget;