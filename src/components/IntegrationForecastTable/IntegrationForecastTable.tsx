import { useState, useMemo } from 'react';
import styles from './IntegrationForecastTable.module.css';
import type { Chain } from '../../types/chain.types';
import { parseDate } from '../utils/excelParser';

interface IntegrationForecastTableProps {
  chains: Chain[];
}

interface TableRow {
  chainName: string;
  processShortName: string;
  sp: string;
  insideForecast: string;
  insideStatus: number | string;
  outsideForecast: string;
  outsideStatus: number | string;
  psiForecast: string;
  psiStatus: number | string;
}

const formatDateShort = (date: Date | null): string => {
  if (!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const getIntegrationType = (integrationValue: string): 'inside' | 'outside' | 'none' => {
  if (!integrationValue) return 'none';
  if (integrationValue.includes('Внешники не требуются') || 
      integrationValue.includes('В СП внешники не требуются') || 
      integrationValue.includes('Внутри ERP')) {
    return 'inside';
  }
  if (integrationValue.includes('С внешниками')) {
    return 'outside';
  }
  return 'none';
};

const getStatusColorClass = (percent: number): string => {
  if (percent >= 80) return 'green';
  if (percent >= 50) return 'blue';
  if (percent >= 25) return 'yellow';
  if (percent > 0 && percent < 25) return 'red';
  return '';
};

const shouldShowRed = (forecastDate: string, status: number): boolean => {
  if (status !== 0) return false;
  if (!forecastDate || forecastDate === 'TBD' || forecastDate === 'Нет' || forecastDate === '') {
    return false;
  }
  
  const parts = forecastDate.split('.');
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const today = new Date();
    const forecastDateObj = new Date(today.getFullYear(), month, day);
    return forecastDateObj < today;
  }
  return false;
};

const IntegrationForecastTable = ({ chains }: IntegrationForecastTableProps) => {
  const [selectedChain, setSelectedChain] = useState<string>('all');
  // ⭐ Фильтры по СП (множественный выбор)
  const [selectedSpFilters, setSelectedSpFilters] = useState<string[]>([]);
  const [isSpDropdownOpen, setIsSpDropdownOpen] = useState(false);

  if (!chains || !Array.isArray(chains)) {
    return null;
  }

  const allTableData: TableRow[] = [];

  chains.forEach(chain => {
    if (!chain.processes || !Array.isArray(chain.processes)) {
      return;
    }
    
    chain.processes.forEach(process => {
      if (!process.iftStages || !Array.isArray(process.iftStages)) {
        return;
      }
      
      let lastInsideDate: Date | null = null;
      let lastOutsideDate: Date | null = null;
      let lastPsiDate: Date | null = null;
      
      let insideTotalSteps = 0;
      let insideCompletedSteps = 0;
      let outsideTotalSteps = 0;
      let outsideCompletedSteps = 0;
      let psiTotalSteps = 0;
      let psiCompletedSteps = 0;
      
      let hasOutsideIntegration = false;
      let hasInsideIntegration = false;

      process.iftStages.forEach(stage => {
        const integrationType = getIntegrationType(stage.integrationType || '');
        const endDate = parseDate(stage.endDate);
        const totalSteps = stage.totalSteps;
        const completedSteps = stage.completedSteps;

        const isPsi = stage.name && stage.name.includes('ПСИ');

        if (isPsi) {
          if (endDate && (!lastPsiDate || endDate > lastPsiDate)) {
            lastPsiDate = endDate;
          }
          psiTotalSteps += totalSteps;
          psiCompletedSteps += completedSteps;
        } else {
          if (integrationType === 'inside') {
            hasInsideIntegration = true;
            if (endDate && (!lastInsideDate || endDate > lastInsideDate)) {
              lastInsideDate = endDate;
            }
            insideTotalSteps += totalSteps;
            insideCompletedSteps += completedSteps;
          } else if (integrationType === 'outside') {
            hasOutsideIntegration = true;
            if (endDate && (!lastOutsideDate || endDate > lastOutsideDate)) {
              lastOutsideDate = endDate;
            }
            outsideTotalSteps += totalSteps;
            outsideCompletedSteps += completedSteps;
          }
        }
      });

      // Статус ВНУТРИ
      let insideStatus: number | string = 0;
      let insideForecast = '';
      
      if (!hasInsideIntegration) {
        insideForecast = 'NA';
        insideStatus = 'NA';
      } else if (insideTotalSteps > 0) {
        insideStatus = Math.round((insideCompletedSteps / insideTotalSteps) * 100);
        if (lastInsideDate) {
          insideForecast = formatDateShort(lastInsideDate);
        } else {
          insideForecast = 'TBD';
        }
      } else {
        insideStatus = 0;
        if (lastInsideDate) {
          insideForecast = formatDateShort(lastInsideDate);
        } else {
          insideForecast = 'TBD';
        }
      }

      // Статус ВНЕШ
      let outsideStatus: number | string = 0;
      let outsideForecast = '';
      
      if (!hasOutsideIntegration) {
        outsideForecast = 'NA';
        outsideStatus = 'NA';
      } else if (outsideTotalSteps > 0) {
        outsideStatus = Math.round((outsideCompletedSteps / outsideTotalSteps) * 100);
        if (lastOutsideDate) {
          outsideForecast = formatDateShort(lastOutsideDate);
        } else {
          outsideForecast = 'TBD';
        }
      } else {
        outsideStatus = 0;
        if (lastOutsideDate) {
          outsideForecast = formatDateShort(lastOutsideDate);
        } else {
          outsideForecast = 'TBD';
        }
      }

      // Статус ПСИ
      let psiStatus: number | string = 0;
      let psiForecast = '';
      
      if (psiTotalSteps > 0) {
        psiStatus = Math.round((psiCompletedSteps / psiTotalSteps) * 100);
        if (lastPsiDate) {
          psiForecast = formatDateShort(lastPsiDate);
        } else {
          psiForecast = 'TBD';
        }
      } else if (lastPsiDate) {
        psiStatus = 0;
        psiForecast = formatDateShort(lastPsiDate);
      } else {
        psiForecast = 'Нет';
        psiStatus = 0;
      }

      const hasAnyData = hasInsideIntegration || hasOutsideIntegration || psiTotalSteps > 0 || 
                         lastInsideDate !== null || lastOutsideDate !== null || lastPsiDate !== null;

      if (hasAnyData) {
        allTableData.push({
          chainName: chain.name,
          processShortName: process.shortName || process.name,
          sp: process.sp || '',
          insideForecast,
          insideStatus,
          outsideForecast,
          outsideStatus,
          psiForecast,
          psiStatus,
        });
      }
    });
  });

  // ⭐ Получаем уникальные СП для фильтра
  const uniqueSps = useMemo(() => {
    const spSet = new Set<string>();
    allTableData.forEach(row => {
      if (row.sp) spSet.add(row.sp);
    });
    return Array.from(spSet).sort();
  }, [allTableData]);

  // ⭐ Функции для работы с фильтром СП
  const toggleSpFilter = (sp: string) => {
    setSelectedSpFilters(prev =>
      prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp]
    );
  };

  const clearSpFilters = () => {
    setSelectedSpFilters([]);
  };

  // ⭐ Фильтруем данные по СП и цепочке
  const filteredData = useMemo(() => {
    let data = allTableData;
    
    // Фильтр по цепочке
    if (selectedChain !== 'all') {
      data = data.filter(row => row.chainName === selectedChain);
    }
    
    // Фильтр по СП
    if (selectedSpFilters.length > 0) {
      data = data.filter(row => selectedSpFilters.includes(row.sp));
    }
    
    return data;
  }, [selectedChain, selectedSpFilters, allTableData]);

  const uniqueChains = useMemo(() => {
    const chainsSet = new Set(allTableData.map(row => row.chainName));
    return Array.from(chainsSet).sort();
  }, [allTableData]);

  if (allTableData.length === 0) {
    return null;
  }

  const chainRowCounts: Record<string, number> = {};
  filteredData.forEach(row => {
    chainRowCounts[row.chainName] = (chainRowCounts[row.chainName] || 0) + 1;
  });

  let lastChainName = '';

  // ⭐ Подсчет количества выбранных фильтров
  const activeFiltersCount = (selectedChain !== 'all' ? 1 : 0) + selectedSpFilters.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📊 Прогноз по интеграциям</h3>
        
        <div className={styles.headerRight}>
          {/* ⭐ Фильтр по цепочке */}
          <div className={styles.filterWrapper}>
            <label className={styles.filterLabel}>📌 Цепочка:</label>
            <select 
              className={styles.filterSelect}
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
            >
              <option value="all">Все цепочки</option>
              {uniqueChains.map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
          </div>

          {/* ⭐ Фильтр по СП (множественный выбор) */}
          <div className={styles.filterDropdown}>
            <button 
              className={`${styles.filterDropdownButton} ${selectedSpFilters.length > 0 ? styles.active : ''}`}
              onClick={() => setIsSpDropdownOpen(!isSpDropdownOpen)}
            >
              СП {selectedSpFilters.length > 0 && `(${selectedSpFilters.length})`}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            {isSpDropdownOpen && (
              <div className={styles.filterDropdownMenu}>
                {uniqueSps.length === 0 && (
                  <div className={styles.filterEmptyMessage}>Нет доступных СП</div>
                )}
                {uniqueSps.map(sp => (
                  <label key={sp} className={styles.filterOption}>
                    <input
                      type="checkbox"
                      checked={selectedSpFilters.includes(sp)}
                      onChange={() => toggleSpFilter(sp)}
                    />
                    {sp}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* ⭐ Кнопка сброса фильтров */}
          {activeFiltersCount > 0 && (
            <button className={styles.clearFiltersButton} onClick={() => {
              setSelectedChain('all');
              clearSpFilters();
            }}>
              ✕ Сбросить
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Цепочка</th>
              <th>Процесс</th>
              <th>СП</th>
              <th>Прогноз ВНУТРИ</th>
              <th>Статус</th>
              <th>Прогноз ВНЕШ</th>
              <th>Статус</th>
              <th>Прогноз ПСИ</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const isNewChain = row.chainName !== lastChainName;
              const rowSpan = isNewChain ? chainRowCounts[row.chainName] : 0;
              
              if (isNewChain) {
                lastChainName = row.chainName;
              }

              const insideForecastClass = row.insideForecast === 'NA' ? 'forecastNa' : 
                                          row.insideForecast === 'TBD' ? 'forecastTbd' : '';
              const insideStatusDisplay = row.insideStatus === 'NA' ? 'NA' : `${row.insideStatus}%`;
              const insideStatusNumber = typeof row.insideStatus === 'number' ? row.insideStatus : 0;
              const isInsideRed = shouldShowRed(row.insideForecast, insideStatusNumber);
              const insideStatusClass = row.insideStatus === 'NA' ? 'statusNa' : 
                                        (isInsideRed ? 'red' : 
                                        (typeof row.insideStatus === 'number' ? getStatusColorClass(row.insideStatus) : ''));

              const outsideForecastClass = row.outsideForecast === 'NA' ? 'forecastNa' : 
                                           row.outsideForecast === 'TBD' ? 'forecastTbd' : '';
              const outsideStatusDisplay = row.outsideStatus === 'NA' ? 'NA' : `${row.outsideStatus}%`;
              const outsideStatusNumber = typeof row.outsideStatus === 'number' ? row.outsideStatus : 0;
              const isOutsideRed = shouldShowRed(row.outsideForecast, outsideStatusNumber);
              const outsideStatusClass = row.outsideStatus === 'NA' ? 'statusNa' : 
                                         (isOutsideRed ? 'red' : 
                                         (typeof row.outsideStatus === 'number' ? getStatusColorClass(row.outsideStatus) : ''));

              const psiForecastClass = row.psiForecast === 'Нет' ? 'forecastNa' : 
                                       row.psiForecast === 'TBD' ? 'forecastTbd' : '';
              const psiStatusDisplay = `${row.psiStatus}%`;
              const psiStatusNumber = typeof row.psiStatus === 'number' ? row.psiStatus : 0;
              const isPsiRed = shouldShowRed(row.psiForecast, psiStatusNumber);
              const psiStatusClass = isPsiRed ? 'red' : 
                                     (typeof row.psiStatus === 'number' ? getStatusColorClass(row.psiStatus) : '');

              return (
                <tr key={idx}>
                  {isNewChain && (
                    <td className={styles.chainCell} rowSpan={rowSpan}>
                      {row.chainName}
                    </td>
                  )}
                  <td className={styles.processCell}>{row.processShortName}</td>
                  <td className={styles.spCell}>{row.sp || '-'}</td>
                  <td className={`${styles.dateCell} ${styles[insideForecastClass]}`}>
                    {row.insideForecast}
                  </td>
                  <td className={`${styles.statusCell} ${styles[insideStatusClass]}`}>
                    {insideStatusDisplay}
                  </td>
                  <td className={`${styles.dateCell} ${styles[outsideForecastClass]}`}>
                    {row.outsideForecast}
                  </td>
                  <td className={`${styles.statusCell} ${styles[outsideStatusClass]}`}>
                    {outsideStatusDisplay}
                  </td>
                  <td className={`${styles.dateCell} ${styles[psiForecastClass]}`}>
                    {row.psiForecast}
                  </td>
                  <td className={`${styles.statusCell} ${styles[psiStatusClass]}`}>
                    {psiStatusDisplay}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredData.length === 0 && (
        <div className={styles.empty}>Нет данных для выбранных фильтров</div>
      )}
    </div>
  );
};

export default IntegrationForecastTable;