import { useRef } from 'react';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onFileLoad: (file: File) => void;
  fileName?: string;
  loading?: boolean;
}

const FileUploader = ({ onFileLoad, fileName, loading = false }: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileLoad(file);
    }
  };

  return (
    <div className={styles.uploader}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className={styles.input}
      />
      <button onClick={handleClick} className={styles.button} disabled={loading}>
        {loading ? '⏳ Загрузка...' : '📂 Выбрать файл'}
      </button>
      {fileName && <span className={styles.fileName}>✅ {fileName}</span>}
    </div>
  );
};

export default FileUploader;