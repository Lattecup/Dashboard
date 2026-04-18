import styles from './StagesTimeline.module.css';

interface IFTStage {
  id: string;
  name: string;
  dueDate: string;
  totalSteps: number;
  completedSteps: number;
}

interface Process {
  id: string;
  name: string;
  team: string;
  iftStages: IFTStage[];
}

interface StagesTimelineProps {
  processes: Process[];
}

const excelNumberToDate = (num: number): Date => {
  return new Date((num - 25569) * 86400 * 1000);
};

const parseDate = (dateValue: string): Date | null => {
  if (!dateValue) return null;
  if (/^\d+$/.test(dateValue)) {
    const num = parseInt(dateValue);
    if (!isNaN(num)) return excelNumberToDate(num);
  }
  if (dateValue.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const parts = dateValue.split('.');
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(date.getTime())) return date;
  }
  if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
};

const getDateStatus = (dueDate: string): 'overdue' | 'thisWeek' | 'nextWeek' | 'future' => {
  if (!dueDate) return 'future';
  const date = parseDate(dueDate);
  if (!date) return 'future';
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextTwoWeeks = new Date(today);
  nextTwoWeeks.setDate(today.getDate() + 14);
  
  if (date < today) return 'overdue';
  if (date <= nextWeek) return 'thisWeek';
  if (date <= nextTwoWeeks) return 'nextWeek';
  return 'future';
};

const formatDateDisplay = (dueDate: string): string => {
  if (!dueDate) return 'Дата не указана';
  const date = parseDate(dueDate);
  if (!date) return dueDate;
  return date.toLocaleDateString('ru-RU');
};

const getProgressColor = (percentage: number) => {
  if (percentage >= 80) return 'green';
  if (percentage >= 50) return 'blue';
  if (percentage >= 25) return 'yellow';
  return 'red';
};

const StagesTimeline = ({ processes }: StagesTimelineProps) => {
  const allStages: {
    processName: string;
    stageName: string;
    dueDate: string;
    totalSteps: number;
    completedSteps: number;
    percentage: number;
    isTBD: boolean;
    status: string;
  }[] = [];

  processes.forEach(process => {
    process.iftStages.forEach(stage => {
      let percentage = 0;
      let isTBD = false;
      const status = getDateStatus(stage.dueDate);
      
      if (stage.totalSteps === 0 && stage.completedSteps > 0) {
        isTBD = true;
        percentage = 0;
      } else if (stage.totalSteps > 0) {
        percentage = (stage.completedSteps / stage.totalSteps) * 100;
      }
      
      allStages.push({
        processName: process.name,
        stageName: stage.name,
        dueDate: stage.dueDate,
        totalSteps: stage.totalSteps,
        completedSteps: stage.completedSteps,
        percentage,
        isTBD,
        status
      });
    });
  });

  const sortedStages = [...allStages].sort((a, b) => {
    const dateA = parseDate(a.dueDate);
    const dateB = parseDate(b.dueDate);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.getTime() - dateB.getTime();
  });

  if (sortedStages.length === 0) {
    return (
      <div className={styles.widget}>
        <h3 className={styles.title}>📅 Таймлайн этапов ИФТ</h3>
        <div className={styles.empty}>Нет данных об этапах</div>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>📅 Таймлайн этапов ИФТ</h3>
      <div className={styles.timeline}>
        {sortedStages.map((stage, idx) => {
          const progressColor = getProgressColor(stage.percentage);
          
          return (
            <div key={idx} className={styles.timelineItem}>
              <div className={`${styles.timelineDot} ${styles[stage.status]}`} />
              <div className={styles.timelineContent}>
                <div className={styles.timelineHeader}>
                  <div>
                    <span className={styles.timelineProcess}>{stage.processName}</span>
                    <span className={styles.timelineStage}>— {stage.stageName}</span>
                  </div>
<span className={`${styles.timelineDate} ${styles[stage.status]}`}>
  {stage.status === 'overdue' && '⚠️ '}
  {formatDateDisplay(stage.dueDate)}
  {stage.status === 'overdue' && ' Просрочен'}
</span>
                </div>
                <div className={styles.timelineProgress}>
                  <div className={styles.progressBar}>
                    {!stage.isTBD ? (
                      <div className={`${styles.progressFill} ${styles[progressColor]}`} style={{ width: `${stage.percentage}%` }} />
                    ) : (
                      <div className={`${styles.progressFill} ${styles.gray}`} style={{ width: `100%` }} />
                    )}
                  </div>
                  <div className={styles.progressText}>
                    {!stage.isTBD ? (
                      <>Шаги: {stage.completedSteps} / {stage.totalSteps} • {Math.round(stage.percentage)}%</>
                    ) : (
                      <>Шаги: {stage.completedSteps} / TBD • TBD</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StagesTimeline;