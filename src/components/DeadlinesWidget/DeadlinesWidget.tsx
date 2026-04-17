import styles from './DeadlinesWidget.module.css';

interface Problem {
  id: string;
  description: string;
  processName: string;
  team: string;
  assignee: string;
  dueDate: string;
  type: string;
}

interface DeadlinesWidgetProps {
  problems: Problem[];
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
}

const excelNumberToDate = (num: number): Date => {
  return new Date((num - 25569) * 86400 * 1000);
};

const DeadlinesWidget = ({ problems, onFilterChange, activeFilter }: DeadlinesWidgetProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayOfWeek = today.getDay();
  const monday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - monday);
  
  const startOfNextWeek = new Date(startOfThisWeek);
  startOfNextWeek.setDate(startOfThisWeek.getDate() + 7);
  
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

  let overdue = 0;
  let thisWeek = 0;
  let nextWeekCount = 0;

  problems.forEach(problem => {
    if (!problem.dueDate || problem.dueDate === '') return;
    const num = parseInt(problem.dueDate);
    if (isNaN(num)) return;
    const dueDate = excelNumberToDate(num);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      overdue++;
    } else if (dueDate >= startOfThisWeek && dueDate < startOfNextWeek) {
      thisWeek++;
    } else if (dueDate >= startOfNextWeek && dueDate <= endOfNextWeek) {
      nextWeekCount++;
    }
  });

  const handleCardClick = (filter: string) => {
    if (onFilterChange) onFilterChange(filter);
  };

  const getCardClass = (filter: string) => {
    const isActive = activeFilter === filter;
    return `${styles.card} ${isActive ? styles.active : ''}`;
  };

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>⏰ Дедлайны проблем</h3>
      <div className={styles.grid}>
        <div className={`${getCardClass('overdue')} ${styles.overdue}`} onClick={() => handleCardClick('overdue')} style={{ cursor: 'pointer' }}>
          <div className={styles.value}>{overdue}</div>
          <div className={styles.label}>🔴 Просрочено</div>
        </div>
        <div className={`${getCardClass('thisWeek')} ${styles.thisWeek}`} onClick={() => handleCardClick('thisWeek')} style={{ cursor: 'pointer' }}>
          <div className={styles.value}>{thisWeek}</div>
          <div className={styles.label}>🟠 На этой неделе</div>
        </div>
        <div className={`${getCardClass('nextWeek')} ${styles.nextWeek}`} onClick={() => handleCardClick('nextWeek')} style={{ cursor: 'pointer' }}>
          <div className={styles.value}>{nextWeekCount}</div>
          <div className={styles.label}>🔵 На следующей неделе</div>
        </div>
      </div>
    </div>
  );
};

export default DeadlinesWidget;