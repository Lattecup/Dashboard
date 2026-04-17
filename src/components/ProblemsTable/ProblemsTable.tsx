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
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextTwoWeeks = new Date(today);
  nextTwoWeeks.setDate(today.getDate() + 14);
  
  if (date < today) return 'overdue';
  if (date <= nextWeek) return 'thisWeek';
  if (date <= nextTwoWeeks) return 'nextWeek';
  return '';
};

const ProblemsTable = ({ problems, deadlineFilter, onClearDeadlineFilter }: ProblemsTableProps) => {
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDeadline, setFilterDeadline] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (deadlineFilter) setFilterDeadline(deadlineFilter);
  }, [deadlineFilter]);

  const getTypeBadgeClass = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'блокер') return styles.badgeBlocker;
    if (lowerType === 'критичный') return styles.badgeCritical;
    return styles.badgeRegular;
  };

  const getTypeLabel = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'блокер') return 'Блокер';
    if (lowerType === 'критичный') return 'Критичный';
    return 'Обычная';
  };

  const filteredProblems = useMemo(() => {
    let filtered = [...problems];
    if (filterProcess !== 'all') filtered = filtered.filter(p => p.processName === filterProcess);
    if (filterType !== 'all') filtered = filtered.filter(p => p.type.toLowerCase() === filterType);
    if (filterDeadline) filtered = filtered.filter(p => getProblemDeadlineCategory(p.dueDate) === filterDeadline);
    return filtered;
  }, [problems, filterProcess, filterType, filterDeadline]);

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
      return <span style={{ marginLeft: '6px', opacity: 0.5 }}>↕️</span>;
    }
    return <span style={{ marginLeft: '6px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const uniqueProcesses = useMemo(() => [...new Set(problems.map(p => p.processName))], [problems]);

  const clearAllFilters = () => {
    setFilterProcess('all');
    setFilterType('all');
    setFilterDeadline('');
    if (onClearDeadlineFilter) onClearDeadlineFilter();
  };

  const isFilterActive = filterProcess !== 'all' || filterType !== 'all' || filterDeadline !== '';

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
          <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Все типы</option>
            <option value="блокер">Блокеры</option>
            <option value="критичный">Критичные</option>
            <option value="обычный">Обычные</option>
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
            <th onClick={() => handleSort('type')}>Тип {getSortIcon('type')}</th>
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
              <td><span className={`${styles.badge} ${getTypeBadgeClass(problem.type)}`}>{getTypeLabel(problem.type)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProblemsTable;