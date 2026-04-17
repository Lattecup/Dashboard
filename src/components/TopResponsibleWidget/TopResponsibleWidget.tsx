import styles from './TopResponsibleWidget.module.css';

interface Problem {
  id: string;
  description: string;
  processName: string;
  team: string;
  assignee: string;
  dueDate: string;
  type: string;
}

interface TopResponsibleWidgetProps {
  problems: Problem[];
  limit?: number;
}

interface ResponsibleStats {
  name: string;
  total: number;
  blocker: number;
  critical: number;
  regular: number;
}

const TopResponsibleWidget = ({ problems, limit = 5 }: TopResponsibleWidgetProps) => {
  const statsMap = new Map<string, ResponsibleStats>();

  problems.forEach(problem => {
    const name = problem.assignee;
    if (!name || name === '') return;

    if (!statsMap.has(name)) {
      statsMap.set(name, { name, total: 0, blocker: 0, critical: 0, regular: 0 });
    }

    const stats = statsMap.get(name)!;
    stats.total++;

    const type = problem.type.toLowerCase();
    if (type === 'блокер') stats.blocker++;
    else if (type === 'критичный') stats.critical++;
    else stats.regular++;
  });

  const sortedStats = Array.from(statsMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  const getRankClass = (index: number) => {
    if (index === 0) return styles.first;
    if (index === 1) return styles.second;
    if (index === 2) return styles.third;
    return '';
  };

  if (sortedStats.length === 0) {
    return (
      <div className={styles.widget}>
        <h3 className={styles.title}>👥 Топ ответственных по проблемам</h3>
        <div className={styles.empty}>Нет данных об ответственных</div>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>👥 Топ ответственных по проблемам</h3>
      <div className={styles.list}>
        {sortedStats.map((person, index) => (
          <div key={person.name} className={styles.item}>
            <div className={`${styles.rank} ${getRankClass(index)}`}>{index + 1}</div>
            <div className={styles.info}>
              <div className={styles.name}>{person.name}</div>
              <div className={styles.stats}>
                <span className={styles.total}>📋 Всего: {person.total}</span>
                {person.blocker > 0 && <span className={styles.blocker}>⚠️ Блокеры: {person.blocker}</span>}
                {person.critical > 0 && <span className={styles.critical}>🟠 Критичные: {person.critical}</span>}
                {person.regular > 0 && <span className={styles.regular}>📌 Обычные: {person.regular}</span>}
              </div>
            </div>
            <div className={styles.badge}>{person.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopResponsibleWidget;