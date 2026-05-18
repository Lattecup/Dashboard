import { useState, useMemo } from 'react';
import styles from './ProblemsTable.module.css';
import type { Problem } from '../../types/chain.types';

interface ProblemsTableProps {
  problems: Problem[];
  sberChatLink?: string;
}

const ProblemsTable = ({ problems, sberChatLink }: ProblemsTableProps) => {
  const [filterProcess, setFilterProcess] = useState<string>('all');

  // Уникальные процессы для фильтра
  const uniqueProcesses = useMemo(() => {
    return [...new Set(problems.map(p => p.processName))];
  }, [problems]);

  // Фильтрация
  const filteredProblems = useMemo(() => {
    let filtered = [...problems];
    if (filterProcess !== 'all') {
      filtered = filtered.filter(p => p.processName === filterProcess);
    }
    return filtered;
  }, [problems, filterProcess]);

  // Группировка проблем по процессам
  const groupedByProcess = useMemo(() => {
    const grouped: { [key: string]: Problem[] } = {};
    filteredProblems.forEach(problem => {
      if (!grouped[problem.processName]) {
        grouped[problem.processName] = [];
      }
      grouped[problem.processName].push(problem);
    });
    return grouped;
  }, [filteredProblems]);

  if (problems.length === 0) {
    return (
      <div id="problems-section" className={styles.tableContainer}>
        <div className={styles.title}>
          <span>📋 Список проблем</span>
          {sberChatLink && (
            <a href={sberChatLink} target="_blank" rel="noopener noreferrer" className={styles.sberChatButton}>
              💬 Сберчат
            </a>
          )}
        </div>
        <div className={styles.empty}>Нет проблем для отображения</div>
      </div>
    );
  }

  return (
    <div id="problems-section" className={styles.tableContainer}>
      <div className={styles.title}>
        <span>📋 Список проблем ({filteredProblems.length})</span>
        <div className={styles.titleRight}>
          <div className={styles.filters}>
            <select
              className={styles.filterSelect}
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
            >
              <option value="all">Все процессы</option>
              {uniqueProcesses.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {sberChatLink && (
            <a href={sberChatLink} target="_blank" rel="noopener noreferrer" className={styles.sberChatButton}>
              💬 Сберчат
            </a>
          )}
        </div>
      </div>
      
      {/* Группировка по процессам */}
      {Object.entries(groupedByProcess).map(([processName, processProblems]) => (
        <div key={processName} className={styles.processGroup}>
          <div className={styles.processHeader}>
            <span className={styles.processTitle}>{processName}</span>
          </div>
          <div className={styles.problemsList}>
            {processProblems.map(problem => {
              const parts = problem.description.split('|').map(p => p.trim());
              const problemText = parts[0] || problem.description;
              const assignee = parts[1] || '';
              const dueDate = parts[2] || '';
              
              return (
                <div key={problem.id} className={styles.problemItem}>
                  <div className={styles.problemText}>{problemText}</div>
                  {(assignee || dueDate) && (
                    <div className={styles.problemMeta}>
                      {assignee && <span className={styles.assignee}>👤 {assignee}</span>}
                      {dueDate && <span className={styles.dueDate}>📅 {dueDate}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProblemsTable;