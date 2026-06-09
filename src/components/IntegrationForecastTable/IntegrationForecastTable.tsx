import React, { useState, useMemo } from 'react';
import styles from './IntegrationForecastTable.module.css';
import type { Chain } from '../../types/chain.types';
import { parseDate } from '../utils/excelParser';

interface IntegrationForecastTableProps {
  chains: Chain[];
}

interface TableRow {
  chainName: string;
  processShortName: string;
  insideForecast: string;
  insideStatus: number | string;
  outsideForecast: string;
  outsideStatus: number | string;
}

const formatDateShort = (date: Date | null): string => {
  if (!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const normalizePercent = (value: number): number => {
  if (value <= 1 && value > 0) return value * 100;
  return value;
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
  return 'red';
};

const IntegrationForecastTable = ({ chains }: IntegrationForecastTableProps) => {
  const [selectedChain, setSelectedChain] = useState<string>('all');

  const allTableData: TableRow[] = [];

  chains.forEach(chain => {
    chain.processes.forEach(process => {
      let lastInsideDate: Date | null = null;
      let lastOutsideDate: Date | null = null;
      let insideTotalSteps = 0;
      let insideCompletedSteps = 0;
      let outsideTotalSteps = 0;
      let outsideCompletedSteps = 0;
      let hasOutsideIntegration = false;
      let hasInsideIntegration = false;

      process.iftStages.forEach(stage => {
        const integrationType = getIntegrationType(stage.integrationType || '');
        const endDate = parseDate(stage.endDate);
        const totalSteps = stage.totalSteps;
        const completedSteps = stage.completedSteps;

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
      });

      // Статус ВНУТРИ
      let insideStatus: number | string = 0;
      let insideForecast = '';
      
      if (!hasInsideIntegration) {
        // Нет интеграций ВНУТРИ
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
        // Есть интеграции ВНУТРИ, но нет шагов
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

      // Условие добавления строки: есть хоть какие-то данные
      const hasAnyData = hasInsideIntegration || hasOutsideIntegration || 
                         lastInsideDate !== null || lastOutsideDate !== null;

      if (hasAnyData) {
        allTableData.push({
          chainName: chain.name,
          processShortName: process.shortName || process.name,
          insideForecast,
          insideStatus,
          outsideForecast,
          outsideStatus,
        });
      }
    });
  });

  allTableData.sort((a, b) => {
    if (a.chainName !== b.chainName) return a.chainName.localeCompare(b.chainName);
    return a.processShortName.localeCompare(b.processShortName);
  });

  const filteredData = useMemo(() => {
    if (selectedChain === 'all') return allTableData;
    return allTableData.filter(row => row.chainName === selectedChain);
  }, [selectedChain, allTableData]);

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📊 Статус по интеграциям</h3>
        
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
      </div>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Цепочка</th>
              <th>Процесс</th>
              <th>Прогноз ВНУТРИ</th>
              <th>Статус</th>
              <th>Прогноз ВНЕШ</th>
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

              // Классы для ВНУТРИ
              const insideForecastClass = row.insideForecast === 'NA' ? 'forecastNa' : 
                                          row.insideForecast === 'TBD' ? 'forecastTbd' : '';
              const insideStatusDisplay = row.insideStatus === 'NA' ? 'NA' : `${row.insideStatus}%`;
              const insideStatusClass = row.insideStatus === 'NA' ? 'statusNa' : 
                                        (typeof row.insideStatus === 'number' ? getStatusColorClass(row.insideStatus) : '');

              // Классы для ВНЕШ
              const outsideForecastClass = row.outsideForecast === 'NA' ? 'forecastNa' : 
                                           row.outsideForecast === 'TBD' ? 'forecastTbd' : '';
              const outsideStatusDisplay = row.outsideStatus === 'NA' ? 'NA' : `${row.outsideStatus}%`;
              const outsideStatusClass = row.outsideStatus === 'NA' ? 'statusNa' : 
                                         (typeof row.outsideStatus === 'number' ? getStatusColorClass(row.outsideStatus) : '');

              return (
                <tr key={idx}>
                  {isNewChain && (
                    <td className={styles.chainCell} rowSpan={rowSpan}>
                      {row.chainName}
                    </td>
                  )}
                  <td className={styles.processCell}>{row.processShortName}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredData.length === 0 && (
        <div className={styles.empty}>Нет данных для выбранной цепочки</div>
      )}
    </div>
  );
};

export default IntegrationForecastTable;