import { useState, useMemo, useEffect } from 'react';
import styles from './ProblemsTable.module.css';

interface Problem {
  id: string;
  description: string;
  processName: string;
  team: string;
  assignee: string;
  dueDate: string;
  type: string;
}

interface ProblemsTableProps {
  problems: Problem[];
  processes: { id: string; name: string }[];
  deadlineFilter?: string;
  onClearDeadlineFilter?: () => void;
}

type SortField = 'description' | 'processName' | 'assignee' | 'dueDate' | 'type';
type SortOrder = 'asc' | 'desc';

const excelNumberToDate = (num: number): Date => {
  return new Date((num - 25569) * 86400 * 1000);
};

const isOverdue = (dueDate: string): boolean => {
  if (!dueDate) return false;
  const num = parseInt(dueDate);
  if (isNaN(num)) return false;
  const date = excelNumberToDate(num);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const formatDateForDisplay = (dueDate: string): string => {
  if (!dueDate) return '—';
  const num = parseInt(dueDate);
  if (isNaN(num)) return dueDate;
  const date = excelNumberToDate(num);
  return date.toLocaleDateString('ru-RU');
};

const getProblemDeadlineCategory = (dueDate: string): string => {
  if (!dueDate) return '';
  const num = parseInt(dueDate);
  if (isNaN(num)) return '';
  const date = excelNumberToDate(num);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayOfWeek = today.getDay();
  const monday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - monday);
  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  const startOfNextWeek = new Date(startOfThisWeek);
  startOfNextWeek.setDate(startOfThisWeek.getDate() + 7);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  
  if (date < today) return 'overdue';
  if (date >= startOfThisWeek && date <= endOfThisWeek) return 'thisWeek';
  if (date >= startOfNextWeek && date <= endOfNextWeek) return 'nextWeek';
  return '';
};

const getPriorityBadgeClass = (priority: string) => {
  const lowerPriority = priority.toLowerCase();
  if (lowerPriority === 'блокер') return styles.badgeBlocker;
  if (lowerPriority === 'критичный') return styles.badgeCritical;
  if (lowerPriority === 'высокий') return styles.badgeHigh;
  if (lowerPriority === 'средний') return styles.badgeMedium;
  return styles.badgeLow;
};

const getPriorityLabel = (priority: string) => {
  const lowerPriority = priority.toLowerCase();
  if (lowerPriority === 'блокер') return 'Блокер';
  if (lowerPriority === 'критичный') return 'Критичный';
  if (lowerPriority === 'высокий') return 'Высокий';
  if (lowerPriority === 'средний') return 'Средний';
  return 'Низкий';
};

const ProblemsTable = ({ problems, processes, deadlineFilter, onClearDeadlineFilter }: ProblemsTableProps) => {
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDeadline, setFilterDeadline] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (deadlineFilter) setFilterDeadline(deadlineFilter);
  }, [deadlineFilter]);

  const filteredProblems = useMemo(() => {
    let filtered = [...problems];
    if (filterProcess !== 'all') filtered = filtered.filter(p => p.processName === filterProcess);
    if (filterPriority !== 'all') filtered = filtered.filter(p => p.type.toLowerCase() === filterPriority);
    if (filterDeadline) filtered = filtered.filter(p => getProblemDeadlineCategory(p.dueDate) === filterDeadline);
    return filtered;
  }, [problems, filterProcess, filterPriority, filterDeadline]);

  const sortedProblems = useMemo(() => {
    const sorted = [...filteredProblems];
    sorted.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'description': aVal = a.description; bVal = b.description; break;
        case 'processName': aVal = a.processName; bVal = b.processName; break;
        case 'assignee': aVal = a.assignee; bVal = b.assignee; break;
        case 'dueDate': aVal = parseInt(a.dueDate) || 0; bVal = parseInt(b.dueDate) || 0; break;
        case 'type': aVal = a.type; bVal = b.type; break;
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [filteredProblems, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
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

  const uniqueProcesses = useMemo(() => [...new Set(problems.map(p => p.processName))], [problems]);

  const clearAllFilters = () => {
    setFilterProcess('all');
    setFilterPriority('all');
    setFilterDeadline('');
    if (onClearDeadlineFilter) onClearDeadlineFilter();
  };

  const isFilterActive = filterProcess !== 'all' || filterPriority !== 'all' || filterDeadline !== '';

  if (problems.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <h3 className={styles.title}>📋 Список проблем</h3>
        <div className={styles.empty}>Нет проблем для отображения</div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.title}>
        <span>📋 Список проблем ({filteredProblems.length})</span>
        <div className={styles.filters}>
          {isFilterActive && <button onClick={clearAllFilters} className={styles.clearButton}>✕ Сбросить фильтры</button>}
          <select className={styles.filterSelect} value={filterProcess} onChange={(e) => setFilterProcess(e.target.value)}>
            <option value="all">Все процессы</option>
            {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={styles.filterSelect} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="all">Все приоритеты</option>
            <option value="блокер">Блокер</option>
            <option value="критичный">Критичный</option>
            <option value="высокий">Высокий</option>
            <option value="средний">Средний</option>
            <option value="низкий">Низкий</option>
          </select>
          {filterDeadline && (
            <div className={styles.activeDeadlineFilter}>
              Фильтр: {filterDeadline === 'overdue' ? '🔴 Просрочено' : filterDeadline === 'thisWeek' ? '🟠 На этой неделе' : '🔵 На следующей неделе'}
            </div>
          )}
        </div>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => handleSort('description')}>Проблема {getSortIcon('description')}</th>
            <th onClick={() => handleSort('processName')}>Процесс {getSortIcon('processName')}</th>
            <th onClick={() => handleSort('assignee')}>Исполнитель {getSortIcon('assignee')}</th>
            <th onClick={() => handleSort('dueDate')}>Срок {getSortIcon('dueDate')}</th>
            <th onClick={() => handleSort('type')}>Приоритет {getSortIcon('type')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedProblems.map(problem => (
            <tr key={problem.id} className={styles.row}>
              <td className={styles.problemTitle}>{problem.description}</td>
              <td>{problem.processName}</td>
              <td>{problem.assignee}</td>
              <td className={isOverdue(problem.dueDate) ? styles.overdue : ''}>
                {formatDateForDisplay(problem.dueDate)} {isOverdue(problem.dueDate) && '⚠️'}
              </td>
              <td><span className={`${styles.badge} ${getPriorityBadgeClass(problem.type)}`}>{getPriorityLabel(problem.type)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProblemsTable;