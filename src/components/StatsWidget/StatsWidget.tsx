import styles from './StatsWidget.module.css';

interface StatsWidgetProps {
  totalProblems: number;
  blockersAndCritical: number;
  iftStagesWithoutDate: number;
}

const StatsWidget = ({ totalProblems, blockersAndCritical, iftStagesWithoutDate }: StatsWidgetProps) => {
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Ключевые показатели</h3>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.label}>📋 ВСЕГО ПРОБЛЕМ</div>
          <div className={styles.value}>{totalProblems}</div>
        </div>
        <div className={`${styles.card} ${styles.critical}`}>
          <div className={styles.label}>⚠️ БЛОКЕРЫ / КРИТИЧНЫЕ</div>
          <div className={styles.value}>{blockersAndCritical}</div>
        </div>
        <div className={`${styles.card} ${styles.warning}`}>
          <div className={styles.label}>❓ TBD ЭТАПОВ</div>
          <div className={styles.value}>{iftStagesWithoutDate}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsWidget;