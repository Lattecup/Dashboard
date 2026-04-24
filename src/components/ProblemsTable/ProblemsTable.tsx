import { useState, useMemo } from 'react';
import styles from './ProblemsTable.module.css';
import type { Problem } from '../../types/chain.types';

interface ProblemsTableProps {
  problems: Problem[];
  sberChatLink?: string;
}

type SortField = 'description' | 'processName';
type SortOrder = 'asc' | 'desc';

const ProblemsTable = ({ problems, sberChatLink }: ProblemsTableProps) => {
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('description');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

  // Сортировка
  const sortedProblems = useMemo(() => {
    const sorted = [...filteredProblems];
    sorted.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortField) {
        case 'description':
          aVal = a.description;
          bVal = b.description;
          break;
        case 'processName':
          aVal = a.processName;
          bVal = b.processName;
          break;
      }
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
    return sorted;
  }, [filteredProblems, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle', opacity: 0.5 }}>
          <path d="M7 3v12M7 15l-3-3M7 15l3-3M17 21V9M17 9l-3 3M17 9l3 3" stroke="currentColor" strokeLinecap="round"/>
        </svg>
      );
    }
    if (sortOrder === 'asc') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle', color: '#3b82f6' }}>
          <path d="M12 5v14M12 5l-4 4M12 5l4 4" stroke="currentColor" strokeLinecap="round"/>
        </svg>
      );
    } else {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle', color: '#3b82f6' }}>
          <path d="M12 19V5M12 19l-4-4M12 19l4-4" stroke="currentColor" strokeLinecap="round"/>
        </svg>
      );
    }
  };

  if (problems.length === 0) {
    return (
      <div className={styles.tableContainer}>
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
    <div className={styles.tableContainer}>
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
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => handleSort('description')}>
              Проблема {getSortIcon('description')}
            </th>
            <th onClick={() => handleSort('processName')}>
              Процесс {getSortIcon('processName')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedProblems.map(problem => {
            // Парсим строку проблемы для отображения
            const parts = problem.description.split('|').map(p => p.trim());
            const problemText = parts[0] || problem.description;
            const assignee = parts[1] || '';
            const dueDate = parts[2] || '';
            
            return (
              <tr key={problem.id} className={styles.row}>
                <td className={styles.problemCell}>
                  <div className={styles.problemText}>{problemText}</div>
                  {(assignee || dueDate) && (
                    <div className={styles.problemMeta}>
                      {assignee && <span className={styles.assignee}>👤 {assignee}</span>}
                      {dueDate && <span className={styles.dueDate}>📅 {dueDate}</span>}
                    </div>
                  )}
                 </td>
                 <td>{problem.processName}</td>
              </tr>
            );
          })}
        </tbody>
       </table>
    </div>
  );
};

export default ProblemsTable;