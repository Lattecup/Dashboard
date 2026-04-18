import { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from './Instructions.module.css';

const Instructions = () => {
  const [isOpen, setIsOpen] = useState(false);

  const downloadExample = () => {
    const exampleData = [
      ['Команда', 'Сквозной процесс', 'Этап ИФТ', 'Срок этапа', 'Шагов всего', 'Шагов выполнено', 'Проблема', 'Исполнитель', 'Срок проблемы', 'Приоритет'],
      ['Команда А', 'Авторизация', 'ИФТ 1', '20.12.2026', '10', '5', 'Не работает вход', 'Анна Иванова', '17.04.2026', 'блокер'],
      ['Команда А', 'Авторизация', 'ИФТ 2', '25.12.2026', '15', '3', '', '', '', ''],
      ['Команда Б', 'API', 'ИФТ 1', 'TBD', '8', '8', 'Медленный ответ', 'Петр Сидоров', '10.04.2026', 'критичный'],
      ['Команда В', 'Отчеты', 'ИФТ 1', '15.05.2026', '20', '10', 'Ошибка в отчете', 'Иван Петров', '01.05.2026', 'высокий'],
      ['Команда Г', 'Интеграция', 'ИФТ 2', '01.06.2026', '30', '15', 'Задержка ответа', 'Мария Смирнова', '25.05.2026', 'средний'],
      ['Команда Д', 'Документооборот', 'ИФТ 3', '10.07.2026', '25', '5', 'Не сохраняется файл', 'Денис Козлов', '05.07.2026', 'низкий'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(exampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Пример');
    XLSX.writeFile(wb, 'пример_дашборда.xlsx');
  };

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '📖 Скрыть инструкцию' : '📖 Как заполнять Excel?'}
      </button>
      
      {isOpen && (
        <div className={styles.content}>
          <h3 className={styles.title}>Правила заполнения Excel файла</h3>
          
          <div className={styles.section}>
            <h4>📋 Обязательные колонки (названия должны совпадать):</h4>
            <table className={styles.table}>
              <thead>
                <tr><th>Название колонки</th><th>Что писать</th><th>Пример</th></tr>
              </thead>
              <tbody>
                <tr><td>Команда</td><td>Название команды</td><td>Команда А</td></tr>
                <tr><td>Сквозной процесс</td><td>Название процесса</td><td>Авторизация</td></tr>
                <tr><td>Этап ИФТ</td><td>Название этапа</td><td>ИФТ 1, ИФТ 2, ИФТ 3</td></tr>
                <tr><td>Срок этапа</td><td>Дата в формате ДД.ММ.ГГГГ или TBD</td><td>20.12.2026 или TBD</td></tr>
                <tr><td>Шагов всего</td><td>Число или TBD</td><td>10 или TBD</td></tr>
                <tr><td>Шагов выполнено</td><td>Число</td><td>5</td></tr>
                <tr><td>Проблема</td><td>Описание проблемы (если есть)</td><td>Не работает вход</td></tr>
                <tr><td>Исполнитель</td><td>ФИО ответственного</td><td>Анна Иванова</td></tr>
                <tr><td>Срок проблемы</td><td>Дата в формате ДД.ММ.ГГГГ</td><td>17.04.2026</td></tr>
                <tr><td>Приоритет</td><td>блокер / критичный / высокий / средний / низкий</td><td>блокер</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h4>⚠️ Важные правила:</h4>
            <ul className={styles.list}>
              <li>Названия колонок должны точно совпадать с таблицей выше</li>
              <li>Если у этапа нет проблемы — оставь колонки "Проблема", "Исполнитель", "Срок проблемы", "Приоритет" пустыми</li>
              <li>Если шагов всего нет — напиши <strong>TBD</strong></li>
              <li>Приоритет пиши маленькими буквами: <strong>блокер</strong>, <strong>критичный</strong>, <strong>высокий</strong>, <strong>средний</strong>, <strong>низкий</strong></li>
              <li>Даты пиши в формате <strong>ДД.ММ.ГГГГ</strong> (например, 20.12.2026)</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h4>📥 Пример файла:</h4>
            <button className={styles.downloadBtn} onClick={downloadExample}>
              📎 Скачать пример Excel файла
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Instructions;