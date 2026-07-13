import * as XLSX from 'xlsx';
import type { Chain, IFTStage, Problem, Process } from '../../types/chain.types';

export const excelNumberToDate = (num: number): Date => {
  return new Date((num - 25569) * 86400 * 1000);
};

export const parseDate = (value: string | number | null | undefined): Date | null => {
  if (!value || value === '') return null;
  if (typeof value === 'number') return excelNumberToDate(value);
  const str = String(value).trim();
  if (str.toLowerCase() === 'tbd') return null;
  
  const matchDDMMYYYY = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (matchDDMMYYYY) {
    const day = parseInt(matchDDMMYYYY[1], 10);
    const month = parseInt(matchDDMMYYYY[2], 10) - 1;
    const year = parseInt(matchDDMMYYYY[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  
  const matchYYYYMMDD = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchYYYYMMDD) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
};

export const formatDate = (value: string | number | null | undefined): string => {
  if (!value || value === '') return '';
  const date = parseDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString('ru-RU');
};

const getNumber = (value: any): number => {
  if (!value || value === '') return 0;
  if (typeof value === 'number') return value;
  const num = parseFloat(String(value));
  return isNaN(num) ? 0 : num;
};

const getPercentage = (value: any): number => {
  if (!value || value === '') return 0;
  if (typeof value === 'number') return value;
  const str = String(value);
  if (str.includes('%')) return parseFloat(str) || 0;
  return parseFloat(str) || 0;
};

export const parseProblems = (problemsStr: string, processName: string, chainName: string): Problem[] => {
  if (!problemsStr || problemsStr === '' || problemsStr === '-') return [];
  
  const problems: Problem[] = [];
  const lines = problemsStr.split(/\r?\n/);
  
  lines.forEach((line, idx) => {
    const parts = line.split('|').map(p => p.trim());
    if (parts.length >= 1 && parts[0]) {
      problems.push({
        id: `problem_${chainName}_${processName}_${idx}`,
        description: parts[0],
        assignee: parts[1] || 'Не указан',
        dueDate: parts[2] || '',
        processName: processName,
        chainName: chainName
      });
    }
  });
  
  return problems;
};

const normalizeName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
};

const extractStageNumber = (cell: string, prefix: string): number => {
  const normalized = normalizeName(cell);
  const prefixNorm = normalizeName(prefix);
  const afterPrefix = normalized.replace(prefixNorm, '').trim();
  const num = parseInt(afterPrefix, 10);
  return isNaN(num) ? 0 : num;
};

const findColumns = (rawData: any[][]) => {
  const columnMap: Map<string, { row: number; col: number }> = new Map();
  
  console.log('🔍 Начинаем поиск колонок...');
  
  for (let rowIdx = 0; rowIdx < Math.min(50, rawData.length); rowIdx++) {
    const row = rawData[rowIdx];
    if (!row) continue;
    
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = String(row[colIdx] || '').trim();
      if (!cell) continue;
      
      const normalizedCell = normalizeName(cell);
      
      if (normalizedCell === normalizeName('Цепочка') || 
          normalizedCell === normalizeName('Сквозная цепочка (СЦ)')) {
        if (!columnMap.has('chain')) columnMap.set('chain', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "chain": "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Короткое название процесса для статуса')) {
        if (!columnMap.has('shortName')) columnMap.set('shortName', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "shortName": "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Сквозной процесс') || 
               normalizedCell === normalizeName('Процесс')) {
        if (!columnMap.has('process')) columnMap.set('process', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "process": "${cell}"`);
      }
      else if (normalizedCell === normalizeName('СП')) {
        if (!columnMap.has('sp')) columnMap.set('sp', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "sp": "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Проблемы разработки, ИФТ, ПСИ и др.') ||
               normalizedCell === normalizeName('Проблемы')) {
        if (!columnMap.has('problems')) columnMap.set('problems', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "problems": "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Дата ПРОМ внутри DA')) {
        if (!columnMap.has('datePromInside')) columnMap.set('datePromInside', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "datePromInside": "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Дата ПРОМ с внешниками')) {
        if (!columnMap.has('datePromOutside')) columnMap.set('datePromOutside', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "datePromOutside": "${cell}"`);
      }
      else {
        // Этап N: обьем / объем
        const stageDescMatch = normalizedCell.match(/^этап\s*(\d+):\s*об[ьъ]ем$/);
        if (stageDescMatch) {
          const num = parseInt(stageDescMatch[1], 10);
          const key = `stage${num}_desc`;
          if (!columnMap.has(key)) {
            columnMap.set(key, { row: rowIdx, col: colIdx });
            console.log(`✅ Найдена колонка "${key}": "${cell}"`);
          }
        }
        // Статус ИФТN
        else if (normalizedCell.includes('статус ифт')) {
          const num = extractStageNumber(normalizedCell, 'статус ифт');
          if (num > 0) {
            const key = `stage${num}_status`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Старт ИФТN
        else if (normalizedCell.includes('старт ифт')) {
          const num = extractStageNumber(normalizedCell, 'старт ифт');
          if (num > 0) {
            const key = `stage${num}_start`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Финиш ИФТN
        else if (normalizedCell.includes('финиш ифт')) {
          const num = extractStageNumber(normalizedCell, 'финиш ифт');
          if (num > 0) {
            const key = `stage${num}_end`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Пройдено шагов ИФТN
        else if (normalizedCell.includes('пройдено шагов ифт')) {
          const num = extractStageNumber(normalizedCell, 'пройдено шагов ифт');
          if (num > 0) {
            const key = `stage${num}_completed`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Сколько шагов ИФТN
        else if (normalizedCell.includes('сколько шагов ифт')) {
          const num = extractStageNumber(normalizedCell, 'сколько шагов ифт');
          if (num > 0) {
            const key = `stage${num}_total`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // % прохождения ИФТN
        else if (normalizedCell.includes('% прохождения ифт')) {
          const num = extractStageNumber(normalizedCell, '% прохождения ифт');
          if (num > 0) {
            const key = `stage${num}_percent`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // ⭐⭐⭐ Этап N: Интеграции с внешниками (НОВОЕ НАЗВАНИЕ - множественное число)
        else if (normalizedCell.includes('этап') && normalizedCell.includes('интеграции с внешниками')) {
          const match = normalizedCell.match(/^этап\s*(\d+):\s*интеграции с внешниками$/);
          if (match) {
            const num = parseInt(match[1], 10);
            const key = `stage${num}_integration`;
            if (!columnMap.has(key)) {
              columnMap.set(key, { row: rowIdx, col: colIdx });
              console.log(`✅ Найдена колонка "${key}": "${cell}"`);
            }
          }
        }
        // Запасной вариант: старая колонка "Этап N: Интеграция с внешниками"
        else if (normalizedCell.includes('этап') && normalizedCell.includes('интеграция с внешниками')) {
          const match = normalizedCell.match(/^этап\s*(\d+):\s*интеграция с внешниками$/);
          if (match) {
            const num = parseInt(match[1], 10);
            const key = `stage${num}_integration`;
            if (!columnMap.has(key)) {
              columnMap.set(key, { row: rowIdx, col: colIdx });
              console.log(`✅ Найдена колонка "${key}": "${cell}"`);
            }
          }
        }
        // Статус ПСИN
        else if (normalizedCell.includes('статус пси')) {
          const num = extractStageNumber(normalizedCell, 'статус пси');
          if (num > 0) {
            const key = `psi${num}_status`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Старт ПСИN
        else if (normalizedCell.includes('старт пси')) {
          const num = extractStageNumber(normalizedCell, 'старт пси');
          if (num > 0) {
            const key = `psi${num}_start`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Финиш ПСИN
        else if (normalizedCell.includes('финиш пси')) {
          const num = extractStageNumber(normalizedCell, 'финиш пси');
          if (num > 0) {
            const key = `psi${num}_end`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Пройдено шагов ПСИN
        else if (normalizedCell.includes('пройдено шагов пси')) {
          const num = extractStageNumber(normalizedCell, 'пройдено шагов пси');
          if (num > 0) {
            const key = `psi${num}_completed`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // Сколько шагов ПСИN
        else if (normalizedCell.includes('сколько шагов пси')) {
          const num = extractStageNumber(normalizedCell, 'сколько шагов пси');
          if (num > 0) {
            const key = `psi${num}_total`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        // % прохождения ПСИN
        else if (normalizedCell.includes('% прохождения пси')) {
          const num = extractStageNumber(normalizedCell, '% прохождения пси');
          if (num > 0) {
            const key = `psi${num}_percent`;
            if (!columnMap.has(key)) columnMap.set(key, { row: rowIdx, col: colIdx });
          }
        }
        else if (normalizedCell === normalizeName('Результаты (Confl)') || 
                 normalizedCell === normalizeName('Confluence')) {
          if (!columnMap.has('confluence')) columnMap.set('confluence', { row: rowIdx, col: colIdx });
        }
        else if (normalizedCell === normalizeName('ДЭШ со сторями') || 
                 normalizedCell === normalizeName('Story')) {
          if (!columnMap.has('story')) columnMap.set('story', { row: rowIdx, col: colIdx });
        }
      }
    }
  }
  
  console.log('🔍 Найденные колонки:', Array.from(columnMap.entries()).map(([key, val]) => ({ key, row: val.row, col: val.col })));
  
  return columnMap;
};

export const parseExcelFile = (file: File): Promise<Chain[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('📄 Всего строк в файле:', rawData.length);
      
      if (rawData.length === 0) {
        reject(new Error('Файл пуст'));
        return;
      }
      
      const columnMap = findColumns(rawData);
      
      if (!columnMap.has('chain')) {
        reject(new Error('Не найдена колонка "Цепочка"'));
        return;
      }
      
      const maxHeaderRow = Math.max(...Array.from(columnMap.values()).map(c => c.row));
      const dataStartRow = maxHeaderRow + 1;
      
      console.log('📄 Строка начала данных:', dataStartRow);
      
      const getValue = (row: any[], colInfo: { row: number; col: number } | undefined) => {
        if (!colInfo) return undefined;
        return row[colInfo.col];
      };
      
      const chainsMap = new Map<string, Chain>();
      
      for (let i = dataStartRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row) continue;
        
        const chainName = String(getValue(row, columnMap.get('chain')) || '').trim();
        if (!chainName || chainName === '') continue;
        
        const shortName = String(getValue(row, columnMap.get('shortName')) || '').trim();
        const processName = String(getValue(row, columnMap.get('process')) || '').trim() || shortName;
        if (!processName || processName === '') continue;
        
        const sp = String(getValue(row, columnMap.get('sp')) || '').trim();
        const problemsStr = String(getValue(row, columnMap.get('problems')) || '');
        const datePromInside = parseDate(getValue(row, columnMap.get('datePromInside')));
        const datePromOutside = parseDate(getValue(row, columnMap.get('datePromOutside')));
        
        console.log(`\n📌 Строка ${i}:`, { chainName, processName, shortName, sp });
        
        const iftStages: IFTStage[] = [];
        const maxStages = 10;
        
        for (let stageNum = 1; stageNum <= maxStages; stageNum++) {
          const descKey = `stage${stageNum}_desc`;
          const desc = columnMap.get(descKey) ? String(getValue(row, columnMap.get(descKey)) || '') : '';
          
          // ИФТ
          const status = columnMap.get(`stage${stageNum}_status`) ? String(getValue(row, columnMap.get(`stage${stageNum}_status`)) || '') : '';
          const startDateVal = columnMap.get(`stage${stageNum}_start`) ? getValue(row, columnMap.get(`stage${stageNum}_start`)) : '';
          const endDateVal = columnMap.get(`stage${stageNum}_end`) ? getValue(row, columnMap.get(`stage${stageNum}_end`)) : '';
          const completedSteps = columnMap.get(`stage${stageNum}_completed`) ? getNumber(getValue(row, columnMap.get(`stage${stageNum}_completed`))) : 0;
          const totalSteps = columnMap.get(`stage${stageNum}_total`) ? getNumber(getValue(row, columnMap.get(`stage${stageNum}_total`))) : 0;
          let percentage = columnMap.get(`stage${stageNum}_percent`) ? getPercentage(getValue(row, columnMap.get(`stage${stageNum}_percent`))) : 0;
          const integrationType = columnMap.get(`stage${stageNum}_integration`) ? String(getValue(row, columnMap.get(`stage${stageNum}_integration`)) || '') : '';
          
          if (percentage === 0 && totalSteps > 0 && completedSteps > 0) {
            percentage = (completedSteps / totalSteps) * 100;
          }
          
          const hasIftData = desc || status || startDateVal || endDateVal || totalSteps > 0;
          
          if (hasIftData) {
            iftStages.push({
              id: `${chainName}_${processName}_ИФТ${stageNum}`,
              name: `ИФТ${stageNum}`,
              description: desc,
              status: status,
              startDate: startDateVal ? formatDate(startDateVal) : '',
              endDate: endDateVal ? formatDate(endDateVal) : '',
              totalSteps: totalSteps,
              completedSteps: completedSteps,
              percentage: percentage,
              integrationType: integrationType,
              stageNumber: stageNum,
            });
          }
          
          // ⭐ ПСИ - ТОЖЕ ЧИТАЕМ ИНТЕГРАЦИЮ!
          const psiStatus = columnMap.get(`psi${stageNum}_status`) ? String(getValue(row, columnMap.get(`psi${stageNum}_status`)) || '') : '';
          const psiStartDateVal = columnMap.get(`psi${stageNum}_start`) ? getValue(row, columnMap.get(`psi${stageNum}_start`)) : '';
          const psiEndDateVal = columnMap.get(`psi${stageNum}_end`) ? getValue(row, columnMap.get(`psi${stageNum}_end`)) : '';
          const psiCompletedSteps = columnMap.get(`psi${stageNum}_completed`) ? getNumber(getValue(row, columnMap.get(`psi${stageNum}_completed`))) : 0;
          const psiTotalSteps = columnMap.get(`psi${stageNum}_total`) ? getNumber(getValue(row, columnMap.get(`psi${stageNum}_total`))) : 0;
          let psiPercentage = columnMap.get(`psi${stageNum}_percent`) ? getPercentage(getValue(row, columnMap.get(`psi${stageNum}_percent`))) : 0;
          // ⭐ ПСИ ТОЖЕ ЧИТАЕТ ИНТЕГРАЦИЮ
          const psiIntegrationType = columnMap.get(`stage${stageNum}_integration`) ? String(getValue(row, columnMap.get(`stage${stageNum}_integration`)) || '') : '';
          
          if (psiPercentage === 0 && psiTotalSteps > 0 && psiCompletedSteps > 0) {
            psiPercentage = (psiCompletedSteps / psiTotalSteps) * 100;
          }
          
          const hasPsiData = psiStatus || psiStartDateVal || psiEndDateVal || psiTotalSteps > 0;
          
          if (hasPsiData) {
            iftStages.push({
              id: `${chainName}_${processName}_ПСИ${stageNum}`,
              name: `ПСИ${stageNum}`,
              description: desc,
              status: psiStatus,
              startDate: psiStartDateVal ? formatDate(psiStartDateVal) : '',
              endDate: psiEndDateVal ? formatDate(psiEndDateVal) : '',
              totalSteps: psiTotalSteps,
              completedSteps: psiCompletedSteps,
              percentage: psiPercentage,
              integrationType: psiIntegrationType, // ⭐ ТЕПЕРЬ НЕ ПУСТОЙ!
              stageNumber: stageNum,
            });
          }
        }
        
        if (iftStages.length === 0) continue;
        
        const problems = parseProblems(problemsStr, processName, chainName);
        
        if (!chainsMap.has(chainName)) {
          chainsMap.set(chainName, {
            id: chainName,
            name: chainName,
            processes: []
          });
        }
        
        const chain = chainsMap.get(chainName)!;
        const existingProcess = chain.processes.find(p => p.name === processName);
        
        const processData: Process = {
          id: `${chainName}_${processName}`,
          name: processName,
          shortName: shortName || processName,
          sp: sp,
          iftStages: iftStages,
          problems: problems,
          hygiene: [],
          links: {
            confluence: columnMap.has('confluence') ? String(getValue(row, columnMap.get('confluence')) || '') : undefined,
            story: columnMap.has('story') ? String(getValue(row, columnMap.get('story')) || '') : undefined,
          },
          datePromInside: datePromInside,
          datePromOutside: datePromOutside,
        };
        
        if (existingProcess) {
          existingProcess.iftStages = iftStages;
          existingProcess.problems.push(...problems);
          existingProcess.sp = sp;
          existingProcess.datePromInside = datePromInside;
          existingProcess.datePromOutside = datePromOutside;
        } else {
          chain.processes.push(processData);
        }
      }
      
      console.log('✅ Парсинг завершён. Найдено цепочек:', chainsMap.size);
      
      resolve(Array.from(chainsMap.values()));
    };
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });
};