import styles from './StatsWidget.module.css';
import type { ChainStats } from '../../types/chain.types';

interface StatsWidgetProps {
  stats: ChainStats;
}

const StatsWidget = ({ stats }: StatsWidgetProps) => {
  // Функция для скролла к списку проблем
  const scrollToProblems = () => {
    const problemsSection = document.getElementById('problems-section');
    if (problemsSection) {
      problemsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>📊 Ключевые показатели</h3>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.value}>{stats.totalProcesses}</div>
          <div className={styles.label}>📋 Всего процессов</div>
        </div>
        
        <div 
          className={`${styles.card} ${styles.critical}`}
          onClick={scrollToProblems}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.value}>{stats.totalProblems}</div>
          <div className={styles.label}>⚠️ Всего проблем</div>
        </div>
        
        <div className={`${styles.card} ${styles.green}`}>
          <div className={styles.value}>{Math.round(stats.avgIftCompletion)}%</div>
          <div className={styles.label}>🔷 Готовность ИФТ</div>
        </div>
        
        <div className={`${styles.card} ${styles.purple}`}>
          <div className={styles.value}>{Math.round(stats.avgPsiCompletion)}%</div>
          <div className={styles.label}>🟣 Готовность ПСИ</div>
        </div>
        
        <div className={`${styles.card} ${styles.warning}`}>
          <div className={styles.value}>{stats.overdueStages}</div>
          <div className={styles.label}>⏰ Просроченных этапов</div>
        </div>
        
        <div className={`${styles.card} ${styles.iftDeadline}`}>
          <div className={styles.value}>{stats.iftDeadline || 'Нет'}</div>
          <div className={styles.label}>📅 Дедлайн ИФТ</div>
        </div>
        
        <div className={`${styles.card} ${styles.psiDeadline}`}>
          <div className={styles.value}>{stats.psiDeadline || 'Нет'}</div>
          <div className={styles.label}>📅 Дедлайн ПСИ</div>
        </div>
      </div>
    </div>
  );
};

export default StatsWidget;