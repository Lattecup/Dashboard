import * as XLSX from 'xlsx';
import type { Chain, IFTStage, Problem } from '../../types/chain.types';

// Преобразование Excel числа в Date
export const excelNumberToDate = (num: number): Date => {
  return new Date((num - 25569) * 86400 * 1000);
};

// Парсинг даты
export const parseDate = (value: string | number | null | undefined): Date | null => {
  if (!value || value === '') return null;
  if (typeof value === 'number') return excelNumberToDate(value);
  const str = String(value).trim();
  if (str.toLowerCase() === 'tbd') return null;
  if (str.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
    const parts = str.split('.');
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(date.getTime())) return date;
  }
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  }
  return null;
};

// Форматирование даты для отображения
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

// Парсинг проблем
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

// Парсинг гигиены
export const parseHygiene = (hygieneStr: string): string[] => {
  if (!hygieneStr || hygieneStr === '' || hygieneStr === '-') return [];
  
  const dates: string[] = [];
  const parts = hygieneStr.split(/\r?\n|,/);
  
  parts.forEach(part => {
    const dateStr = part.trim();
    if (dateStr && dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      dates.push(dateStr);
    }
  });
  
  return dates;
};

// Нормализация строки для сравнения
const normalizeName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
};

// Поиск колонок по всему листу
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
      
      // Основные колонки
      if (normalizedCell === normalizeName('Сквозная цепочка') || 
          normalizedCell === normalizeName('Сквозная цепочка (СЦ)') || 
          normalizedCell === normalizeName('сц')) {
        if (!columnMap.has('chain')) columnMap.set('chain', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "chain" в строке ${rowIdx}, колонка ${colIdx}: "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Сквозной процесс') || 
               normalizedCell === normalizeName('Процесс')) {
        if (!columnMap.has('process')) columnMap.set('process', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "process" в строке ${rowIdx}, колонка ${colIdx}: "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Короткое название процесса для статуса')) {
        if (!columnMap.has('shortName')) columnMap.set('shortName', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell === normalizeName('Проблемы') ||
               normalizedCell === normalizeName('Список проблем') ||
               normalizedCell === normalizeName('Список проблем с ответственными и сроками')) {
        if (!columnMap.has('problems')) columnMap.set('problems', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "problems" в строке ${rowIdx}, колонка ${colIdx}: "${cell}"`);
      }
      else if (normalizedCell === normalizeName('Гигиена')) {
        if (!columnMap.has('hygiene')) columnMap.set('hygiene', { row: rowIdx, col: colIdx });
      }
      // ИФТ1
      else if (normalizedCell.includes('что делается в ифт1')) {
        if (!columnMap.has('ift1_desc')) columnMap.set('ift1_desc', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "ift1_desc" в строке ${rowIdx}, колонка ${colIdx}: "${cell}"`);
      }
      else if (normalizedCell.includes('статус ифт1')) {
        if (!columnMap.has('ift1_status')) columnMap.set('ift1_status', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('старт ифт1')) {
        if (!columnMap.has('ift1_start')) columnMap.set('ift1_start', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('финиш ифт1')) {
        if (!columnMap.has('ift1_end')) columnMap.set('ift1_end', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('пройдено шагов ифт 1')) {
        if (!columnMap.has('ift1_completed')) columnMap.set('ift1_completed', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "ift1_completed" в строке ${rowIdx}, колонка ${colIdx}: "${cell}"`);
      }
      else if (normalizedCell.includes('сколько шагов ифт1')) {
        if (!columnMap.has('ift1_total')) columnMap.set('ift1_total', { row: rowIdx, col: colIdx });
        console.log(`✅ Найдена колонка "ift1_total" в строке ${rowIdx}, колонка ${colIdx}: "${cell}"`);
      }
      else if (normalizedCell.includes('% прохождения ифт1')) {
        if (!columnMap.has('ift1_percent')) columnMap.set('ift1_percent', { row: rowIdx, col: colIdx });
      }
      // ИФТ2
      else if (normalizedCell.includes('что делается в ифт2')) {
        if (!columnMap.has('ift2_desc')) columnMap.set('ift2_desc', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('статус ифт2')) {
        if (!columnMap.has('ift2_status')) columnMap.set('ift2_status', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('старт ифт2')) {
        if (!columnMap.has('ift2_start')) columnMap.set('ift2_start', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('финиш ифт2')) {
        if (!columnMap.has('ift2_end')) columnMap.set('ift2_end', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('пройдено шагов ифт 2')) {
        if (!columnMap.has('ift2_completed')) columnMap.set('ift2_completed', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('сколько шагов ифт2')) {
        if (!columnMap.has('ift2_total')) columnMap.set('ift2_total', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('% прохождения ифт2')) {
        if (!columnMap.has('ift2_percent')) columnMap.set('ift2_percent', { row: rowIdx, col: colIdx });
      }
      // ИФТ3
      else if (normalizedCell.includes('что делается в ифт3')) {
        if (!columnMap.has('ift3_desc')) columnMap.set('ift3_desc', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('статус ифт3')) {
        if (!columnMap.has('ift3_status')) columnMap.set('ift3_status', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('старт ифт3')) {
        if (!columnMap.has('ift3_start')) columnMap.set('ift3_start', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('финиш ифт3')) {
        if (!columnMap.has('ift3_end')) columnMap.set('ift3_end', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('пройдено шагов ифт 3')) {
        if (!columnMap.has('ift3_completed')) columnMap.set('ift3_completed', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('сколько шагов ифт3')) {
        if (!columnMap.has('ift3_total')) columnMap.set('ift3_total', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('% прохождения ифт3')) {
        if (!columnMap.has('ift3_percent')) columnMap.set('ift3_percent', { row: rowIdx, col: colIdx });
      }
      // ИФТ4
      else if (normalizedCell.includes('что делается в ифт4')) {
        if (!columnMap.has('ift4_desc')) columnMap.set('ift4_desc', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('статус ифт4')) {
        if (!columnMap.has('ift4_status')) columnMap.set('ift4_status', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('старт ифт4')) {
        if (!columnMap.has('ift4_start')) columnMap.set('ift4_start', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('финиш ифт4')) {
        if (!columnMap.has('ift4_end')) columnMap.set('ift4_end', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('пройдено шагов ифт 4')) {
        if (!columnMap.has('ift4_completed')) columnMap.set('ift4_completed', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('сколько шагов ифт4')) {
        if (!columnMap.has('ift4_total')) columnMap.set('ift4_total', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('% прохождения ифт4')) {
        if (!columnMap.has('ift4_percent')) columnMap.set('ift4_percent', { row: rowIdx, col: colIdx });
      }
      // ИФТ5
      else if (normalizedCell.includes('что делается в ифт5')) {
        if (!columnMap.has('ift5_desc')) columnMap.set('ift5_desc', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('статус ифт5')) {
        if (!columnMap.has('ift5_status')) columnMap.set('ift5_status', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('старт ифт5')) {
        if (!columnMap.has('ift5_start')) columnMap.set('ift5_start', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('финиш ифт5')) {
        if (!columnMap.has('ift5_end')) columnMap.set('ift5_end', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('пройдено шагов ифт 5')) {
        if (!columnMap.has('ift5_completed')) columnMap.set('ift5_completed', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('сколько шагов ифт5')) {
        if (!columnMap.has('ift5_total')) columnMap.set('ift5_total', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell.includes('% прохождения ифт5')) {
        if (!columnMap.has('ift5_percent')) columnMap.set('ift5_percent', { row: rowIdx, col: colIdx });
      }
      // Ссылки
      else if (normalizedCell === normalizeName('Результаты (Confl)') || 
               normalizedCell === normalizeName('Confluence')) {
        if (!columnMap.has('confluence')) columnMap.set('confluence', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell === normalizeName('ДЭШ со сторями') || 
               normalizedCell === normalizeName('Story')) {
        if (!columnMap.has('story')) columnMap.set('story', { row: rowIdx, col: colIdx });
      }
      else if (normalizedCell === normalizeName('СберЧат') || 
               normalizedCell === normalizeName('Сберчат')) {
        if (!columnMap.has('sberChat')) columnMap.set('sberChat', { row: rowIdx, col: colIdx });
      }
    }
  }
  
  console.log('🔍 Найденные колонки:', Array.from(columnMap.entries()).map(([key, val]) => ({ key, row: val.row, col: val.col })));
  
  return columnMap;
};

// Основная функция парсинга Excel
export const parseExcelFile = (file: File): Promise<Chain[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('📄 Всего строк в файле:', rawData.length);
      console.log('📄 Первые 5 строк:', rawData.slice(0, 5));
      
      if (rawData.length === 0) {
        reject(new Error('Файл пуст'));
        return;
      }
      
      const columnMap = findColumns(rawData);
      
      if (!columnMap.has('chain')) {
        reject(new Error('Не найдена колонка "Сквозная цепочка"'));
        return;
      }
      if (!columnMap.has('process')) {
        reject(new Error('Не найдена колонка "Сквозной процесс"'));
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
        
        const processName = String(getValue(row, columnMap.get('process')) || '').trim();
        if (!processName || processName === '') continue;
        
        const shortName = String(getValue(row, columnMap.get('shortName')) || '').trim() || processName;
        const problemsStr = String(getValue(row, columnMap.get('problems')) || '');
        const hygieneStr = String(getValue(row, columnMap.get('hygiene')) || '');
        
        console.log(`\n📌 Строка ${i}:`, { chainName, processName, shortName });
        
        const iftStages: IFTStage[] = [];
        
        const iftData = [
          { num: 1, desc: columnMap.get('ift1_desc'), status: columnMap.get('ift1_status'), start: columnMap.get('ift1_start'), end: columnMap.get('ift1_end'), completed: columnMap.get('ift1_completed'), total: columnMap.get('ift1_total'), percent: columnMap.get('ift1_percent') },
          { num: 2, desc: columnMap.get('ift2_desc'), status: columnMap.get('ift2_status'), start: columnMap.get('ift2_start'), end: columnMap.get('ift2_end'), completed: columnMap.get('ift2_completed'), total: columnMap.get('ift2_total'), percent: columnMap.get('ift2_percent') },
          { num: 3, desc: columnMap.get('ift3_desc'), status: columnMap.get('ift3_status'), start: columnMap.get('ift3_start'), end: columnMap.get('ift3_end'), completed: columnMap.get('ift3_completed'), total: columnMap.get('ift3_total'), percent: columnMap.get('ift3_percent') },
          { num: 4, desc: columnMap.get('ift4_desc'), status: columnMap.get('ift4_status'), start: columnMap.get('ift4_start'), end: columnMap.get('ift4_end'), completed: columnMap.get('ift4_completed'), total: columnMap.get('ift4_total'), percent: columnMap.get('ift4_percent') },
          { num: 5, desc: columnMap.get('ift5_desc'), status: columnMap.get('ift5_status'), start: columnMap.get('ift5_start'), end: columnMap.get('ift5_end'), completed: columnMap.get('ift5_completed'), total: columnMap.get('ift5_total'), percent: columnMap.get('ift5_percent') }
        ];
        
        for (const ift of iftData) {
          const description = ift.desc ? String(getValue(row, ift.desc) || '') : '';
          if (!description && !ift.status && !ift.start && !ift.total) continue;
          
          const status = ift.status ? String(getValue(row, ift.status) || '') : '';
          const startDateVal = ift.start ? getValue(row, ift.start) : '';
          const endDateVal = ift.end ? getValue(row, ift.end) : '';
          const completedSteps = ift.completed ? getNumber(getValue(row, ift.completed)) : 0;
          const totalSteps = ift.total ? getNumber(getValue(row, ift.total)) : 0;
          let percentage = ift.percent ? getPercentage(getValue(row, ift.percent)) : 0;
          
          if (percentage === 0 && totalSteps > 0 && completedSteps > 0) {
            percentage = (completedSteps / totalSteps) * 100;
          }
          
          console.log(`ИФТ${ift.num}: completed=${completedSteps}, total=${totalSteps}, percentFromExcel=${ift.percent ? getValue(row, ift.percent) : 'no column'}, calculated=${percentage}`);
          iftStages.push({
            id: `${chainName}_${processName}_ИФТ${ift.num}`,
            name: `ИФТ${ift.num}`,
            description: description,
            status: status,
            startDate: startDateVal ? formatDate(startDateVal) : '',
            endDate: endDateVal ? formatDate(endDateVal) : '',
            totalSteps: totalSteps,
            completedSteps: completedSteps,
            percentage: percentage
          });
        }
        
        if (iftStages.length === 0) continue;
        
        const problems = parseProblems(problemsStr, processName, chainName);
        const hygieneDates = parseHygiene(hygieneStr);
        
        if (!chainsMap.has(chainName)) {
          chainsMap.set(chainName, {
            id: chainName,
            name: chainName,
            processes: []
          });
        }
        
        const chain = chainsMap.get(chainName)!;
        
        const existingProcess = chain.processes.find(p => p.name === processName);
        if (existingProcess) {
          existingProcess.iftStages = iftStages;
          existingProcess.problems.push(...problems);
          if (hygieneDates.length > 0) {
            existingProcess.hygiene.push({
              id: `${chainName}_${processName}_hygiene`,
              processName: processName,
              chainName: chainName,
              missedDates: hygieneDates
            });
          }
        } else {
          chain.processes.push({
            id: `${chainName}_${processName}`,
            name: processName,
            shortName: shortName,
            iftStages: iftStages,
            problems: problems,
            hygiene: hygieneDates.length > 0 ? [{
              id: `${chainName}_${processName}_hygiene`,
              processName: processName,
              chainName: chainName,
              missedDates: hygieneDates
            }] : [],
            links: {
              confluence: columnMap.has('confluence') ? String(getValue(row, columnMap.get('confluence')) || '') : undefined,
              story: columnMap.has('story') ? String(getValue(row, columnMap.get('story')) || '') : undefined,
              sberChat: columnMap.has('sberChat') ? String(getValue(row, columnMap.get('sberChat')) || '') : undefined
            }
          });
        }
      }
      
      console.log('✅ Парсинг завершён. Найдено цепочек:', chainsMap.size);
      
      resolve(Array.from(chainsMap.values()));
    };
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });

  
};