import styles from './StatsWidget.module.css';
import type { ChainStats } from '../../types/chain.types';

interface StatsWidgetProps {
  stats: ChainStats;
  nearestDeadline?: string;
}

const StatsWidget = ({ stats, nearestDeadline }: StatsWidgetProps) => {
  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>📊 Ключевые показатели</h3>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.value}>{stats.totalProcesses}</div>
          <div className={styles.label}>📋 Всего процессов</div>
        </div>
        <div className={`${styles.card} ${styles.critical}`}>
          <div className={styles.value}>{stats.totalProblems}</div>
          <div className={styles.label}>⚠️ Всего проблем</div>
        </div>
        <div className={`${styles.card} ${styles.blue}`}>
          <div className={styles.value}>{Math.round(stats.avgCompletion)}%</div>
          <div className={styles.label}>📈 Средняя готовность</div>
        </div>
        <div className={`${styles.card} ${styles.warning}`}>
          <div className={styles.value}>{stats.overdueStages}</div>
          <div className={styles.label}>⏰ Просроченных этапов</div>
        </div>
        {nearestDeadline && (
          <div className={`${styles.card} ${styles.deadline}`}>
            <div className={styles.value}>{nearestDeadline}</div>
            <div className={styles.label}>📅 Ближайший дедлайн</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsWidget;