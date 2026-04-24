import { useState } from 'react';
import styles from './Instructions.module.css';

const Instructions = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '📖 Скрыть инструкцию' : '📖 Как заполнять Excel?'}
      </button>
      
      {isOpen && (
        <div className={styles.content}>
          <h3 className={styles.title}>📋 Правила заполнения Excel файла</h3>
          
          <div className={styles.section}>
            <h4>📌 Обязательные колонки (названия должны совпадать):</h4>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Название колонки</th>
                  <th>Что писать</th>
                  <th>Пример</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Сквозная цепочка (СЦ)</td><td>Название цепочки</td><td>01. Закупка и учет ОС, НМА</td></tr>
                <tr><td>Сквозной процесс</td><td>Название процесса</td><td>Долг по амортизации</td></tr>
                <tr><td>Короткое название процесса для статуса</td><td>Краткое название</td><td>Амортизация ЦУЗ</td></tr>
                <tr><td>Что делается в ИФТ1...ИФТ5</td><td>Описание этапа</td><td>Ежемесячное начисление</td></tr>
                <tr><td>Статус ИФТ1...ИФТ5</td><td>в работе / завершено / не начато</td><td>в работе</td></tr>
                <tr><td>Старт ИФТ1...ИФТ5</td><td>Дата в формате ДД.ММ.ГГГГ</td><td>23.03.2026</td></tr>
                <tr><td>Финиш ИФТ1...ИФТ5</td><td>Дата в формате ДД.ММ.ГГГГ</td><td>15.04.2026</td></tr>
                <tr><td>Пройдено шагов ИФТ 1...5</td><td>Число</td><td>10</td></tr>
                <tr><td>Сколько шагов ИФТ1...5</td><td>Число или TBD</td><td>31 или TBD</td></tr>
                <tr><td>% прохождения ИФТ1...5</td><td>Число (0-100) или пусто</td><td>32</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <h4>⚠️ Важные правила:</h4>
            <ul className={styles.list}>
              <li><strong>Названия колонок должны точно совпадать</strong> с таблицей выше</li>
              <li>Если у этапа нет данных — оставьте колонки пустыми, этап не будет отображаться</li>
              <li>Если шагов всего нет — напишите <strong>TBD</strong></li>
              <li>Даты пишите в формате <strong>ДД.ММ.ГГГГ</strong> (например, 20.12.2026)</li>
              <li>Для проблем используйте колонку <strong>"Проблемы"</strong></li>
              <li>Проблемы в одной ячейке разделяйте <strong>переносом строки</strong> (Alt+Enter)</li>
              <li>В каждой строке проблем пишите в формате: <strong>Описание | Исполнитель | Срок</strong></li>
            </ul>
          </div>

          <div className={styles.example}>
            <h4>📝 Пример оформления проблем:</h4>
            <pre className={styles.code}>
{`Не работает вход | Анна Иванова | 17.04.2026
Ошибка валидации | Петр Сидоров | 20.04.2026
Задержка ответа | Иван Петров | 25.04.2026`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Instructions;