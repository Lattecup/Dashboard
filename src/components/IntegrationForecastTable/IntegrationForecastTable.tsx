import { useState, useMemo } from 'react';
import styles from './IntegrationForecastTable.module.css';
import type { Chain } from '../../types/chain.types';
import { parseDate } from '../utils/excelParser';
import * as XLSX from 'xlsx';

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
  return ''; // 0% — без цвета (серый по умолчанию)
};

// Проверка, нужно ли красить в красный (0% и дата уже прошла)
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

  const exportToExcel = () => {
    const excelData = filteredData.map(row => ({
      'Цепочка': row.chainName,
      'Процесс': row.processShortName,
      'Прогноз ВНУТРИ': row.insideForecast,
      'Статус ВНУТРИ': row.insideStatus === 'NA' ? 'NA' : `${row.insideStatus}%`,
      'Прогноз ВНЕШ': row.outsideForecast,
      'Статус ВНЕШ': row.outsideStatus === 'NA' ? 'NA' : `${row.outsideStatus}%`,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: '1F2937' }
          }
        };
      }
    }

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        if (cell) {
          const value = String(cell.v || '');
          
          if (value === 'NA') {
            cell.s = {
              font: {
                color: { rgb: '9CA3AF' },
                italic: true
              }
            };
          } else if (value === 'TBD') {
            cell.s = {
              font: {
                color: { rgb: 'F59E0B' },
                bold: true
              }
            };
          } else if (value.includes('%')) {
            const numValue = parseInt(value);
            let color = '1F2937';
            if (!isNaN(numValue)) {
              if (numValue >= 80) color = '10B981';
              else if (numValue >= 50) color = '3B82F6';
              else if (numValue >= 25) color = 'F59E0B';
              else if (numValue > 0 && numValue < 25) color = 'EF4444';
              else color = '6B7280'; // 0% — серый
            }
            cell.s = {
              font: {
                color: { rgb: color },
                bold: true
              }
            };
          }
        }
      }
    }

    ws['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Прогнозы');
    XLSX.writeFile(wb, `Прогноз_по_интеграциям_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

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
        <h3 className={styles.title}>📊 Прогноз по интеграциям</h3>
        
        <div className={styles.headerRight}>
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
          
          <button className={styles.exportButton} onClick={exportToExcel}>
            📥 Выгрузить
          </button>
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